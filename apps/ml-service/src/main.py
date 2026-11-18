# ML Inference Service - FastAPI

import os
import json
import logging
from contextlib import asynccontextmanager
from typing import List, Optional

import numpy as np
import onnxruntime as ort
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import structlog

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer(),
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Configuration
ML_SERVICE_API_KEY = os.getenv("ML_SERVICE_API_KEY", "dev-key")
MODEL_PATH = os.getenv("MODEL_PATH", "/models")
HYPO_MODEL_NAME = os.getenv("HYPO_MODEL_NAME", "tft_hypo_predictor.onnx")
CARB_MODEL_NAME = os.getenv("CARB_MODEL_NAME", "carb_estimator.onnx")

# Global model sessions
hypo_session: Optional[ort.InferenceSession] = None
carb_session: Optional[ort.InferenceSession] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    global hypo_session, carb_session

    # Load models on startup
    logger.info("Loading ML models...")
    try:
        hypo_path = os.path.join(MODEL_PATH, HYPO_MODEL_NAME)
        if os.path.exists(hypo_path):
            hypo_session = ort.InferenceSession(hypo_path, providers=['CPUExecutionProvider'])
            logger.info("Hypoglycemia model loaded", path=hypo_path)
        else:
            logger.warning("Hypoglycemia model not found", path=hypo_path)

        carb_path = os.path.join(MODEL_PATH, CARB_MODEL_NAME)
        if os.path.exists(carb_path):
            carb_session = ort.InferenceSession(carb_path, providers=['CPUExecutionProvider'])
            logger.info("Carb estimation model loaded", path=carb_path)
        else:
            logger.warning("Carb estimation model not found", path=carb_path)

    except Exception as e:
        logger.error("Failed to load models", error=str(e))

    yield

    # Cleanup on shutdown
    logger.info("Shutting down ML service")


app = FastAPI(
    title="T1D India ML Service",
    description="ML Inference for Hypoglycemia Prediction and Carb Estimation",
    version="0.0.1",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Auth dependency
async def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != ML_SERVICE_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ============================================
# REQUEST/RESPONSE MODELS
# ============================================

class HypoPredictionInput(BaseModel):
    glucose: List[float] = Field(..., min_items=6, max_items=6)
    roc: List[float] = Field(..., min_items=6, max_items=6)
    iobRapid: List[float] = Field(..., min_items=6, max_items=6)
    iobRegular: List[float] = Field(..., min_items=6, max_items=6)
    iobNph: List[float] = Field(..., min_items=6, max_items=6)
    carbsAbsorbing: List[float] = Field(..., min_items=6, max_items=6)
    steps5min: List[float] = Field(..., min_items=6, max_items=6)
    hr: List[float] = Field(..., min_items=6, max_items=6)
    age: float
    weight: float
    diabetesDurationYears: float
    isf: float
    icr: float
    regimenType: int
    hypoUnawareness: int


class HypoPredictionOutput(BaseModel):
    horizonMin: int
    glucoseP10: int
    glucoseP50: int
    glucoseP90: int
    hypoProbability: float
    severeHypoProbability: float
    topFeatures: List[dict]
    modelVersion: str


class HypoPredictionResponse(BaseModel):
    predictions: List[HypoPredictionOutput]


class CarbEstimationInput(BaseModel):
    imageBase64: str
    mealTypeHint: Optional[str] = None


class CarbEstimationOutput(BaseModel):
    foodClass: str
    foodClassConfidence: float
    portionG: float
    carbsG: float
    carbsConfidence: float


class BolusCalculationInput(BaseModel):
    carbsG: float
    currentGlucose: int
    iobRapid: float
    iobRegular: float
    iobNph: float
    icr: float
    isf: float
    regimen: str
    recentHypo: bool
    timeSinceLastMealMin: Optional[int] = None


class BolusCalculationOutput(BaseModel):
    mealBolusU: float
    correctionBolusU: float
    totalBolusU: float
    maxAllowedU: float
    warnings: List[str]
    explanation: str
    safetyCheck: dict


# ============================================
# HEALTH CHECK
# ============================================

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "models": {
            "hypo_prediction": hypo_session is not None,
            "carb_estimation": carb_session is not None,
        },
    }


