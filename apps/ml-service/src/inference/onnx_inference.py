"""
ONNX Runtime Inference Service for T1D Models
High-performance inference with batching, caching, and monitoring.
"""

import os
import json
import logging
import time
import asyncio
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
import numpy as np
import onnxruntime as ort
from functools import lru_cache
import hashlib
import json

logger = logging.getLogger(__name__)

@dataclass
class InferenceConfig:
    model_path: str
    providers: List[str] = None
    batch_size: int = 32
    max_queue_size: int = 1000
    cache_size: int = 10000
    num_threads: int = 4
    
    def __post_init__(self):
        if self.providers is None:
            self.providers = ['CPUExecutionProvider']

class ModelCache:
    """LRU cache for inference results with TTL."""
    
    def __init__(self, max_size: int = 10000, ttl_seconds: int = 300):
        self.max_size = max_size
        self.ttl = ttl_seconds
        self.cache: Dict[str, Tuple[Any, float]] = {}
        self.access_times: Dict[str, float] = {}
    
    def _make_key(self, *args, **kwargs) -> str:
        key_data = json.dumps([args, kwargs], sort_keys=True, default=str)
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        if key not in self.cache:
            return None
        value, timestamp = self.cache[key]
        if time.time() - timestamp > self.ttl:
            del self.cache[key]
            del self.access_times[key]
            return None
        self.access_times[key] = time.time()
        return value
    
    def set(self, key: str, value: Any):
        if len(self.cache) >= self.max_size:
            # Evict oldest
            oldest = min(self.access_times.items(), key=lambda x: x[1])[0]
            del self.cache[oldest]
            del self.access_times[oldest]
        self.cache[key] = (value, time.time())
        self.access_times[key] = time.time()
    
    def clear(self):
        self.cache.clear()
        self.access_times.clear()


class BatchProcessor:
    """Batches incoming requests for efficient batch inference."""
    
    def __init__(self, inference_fn, batch_size: int = 32, max_wait_ms: int = 10):
        self.inference_fn = inference_fn
        self.batch_size = batch_size
        self.max_wait_ms = max_wait_ms
        self.queue: asyncio.Queue = asyncio.Queue()
        self.running = False
        self.task = None
    
    async def start(self):
        self.running = True
        self.task = asyncio.create_task(self._process_loop())
    
    async def stop(self):
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
    
    async def process(self, *args, **kwargs) -> Any:
        future = asyncio.get_event_loop().create_future()
        await self.queue.put((args, kwargs, future))
        return await future
    
    async def _process_loop(self):
        while self.running:
            batch = []
            futures = []
            
            # Collect batch
            try:
                # Wait for first item
                args, kwargs, future = await asyncio.wait_for(
                    self.queue.get(), timeout=self.max_wait_ms / 1000
                )
                batch.append((args, kwargs))
                futures.append(future)
                
                # Collect more up to batch_size
                while len(batch) < self.inference_fn.batch_size:
                    try:
                        args, kwargs, future = await asyncio.wait_for(
                            self.queue.get(), timeout=self.max_wait_ms / 1000
                        )
                        batch.append((args, kwargs))
                        futures.append(future)
                    except asyncio.TimeoutError:
                        break
            except asyncio.TimeoutError:
                continue
            
            if not batch:
                continue
            
            # Process batch
            try:
                results = await self.inference_fn.process_batch(batch)
                for future, result in zip(futures, results):
                    future.set_result(result)
            except Exception as e:
                for future in futures:
                    future.set_exception(e)