@app.get("/ready")
async def readiness_check():
    if hypo_session is None:
        raise HTTPException(status_code=503, detail="Hypo model not loaded")
    return {"status": "ready"}


# ============================================
# HYPOGLYCEMIA PREDICTION
# ============================================

@app.post("/v1/predict/hypo", response_model=HypoPredictionResponse, dependencies=[Depends(verify_api_key)])
async def predict_hypo(input_data: HypoPredictionInput):
    if hypo_session is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    try:
        # Prepare input tensor (batch_size=1, seq_len=6, features=72)
        # Features order must match training
        features = np.array([
            input_data.glucose +
            input_data.roc +
            input_data.iobRapid +
            input_data.iobRegular +
            input_data.iobNph +
            input_data.carbsAbsorbing +
            input_data.steps5min +
            input_data.hr
        ], dtype=np.float32).reshape(1, 6, 72)

        static_features = np.array([[
            input_data.age,
            input_data.weight,
            input_data.diabetesDurationYears,
            input_data.isf,
            input_data.icr,
            input_data.regimenType,
            input_data.hypoUnawareness,
            0, 0, 0, 0, 0  # padding to 12
        ]], dtype=np.float32)

        # Run inference
        inputs = {
            "time_series_input": features,
            "static_input": static_features,
        }
        outputs = hypo_session.run(None, inputs)

        # Outputs: [glucose_p10_30, glucose_p50_30, glucose_p90_30,
        #           glucose_p10_60, glucose_p50_60, glucose_p90_60,
        #           hypo_prob_30, hypo_prob_60, severe_hypo_prob_30, severe_hypo_prob_60]
        preds = outputs[0][0]  # Shape: (10,)

        # Get feature importance (simplified - in production use attention weights)
        feature_names = [
            "glucose_t", "glucose_t-1", "glucose_t-2", "glucose_t-3", "glucose_t-4", "glucose_t-5",
            "roc_t", "roc_t-1", "roc_t-2", "roc_t-3", "roc_t-4", "roc_t-5",
            "iob_rapid_t", "iob_rapid_t-1", "iob_rapid_t-2", "iob_rapid_t-3", "iob_rapid_t-4", "iob_rapid_t-5",
            "iob_regular_t", "iob_regular_t-1", "iob_regular_t-2", "iob_regular_t-3", "iob_regular_t-4", "iob_regular_t-5",
            "iob_nph_t", "iob_nph_t-1", "iob_nph_t-2", "iob_nph_t-3", "iob_nph_t-4", "iob_nph_t-5",
            "carbs_absorbing_t", "carbs_absorbing_t-1", "carbs_absorbing_t-2", "carbs_absorbing_t-3", "carbs_absorbing_t-4", "carbs_absorbing_t-5",
            "steps_t", "steps_t-1", "steps_t-2", "steps_t-3", "steps_t-4", "steps_t-5",
            "hr_t", "hr_t-1", "hr_t-2", "hr_t-3", "hr_t-3", "hr_t-5",
        ]

        # Simple feature importance based on input magnitude
        feature_importance = np.abs(features[0]).mean(axis=0)
        top_indices = np.argsort(feature_importance)[-5:][::-1]
        top_features = [
            {"feature": feature_names[i], "contribution": float(feature_importance[i])}
            for i in top_indices
        ]

        predictions = [
            HypoPredictionOutput(
                horizonMin=30,
                glucoseP10=int(preds[0]),
                glucoseP50=int(preds[1]),
                glucoseP90=int(preds[2]),
                hypoProbability=float(preds[6]),
                severeHypoProbability=float(preds[8]),
                topFeatures=top_features,
                modelVersion="tft_v1.0.0",
            ),
            HypoPredictionOutput(
                horizonMin=60,
                glucoseP10=int(preds[3]),
                glucoseP50=int(preds[4]),
                glucoseP90=int(preds[5]),
                hypoProbability=float(preds[7]),
                severeHypoProbability=float(preds[9]),
                topFeatures=top_features,
                modelVersion="tft_v1.0.0",
            ),
        ]

        logger.info("Hypo prediction completed", user_features_shape=features.shape)
        return HypoPredictionResponse(predictions=predictions)

    except Exception as e:
        logger.error("Hypo prediction failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


# ============================================
# CARB ESTIMATION
# ============================================

@app.post("/v1/predict/carbs", response_model=CarbEstimationOutput, dependencies=[Depends(verify_api_key)])
async def predict_carbs(input_data: CarbEstimationInput):
    if carb_session is None:
        raise HTTPException(status_code=503, detail="Carb model not loaded")

    try:
        # Decode base64 image
        import base64
        from io import BytesIO
        from PIL import Image

        image_data = base64.b64decode(input_data.imageBase64)
        image = Image.open(BytesIO(image_data)).convert("RGB")
        image = image.resize((300, 300))
        image_array = np.array(image, dtype=np.float32) / 255.0
        image_array = np.transpose(image_array, (2, 0, 1))  # CHW
        image_array = np.expand_dims(image_array, axis=0)  # Batch dim

        # Run inference
        inputs = {"input": image_array}
        outputs = carb_session.run(None, inputs)

        # Outputs: [class_logits, portion_g, carbs_g]
        class_logits = outputs[0][0]
        portion_g = float(outputs[1][0][0])
        carbs_g = float(outputs[2][0][0])

        # Get top class
        class_probs = np.exp(class_logits) / np.sum(np.exp(class_logits))
        top_class_idx = np.argmax(class_probs)
        top_confidence = float(class_probs[top_class_idx])

        # Map class index to food name (would come from label encoder)
        food_classes = load_food_classes()
        food_class = food_classes[top_class_idx] if top_class_idx < len(food_classes) else "unknown"

        logger.info("Carb estimation completed", food_class=food_class, carbs_g=carbs_g)
        return CarbEstimationOutput(
            foodClass=food_class,
            foodClassConfidence=top_confidence,
            portionG=max(0, portion_g),
            carbsG=max(0, carbs_g),
            carbsConfidence=top_confidence,
        )

    except Exception as e:
        logger.error("Carb estimation failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Estimation failed: {str(e)}")


# ============================================
# INSULIN BOLUS CALCULATION
# ============================================

@app.post("/v1/calculate/bolus", response_model=BolusCalculationOutput, dependencies=[Depends(verify_api_key)])
async def calculate_bolus(input_data: BolusCalculationInput):
    try:
        # Use same logic as API service
        from calculate_bolus import calculate_bolus as calc_bolus

        result = calc_bolus(
            carbsG=input_data.carbsG,
            currentGlucose=input_data.currentGlucose,
            iobRapid=input_data.iobRapid,
            iobRegular=input_data.iobRegular,
            iobNph=input_data.iobNph,
            icr=input_data.icr,
            isf=input_data.isf,
            regimen=input_data.regimen,
            recentHypo=input_data.recentHypo,
            timeSinceLastMealMin=input_data.timeSinceLastMealMin,
        )

        return BolusCalculationOutput(**result)

    except Exception as e:
        logger.error("Bolus calculation failed", error=str(e))
        raise HTTPException(status_code=500, detail=f"Calculation failed: {str(e)}")


# ============================================
# MODEL INFO
# ============================================

@app.get("/v1/models", dependencies=[Depends(verify_api_key)])
async def list_models():
    return {
        "models": [
            {
                "name": "tft_hypo_predictor",
                "version": "1.0.0",
                "type": "hypoglycemia_prediction",
                "framework": "onnx",
                "loaded": hypo_session is not None,
                "input_shape": [1, 6, 72] if hypo_session else None,
                "output_shape": [1, 10] if hypo_session else None,
            },
            {
                "name": "indian_food_carb_estimator",
                "version": "1.0.0",
                "type": "carb_estimation",
                "framework": "onnx",
                "loaded": carb_session is not None,
                "input_shape": [1, 3, 300, 300] if carb_session else None,
                "output_shape": "multi-head" if carb_session else None,
            },
        ]
    }


def load_food_classes() -> List[str]:
    """Load food class labels"""
    # In production, load from label encoder file
    return [
        "rajma_chawal", "chole_bhature", "dosa_sambar", "idli_sambar",
        "biryani_veg", "biryani_chicken", "roti_dal_sabzi", "paratha_aloo",
        "poha", "upma", "pongal", "khichdi", "thepla", "dhokla",
        "pav_bhaji", "vada_pav", "samosa", "pakora", "jalebi", "gulab_jamun",
        # ... 236 more classes
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)