class ONNXInferenceEngine:
    """High-performance ONNX Runtime inference engine with batching and caching."""
    
    def __init__(self, config: InferenceConfig):
        self.config = config
        self.session: Optional[ort.InferenceSession] = None
        self.input_names: List[str] = []
        self.output_names: List[str] = []
        self.cache = ModelCache(config.cache_size)
        self.executor = ThreadPoolExecutor(max_workers=config.num_threads)
        self._load_model()
    
    def _load_model(self):
        """Load ONNX model and configure session."""
        sess_options = ort.SessionOptions()
        sess_options.intra_op_num_threads = self.config.num_threads
        sess_options.inter_op_num_threads = self.config.num_threads
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        sess_options.enable_cpu_mem_arena = True
        sess_options.enable_mem_pattern = True
        
        self.session = ort.InferenceSession(
            self.config.model_path,
            sess_options,
            providers=self.config.providers
        )
        
        self.input_names = [inp.name for inp in self.session.get_inputs()]
        self.output_names = [out.name for out in self.session.get_outputs()]
        
        logger.info(f"Loaded model: {self.config.model_path}")
        logger.info(f"Inputs: {self.input_names}")
        logger.info(f"Outputs: {self.output_names}")
    
    def predict(self, *inputs: np.ndarray) -> List[np.ndarray]:
        """Single inference with caching."""
        # Create cache key
        cache_key = self._make_cache_key(inputs)
        cached = self.cache.get(cache_key)
        if cached is not None:
            return cached
        
        # Prepare inputs
        input_dict = dict(zip(self.input_names, inputs))
        
        # Run inference
        outputs = self.session.run(self.output_names, input_dict)
        
        # Cache result
        self.cache.set(cache_key, outputs)
        
        return outputs
    
    def predict_batch(self, batch_inputs: List[List[np.ndarray]]) -> List[List[np.ndarray]]:
        """Batch inference for multiple samples."""
        # Stack inputs
        stacked_inputs = []
        for i in range(len(self.input_names)):
            stacked = np.stack([inp[i] for inp in batch_inputs], axis=0)
            stacked_inputs.append(stacked)
        
        input_dict = dict(zip(self.input_names, stacked_inputs))
        outputs = self.session.run(self.output_names, input_dict)
        
        # Unstack outputs
        batch_size = len(batch_inputs)
        results = []
        for i in range(batch_size):
            sample_outputs = [out[i] for out in outputs]
            results.append(sample_outputs)
        
        return results
    
    async def predict_async(self, *inputs: np.ndarray) -> List[np.ndarray]:
        """Async inference using thread pool."""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(self.executor, self.predict, *inputs)
    
    def _make_cache_key(self, inputs: List[np.ndarray]) -> str:
        hasher = hashlib.md5()
        for inp in inputs:
            hasher.update(inp.tobytes())
        return hasher.hexdigest()


class HypoPredictionEngine(ONNXInferenceEngine):
    """Specialized engine for hypoglycemia prediction."""
    
    FEATURE_NAMES = [
        'glucose_t', 'glucose_t-1', 'glucose_t-2', 'glucose_t-3', 'glucose_t-4', 'glucose_t-5',
        'roc_t', 'roc_t-1', 'roc_t-2', 'roc_t-3', 'roc_t-4', 'roc_t-5',
        'iob_rapid_t', 'iob_rapid_t-1', 'iob_rapid_t-2', 'iob_rapid_t-3', 'iob_rapid_t-4', 'iob_rapid_t-5',
        'iob_regular_t', 'iob_regular_t-1', 'iob_regular_t-2', 'iob_regular_t-3', 'iob_regular_t-4', 'iob_regular_t-5',
        'iob_nph_t', 'iob_nph_t-1', 'iob_nph_t-2', 'iob_nph_t-3', 'iob_nph_t-4', 'iob_nph_t-5',
        'carbs_absorbing_t', 'carbs_absorbing_t-1', 'carbs_absorbing_t-2', 'carbs_absorbing_t-3', 'carbs_absorbing_t-4', 'carbs_absorbing_t-5',
        'steps_t', 'steps_t-1', 'steps_t-2', 'steps_t-3', 'steps_t-4', 'steps_t-5',
        'hr_t', 'hr_t-1', 'hr_t-2', 'hr_t-3', 'hr_t-3', 'hr_t-5',
    ]
    
    STATIC_FEATURES = [
        'age', 'weight', 'diabetes_duration_years', 'isf', 'icr',
        'regimen_type', 'hypo_unawareness', 'sex', 'cgm_type', 'insulin_type',
        'height', 'bmi'
    ]
    
    def __init__(self, model_path: str, config: InferenceConfig = None):
        if config is None:
            config = InferenceConfig(model_path=model_path)
        super().__init__(config)
    
    def prepare_input(self, 
                      glucose_history: np.ndarray,      # (6,) - last 6 CGM readings
                      roc_history: np.ndarray,          # (6,) - rate of change
                      iob_rapid: np.ndarray,            # (6,) - rapid insulin IOB
                      iob_regular: np.ndarray,          # (6,) - regular insulin IOB
                      iob_nph: np.ndarray,              # (6,) - NPH insulin IOB
                      carbs_absorbing: np.ndarray,      # (6,) - carb absorption
                      steps: np.ndarray,                # (6,) - steps per 5-min
                      heart_rate: np.ndarray,           # (6,) - heart rate
                      static_features: Dict[str, float] # static patient features
                      ) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Prepare model inputs from raw features.
        Returns: (static_categorical, static_real, time_varying_known, time_varying_unknown)
        """
        seq_len = 6
        
        # Time-varying unknown (CGM + derivatives)
        tv_unknown = np.stack([
            glucose_history,
            roc_history,
            np.gradient(roc_history),  # acceleration
            np.zeros_like(glucose_history),  # placeholder for meal type
        ], axis=1)  # (6, 4)
        
        # Time-varying known (insulin + carbs + activity)
        tv_known = np.stack([
            iob_rapid, iob_regular, iob_nph, np.zeros_like(iob_rapid),  # insulin IOB
            carbs_absorbing, np.zeros_like(carbs_absorbing),  # carbs (rapid, intermediate, slow)
            steps, heart_rate,
        ], axis=1)  # (6, 8)
        
        # Pad to full sequence length if needed
        if len(glucose_history) < 6:
            pad_len = 6 - len(glucose_history)
            tv_unknown = np.pad(tv_unknown, ((pad_len, 0), (0, 0)), mode='edge')
            tv_known = np.pad(tv_known, ((pad_len, 0), (0, 0)), mode='edge')
        
        # Add future known (for decoder)
        future_known = np.zeros((max(0, 12), tv_known.shape[1]))  # 60 min future
        tv_known = np.vstack([tv_known, future_known])
        
        # Static features
        static_cat = np.array([
            int(static_features.get('regimen_type', 0)),
            int(static_features.get('sex', 0)),
            int(static_features.get('cgm_type', 0)),
            int(static_features.get('insulin_type', 0)),
        ], dtype=np.int64)
        
        static_real = np.array([
            static_features.get('age', 30),
            static_features.get('weight', 70),
            static_features.get('diabetes_duration_years', 5),
            static_features.get('isf', 50),
            static_features.get('icr', 10),
            static_features.get('target_glucose', 110),
            static_features.get('hypo_unawareness', 0),
            static_features.get('height', 170),
            static_features.get('bmi', 24),
            static_features.get('basal_rate', 0),
            static_features.get('nph_morning', 0),
            static_features.get('nph_evening', 0),
        ], dtype=np.float32)
        
        # Add batch dimension
        static_categorical = static_cat.reshape(1, -1)
        static_real = static_real.reshape(1, -1)
        time_varying_known = tv_known.reshape(1, tv_known.shape[0], -1)
        time_varying_unknown = tv_unknown.reshape(1, tv_unknown.shape[0], -1)
        
        return static_categorical, static_real, time_varying_known, time_varying_unknown
    
    def predict(self, *args, **kwargs) -> Dict:
        """
        Run prediction and return structured results.
        Returns dict with glucose predictions, hypo probabilities, and explanations.
        """
        inputs = self.prepare_input(*args, **kwargs)
        outputs = super().predict(*inputs)
        
        # Parse outputs
        preds = outputs[0][0]  # (num_targets,)
        
        # Parse predictions for each horizon
        num_horizons = 2
        num_quantiles = 3
        results = {}
        
        for h_idx, horizon in enumerate([30, 60]):
            base = h_idx * 3 * 3  # 3 targets (glucose p10/p50/p90) * 3 quantiles
            glucose_preds = preds[base:base+9].reshape(3, 3)  # 3 quantiles x 3
            hypo_idx = 18 + h_idx * 2
            severe_idx = 18 + num_horizons + h_idx
            
            results[f'horizon_{horizon}min'] = {
                'glucose_p10': float(glucose_preds[0, 0]),
                'glucose_p50': float(glucose_preds[1, 0]),
                'glucose_p90': float(glucose_preds[2, 0]),
                'hypo_probability': float(1 / (1 + np.exp(-preds[hypo_idx]))),  # sigmoid
                'severe_hypo_probability': float(1 / (1 + np.exp(-preds[severe_idx]))),
            }
        
        # Add feature importance
        if hasattr(self.session, 'feature_importance'):
            results['feature_importance'] = self._get_top_features()
        
        return results
    
    def _get_top_features(self, top_k: int = 5) -> List[Dict]:
        """Extract top contributing features."""
        # This would use attention weights from the model
        # For now, return mock
        return [
            {"feature": "iob_rapid_t", "contribution": 0.35},
            {"feature": "glucose_t", "contribution": 0.28},
            {"feature": "carbs_absorbing_t", "contribution": 0.18},
            {"feature": "iob_nph_t", "contribution": 0.12},
            {"feature": "roc_t", "contribution": 0.07},
        ]


class CarbEstimationEngine(ONNXInferenceEngine):
    """Specialized engine for food carb estimation from images."""
    
    FOOD_CLASSES = [
        "rajma_chawal", "chole_bhature", "dosa_sambar", "idli_sambar",
        "biryani_veg", "biryani_chicken", "roti_dal_sabzi", "paratha_aloo",
        "poha", "upma", "pongal", "khichdi", "thepla", "dhokla",
        "pav_bhaji", "vada_pav", "samosa", "pakora", "jalebi", "gulab_jamun",
        # ... 236 more classes
    ]
    
    def __init__(self, model_path: str, config: InferenceConfig = None):
        if config is None:
            config = InferenceConfig(model_path=model_path)
        super().__init__(config)
    
    def preprocess_image(self, image_bytes: bytes) -> np.ndarray:
        """Preprocess image for model input."""
        from PIL import Image
        import io
        
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image = image.resize((300, 300))
        image_array = np.array(image, dtype=np.float32) / 255.0
        image_array = np.transpose(image_array, (2, 0, 1))  # CHW
        image_array = np.expand_dims(image_array, axis=0)  # Batch dim
        return image_array
    
    def predict(self, image_bytes: bytes) -> Dict:
        """Predict carbs from food image."""
        image_array = self.preprocess_image(image_bytes)
        outputs = self.predict(image_array)
        
        class_logits = outputs[0][0]
        portion_g = float(outputs[1][0][0])
        carbs_g = float(outputs[2][0][0])
        
        class_probs = np.exp(class_logits) / np.sum(np.exp(class_logits))
        top_class_idx = np.argmax(class_probs)
        top_confidence = float(class_probs[top_class_idx])
        
        food_class = self.FOOD_CLASSES[top_class_idx] if top_class_idx < len(self.FOOD_CLASSES) else "unknown"
        
        return {
            "foodClass": food_class,
            "foodClassConfidence": top_confidence,
            "portionG": max(0, portion_g),
            "carbsG": max(0, carbs_g),
            "carbsConfidence": top_confidence,
        }


class BolusCalculatorEngine:
    """Insulin bolus calculator with Indian regimen support."""
    
    INSULIN_SAFETY = {
        "MAX_BOLUS_U": 15.0,
        "MAX_CORRECTION_U": 5.0,
        "MIN_GLUCOSE_FOR_CORRECTION": 90,
        "TARGET_GLUCOSE": 110,
        "MIN_PREDICTED_GLUCOSE": 70,
        "IOB_HIGH_THRESHOLD_U": 3.0,
        "RECENT_HYPO_WINDOW_MIN": 120,
        "MAX_IOB_ADJUSTMENT_FACTOR": 0.5,
    }
    
    INSULIN_PK = {
        "rapid": {"ka": 0.018, "ke": 0.012},
        "regular": {"ka": 0.008, "ke": 0.006},
        "nph": {"ka": 0.003, "ke": 0.002},
    }
    
    def calculate_iob(self, dose: float, minutes_ago: float, insulin_type: str) -> float:
        """Calculate insulin on board using two-compartment model."""
        if minutes_ago < 0:
            return 0.0
        
        params = self.INSULIN_PK.get(insulin_type, self.INSULIN_PK["rapid"])
        ka, ke = params["ka"], params["ke"]
        t = minutes_ago
        
        if abs(ka - ke) < 1e-6:
            return dose * (1 - np.exp(-ka * t)) * np.exp(-ke * t)
        
        iob = dose * (ka / (ka - ke)) * (np.exp(-ke * t) - np.exp(-ka * t))
        return max(0, iob)
    
    def calculate_bolus(self, 
                        carbs_g: float,
                        current_glucose: int,
                        iob_rapid: float,
                        iob_regular: float,
                        iob_nph: float,
                        icr: float,
                        isf: float,
                        regimen: str,
                        recent_hypo: bool = False,
                        time_since_last_meal_min: Optional[int] = None) -> Dict:
        """Calculate insulin bolus with safety checks."""
        warnings = []
        
        # 1. Meal bolus
        meal_bolus = carbs_g / icr if icr > 0 and carbs_g > 0 else 0
        
        # 2. Correction bolus
        correction_bolus = 0
        if (current_glucose > 110 and not recent_hypo and 
            current_glucose >= self.INSULIN_SAFETY["MIN_GLUCOSE_FOR_CORRECTION"]):
            correction_bolus = min(
                (current_glucose - 110) / isf,
                self.INSULIN_SAFETY["MAX_CORRECTION_U"]
            )
        
        # 3. IOB adjustment
        total_iob = iob_rapid + iob_regular * 0.5 + iob_nph * 0.3
        iob_adjustment = 0
        if total_iob > self.INSULIN_SAFETY["IOB_HIGH_THRESHOLD_U"]:
            warnings.append(f"High IOB ({total_iob:.1f}U) - consider reducing bolus")
            iob_adjustment = max(0, (total_iob - 3.0) * 0.5)
        
        # 4. Regimen-specific adjustments
        regimen_adjustment = 0
        if regimen == "NPH_REGULAR" and time_since_last_meal_min and 240 <= time_since_last_meal_min <= 480:
            warnings.append("Morning NPH may be peaking - consider 20% bolus reduction")
            regimen_adjustment = -0.2 * (iob_rapid + iob_regular)
        elif regimen == "PREMIXED_30_70" and time_since_last_meal_min and 180 <= time_since_last_meal_min <= 360:
            warnings.append("Premixed NPH component active - reduced correction recommended")
            regimen_adjustment = -0.15 * iob_nph
        
        # 5. Total bolus
        total_bolus = meal_bolus + correction_bolus - iob_adjustment + regimen_adjustment
        total_bolus = max(0, total_bolus)
        
        # 6. Safety cap
        max_allowed = self.INSULIN_SAFETY["MAX_BOLUS_U"]
        if total_bolus > max_allowed:
            warnings.append(f"Calculated bolus ({total_bolus:.1f}U) exceeds max ({max_allowed}U)")
            total_bolus = max_allowed
        
        # 7. Predicted glucose floor check
        predicted_drop = total_bolus * isf
        predicted_min = current_glucose - predicted_drop
        if predicted_min < 70:
            warnings.append(f"Predicted glucose may drop to {round(predicted_min)} mg/dL")
            safe_bolus = (current_glucose - 80) / isf
            total_bolus = min(total_bolus, max(0, safe_bolus))
        
        if recent_hypo:
            warnings.append("Recent hypoglycemia detected - consider reducing bolus by 25-50%")
        
        # Explanation
        explanation = f"Meal: {meal_bolus:.1f}U ({carbs_g}g/{icr}g/U)"
        if correction_bolus > 0:
            explanation += f"; Correction: {correction_bolus:.1f}U"
        if iob_adjustment > 0:
            explanation += f"; IOB adj: -{iob_adjustment:.1f}U"
        if regimen_adjustment != 0:
            explanation += f"; Regimen: {regimen_adjustment:+.1f}U"
        
        return {
            "mealBolusU": round(meal_bolus, 1),
            "correctionBolusU": round(correction_bolus, 1),
            "totalBolusU": round(total_bolus, 1),
            "maxAllowedU": self.INSULIN_SAFETY["MAX_BOLUS_U"],
            "warnings": warnings,
            "explanation": explanation,
            "safetyCheck": {
                "predictedMinGlucose": round(predicted_min),
                "iobTotalU": round(total_iob, 1),
            },
        }


# ============================================
# FASTAPI APPLICATION
# ============================================

from fastapi import FastAPI, HTTPException, Depends, Header, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional
import uvicorn

app = FastAPI(title="T1D India ML Inference Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global engines
hypo_engine: Optional[HypoPredictionEngine] = None
carb_engine: Optional[CarbEstimationEngine] = None
bolus_engine: Optional[BolusCalculatorEngine] = None

ML_SERVICE_API_KEY = os.getenv("ML_SERVICE_API_KEY", "dev-key")

async def verify_api_key(x_api_key: str = Header(None)):
    if x_api_key != ML_SERVICE_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")

# Request/Response models
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

@app.on_event("startup")
async def startup():
    global hypo_engine, carb_engine, bolus_engine
    
    model_path = os.getenv("MODEL_PATH", "/models")
    hypo_model = os.getenv("HYPO_MODEL_NAME", "tft_hypo_predictor.onnx")
    carb_model = os.getenv("CARB_MODEL_NAME", "carb_estimator.onnx")
    
    config = InferenceConfig(
        model_path=os.path.join(model_path, hypo_model),
        providers=['CPUExecutionProvider'],
        batch_size=32,
    )
    
    try:
        hypo_engine = HypoPredictionEngine(config.model_path, config)
        logger.info("Hypo engine loaded")
    except Exception as e:
        logger.warning(f"Hypo engine not loaded: {e}")
    
    try:
        carb_config = InferenceConfig(
            model_path=os.path.join(model_path, carb_model),
            providers=['CPUExecutionProvider'],
        )
        carb_engine = CarbEstimationEngine(carb_config.model_path, carb_config)
        logger.info("Carb engine loaded")
    except Exception as e:
        logger.warning(f"Carb engine not loaded: {e}")
    
    bolus_engine = BolusCalculatorEngine()
    logger.info("Bolus engine loaded")

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "models": {
            "hypo_prediction": hypo_engine is not None,
            "carb_estimation": carb_engine is not None,
            "bolus_calculator": True,
        },
    }

@app.get("/ready")
async def readiness_check():
    if hypo_engine is None:
        raise HTTPException(status_code=503, detail="Hypo model not loaded")
    return {"status": "ready"}

@app.post("/v1/predict/hypo", response_model=HypoPredictionResponse, dependencies=[Depends(verify_api_key)])
async def predict_hypo(input_data: HypoPredictionInput):
    if hypo_engine is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        static_features = {
            'age': input_data.age,
            'weight': input_data.weight,
            'diabetes_duration_years': input_data.diabetesDurationYears,
            'isf': input_data.isf,
            'icr': input_data.icr,
            'regimen_type': input_data.regimenType,
            'hypo_unawareness': input_data.hypoUnawareness,
            'sex': 0,  # default
            'cgm_type': 0,
            'insulin_type': 0,
            'height': 170,
            'bmi': 24,
        }
        
        result = hypo_engine.predict(
            glucose_history=np.array(input_data.glucose),
            roc_history=np.array(input_data.roc),
            iob_rapid=np.array(input_data.iobRapid),
            iob_regular=np.array(input_data.iobRegular),
            iob_nph=np.array(input_data.iobNph),
            carbs_absorbing=np.array(input_data.carbsAbsorbing),
            steps=np.array(input_data.steps5min),
            heart_rate=np.array(input_data.hr),
            static_features=static_features,
        )
        
        predictions = []
        for horizon, pred in result.items():
            if isinstance(pred, dict) and 'glucose_p50' in pred:
                predictions.append(HypoPredictionOutput(
                    horizonMin=int(horizon.replace('horizon_', '').replace('min', '')),
                    glucoseP10=pred['glucose_p10'],
                    glucoseP50=pred['glucose_p50'],
                    glucoseP90=pred['glucose_p90'],
                    hypoProbability=pred['hypo_probability'],
                    severeHypoProbability=pred['severe_hypo_probability'],
                    topFeatures=pred.get('feature_importance', []),
                    modelVersion="tft_v1.0.0",
                ))
        
        return HypoPredictionResponse(predictions=predictions)
    
    except Exception as e:
        logger.error(f"Hypo prediction failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/predict/carbs", response_model=CarbEstimationOutput, dependencies=[Depends(verify_api_key)])
async def predict_carbs(input_data: CarbEstimationInput):
    if carb_engine is None:
        raise HTTPException(status_code=503, detail="Carb model not loaded")
    
    try:
        import base64
        image_data = base64.b64decode(input_data.imageBase64)
        result = carb_engine.predict(image_data)
        return CarbEstimationOutput(**result)
    except Exception as e:
        logger.error(f"Carb estimation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/calculate/bolus", response_model=BolusCalculationOutput, dependencies=[Depends(verify_api_key)])
async def calculate_bolus(input_data: BolusCalculationInput):
    try:
        result = bolus_engine.calculate_bolus(
            carbs_g=input_data.carbsG,
            current_glucose=input_data.currentGlucose,
            iob_rapid=input_data.iobRapid,
            iob_regular=input_data.iobRegular,
            iob_nph=input_data.iobNph,
            icr=input_data.icr,
            isf=input_data.isf,
            regimen=input_data.regimen,
            recent_hypo=input_data.recentHypo,
            time_since_last_meal_min=input_data.timeSinceLastMealMin,
        )
        return BolusCalculationOutput(**result)
    except Exception as e:
        logger.error(f"Bolus calculation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/v1/models")
async def list_models():
    return {
        "models": [
            {
                "name": "tft_hypo_predictor",
                "version": "1.0.0",
                "type": "hypoglycemia_prediction",
                "framework": "onnx",
                "loaded": hypo_engine is not None,
            },
            {
                "name": "indian_food_carb_estimator",
                "version": "1.0.0",
                "type": "carb_estimation",
                "framework": "onnx",
                "loaded": carb_engine is not None,
            },
            {
                "name": "indian_bolus_calculator",
                "version": "1.0.0",
                "type": "insulin_dosing",
                "framework": "python",
                "loaded": True,
            },
        ]
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)