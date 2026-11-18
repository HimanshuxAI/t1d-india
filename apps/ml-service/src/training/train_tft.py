"""
TFT Hypoglycemia Prediction Training Pipeline
Trains Temporal Fusion Transformer for 30/60-min hypo prediction on Indian T1D data.
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
import pytorch_lightning as pl
from pytorch_lightning.callbacks import EarlyStopping, ModelCheckpoint, LearningRateMonitor
from pytorch_lightning.loggers import MLflowLogger
import mlflow
import mlflow.pytorch
from sklearn.model_selection import GroupKFold
import optuna

# Local imports
from ..models.tft import TFTForHypoPrediction
from ..data.preprocessing import T1DDataPreprocessor
from ..data.synthetic import SyntheticDataGenerator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HypoPredictionDataset(Dataset):
    """PyTorch Dataset for hypoglycemia prediction."""

    def __init__(
        self,
        features: np.ndarray,      # (N, seq_len, n_features)
        static_features: np.ndarray,  # (N, n_static)
        targets: np.ndarray,       # (N, n_targets) - quantiles for 30/60 min
        patient_ids: np.ndarray,   # (N,) - for GroupKFold
    ):
        self.features = torch.FloatTensor(features)
        self.static_features = torch.FloatTensor(static_features)
        self.targets = torch.FloatTensor(targets)
        self.patient_ids = patient_ids

    def __len__(self):
        return len(self.features)

    def __getitem__(self, idx):
        return {
            "time_series": self.features[idx],
            "static": self.static_features[idx],
            "targets": self.targets[idx],
            "patient_id": self.patient_ids[idx],
        }


class TFTLightningModule(pl.LightningModule):
    """PyTorch Lightning wrapper for TFT model."""

    def __init__(
        self,
        input_size: int = 72,
        static_input_size: int = 12,
        output_size: int = 6,  # 3 quantiles × 2 horizons
        hidden_size: int = 256,
        lstm_layers: int = 2,
        attention_heads: int = 4,
        dropout: float = 0.1,
        learning_rate: float = 1e-3,
        quantiles: List[float] = [0.1, 0.5, 0.9],
        hidden_continuous_size: int = 64,
    ):
        super().__init__()
        self.save_hyperparameters()

        self.model = TFTForHypoPrediction(
            input_size=input_size,
            static_input_size=static_input_size,
            output_size=output_size,
            hidden_size=hidden_size,
            lstm_layers=lstm_layers,
            attention_heads=attention_heads,
            dropout=dropout,
            quantiles=quantiles,
            hidden_continuous_size=hidden_continuous_size,
        )

        self.quantiles = quantiles
        self.learning_rate = learning_rate

    def forward(self, time_series, static):
        return self.model(time_series, static)

    def training_step(self, batch, batch_idx):
        preds = self(batch["time_series"], batch["static"])
        loss = self.quantile_loss(preds, batch["targets"])
        self.log("train_loss", loss, prog_bar=True)
        return loss

    def validation_step(self, batch, batch_idx):
        preds = self(batch["time_series"], batch["static"])
        loss = self.quantile_loss(preds, batch["targets"])
        self.log("val_loss", loss, prog_bar=True)

        # Compute sensitivity/specificity at 30-min horizon
        metrics = self.compute_clinical_metrics(preds, batch["targets"])
        for k, v in metrics.items():
            self.log(f"val_{k}", v, prog_bar=True)
        return loss

    def quantile_loss(self, preds: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        """Pinball loss for quantile regression."""
        losses = []
        for i, q in enumerate(self.quantiles):
            # Targets: [glucose_p10_30, glucose_p50_30, glucose_p90_30, glucose_p10_60, glucose_p50_60, glucose_p90_60]
            # For each horizon, we have 3 quantiles
            errors = targets[:, i] - preds[:, i]
            loss = torch.max(q * errors, (q - 1) * errors)
            losses.append(loss.mean())
        return torch.stack(losses).mean()

    def compute_clinical_metrics(self, preds: torch.Tensor, targets: torch.Tensor) -> Dict[str, float]:
        """Compute sensitivity, specificity for hypo prediction."""
        with torch.no_grad():
            # 30-min horizon: indices 0,1,2 (p10, p50, p90)
            # 60-min horizon: indices 3,4,5
            p50_30 = preds[:, 1]
            p50_60 = preds[:, 4]

            # True hypo labels (we'd need these in targets - simplified here)
            # In practice, targets would include binary hypo labels
            # For now, return placeholder
            return {
                "sensitivity_30": 0.0,
                "specificity_30": 0.0,
                "sensitivity_60": 0.0,
                "specificity_60": 0.0,
            }

    def configure_optimizers(self):
        optimizer = torch.optim.AdamW(self.parameters(), lr=self.learning_rate, weight_decay=1e-4)
        scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
            optimizer, mode="min", factor=0.5, patience=5, verbose=True
        )
        return {
            "optimizer": optimizer,
            "lr_scheduler": scheduler,
            "monitor": "val_loss",
        }


def prepare_training_data(
    data_path: str,
    synthetic_ratio: float = 0.3,
    test_patient_ratio: float = 0.2,
) -> Tuple[DataLoader, DataLoader, DataLoader, np.ndarray]:
    """Prepare train/val/test dataloaders with patient-wise splits."""

    logger.info(f"Loading data from {data_path}")

    # Load real data
    real_data = pd.read_parquet(data_path)
    logger.info(f"Real data: {len(real_data)} samples from {real_data['patient_id'].nunique()} patients")

    # Generate synthetic data if needed
    if synthetic_ratio > 0:
        n_synthetic = int(len(real_data) * synthetic_ratio / (1 - synthetic_ratio))
        logger.info(f"Generating {n_synthetic} synthetic samples...")
        synthetic_gen = SyntheticDataGenerator()
        synthetic_data = synthetic_gen.generate(n_samples=n_synthetic)
        data = pd.concat([real_data, synthetic_data], ignore_index=True)
    else:
        data = real_data

    # Preprocess
    preprocessor = T1DDataPreprocessor()
    features = preprocessor.fit_transform(data)

    # Patient-wise split (no data leakage)
    patient_ids = features["patient_id"].unique()
    np.random.shuffle(patient_ids)

    n_test = int(len(patient_ids) * test_patient_ratio)
    n_val = int(len(patient_ids) * test_patient_ratio)

    test_patients = set(patient_ids[:n_test])
    val_patients = set(patient_ids[n_test:n_test + n_val])
    train_patients = set(patient_ids[n_test + n_val:])

    train_mask = features["patient_id"].isin(train_patients)
    val_mask = features["patient_id"].isin(val_patients)
    test_mask = features["patient_id"].isin(test_patients)

    train_data = features[train_mask]
    val_data = features[val_mask]
    test_data = features[test_mask]

    logger.info(f"Train: {len(train_data)} samples ({len(train_patients)} patients)")
    logger.info(f"Val: {len(val_data)} samples ({len(val_patients)} patients)")
    logger.info(f"Test: {len(test_data)} samples ({len(test_patients)} patients)")

    # Create datasets
    def create_dataset(df):
        return HypoPredictionDataset(
            features=df[FEATURE_COLS].values.reshape(-1, SEQ_LEN, N_FEATURES),
            static_features=df[STATIC_COLS].values,
            targets=df[TARGET_COLS].values,
            patient_ids=df["patient_id"].values,
        )

    train_dataset = create_dataset(train_data)
    val_dataset = create_dataset(val_data)
    test_dataset = create_dataset(test_data)

    train_loader = DataLoader(train_dataset, batch_size=64, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_dataset, batch_size=64, shuffle=False, num_workers=4)
    test_loader = DataLoader(test_dataset, batch_size=64, shuffle=False, num_workers=4)

    return train_loader, val_loader, test_loader, test_data["patient_id"].values


# Feature configuration (matches preprocessing)
SEQ_LEN = 6  # 30 min at 5-min intervals
N_FEATURES = 72  # 12 feature groups × 6 time steps
N_STATIC = 12

FEATURE_COLS = [
    # CGM (6)
    "glucose_t", "glucose_t-1", "glucose_t-2", "glucose_t-3", "glucose_t-4", "glucose_t-5",
    "roc_t", "roc_t-1", "roc_t-2", "roc_t-3", "roc_t-4", "roc_t-5",
    # Insulin IOB (18)
    "iob_rapid_t", "iob_rapid_t-1", "iob_rapid_t-2", "iob_rapid_t-3", "iob_rapid_t-4", "iob_rapid_t-5",
    "iob_regular_t", "iob_regular_t-1", "iob_regular_t-2", "iob_regular_t-3", "iob_regular_t-4", "iob_regular_t-5",
    "iob_nph_t", "iob_nph_t-1", "iob_nph_t-2", "iob_nph_t-3", "iob_nph_t-4", "iob_nph_t-5",
    # Meal absorption (6)
    "carbs_absorbing_t", "carbs_absorbing_t-1", "carbs_absorbing_t-2", "carbs_absorbing_t-3", "carbs_absorbing_t-4", "carbs_absorbing_t-5",
    # Activity (12)
    "steps_t", "steps_t-1", "steps_t-2", "steps_t-3", "steps_t-4", "steps_t-5",
    "hr_t", "hr_t-1", "hr_t-2", "hr_t-3", "hr_t-4", "hr_t-5",
]

STATIC_COLS = [
    "age", "weight", "diabetes_duration_years", "isf", "icr",
    "regimen_type", "hypo_unawareness",
    "height", "bmi", "sex_encoded", "cgm_type_encoded", "insulin_type_encoded",
]

TARGET_COLS = [
    "glucose_p10_30", "glucose_p50_30", "glucose_p90_30",
    "glucose_p10_60", "glucose_p50_60", "glucose_p90_60",
]


def train_model(
    data_path: str,
    output_dir: str,
    max_epochs: int = 100,
    use_optuna: bool = False,
    n_trials: int = 50,
) -> str:
    """Main training function."""

    os.makedirs(output_dir, exist_ok=True)

    # Prepare data
    train_loader, val_loader, test_loader, test_patient_ids = prepare_training_data(data_path)

    if use_optuna:
        # Hyperparameter optimization
        def objective(trial):
            params = {
                "hidden_size": trial.suggest_categorical("hidden_size", [128, 256, 512]),
                "lstm_layers": trial.suggest_int("lstm_layers", 1, 3),
                "attention_heads": trial.suggest_categorical("attention_heads", [2, 4, 8]),
                "dropout": trial.suggest_float("dropout", 0.05, 0.3),
                "learning_rate": trial.suggest_loguniform("learning_rate", 1e-4, 1e-2),
                "hidden_continuous_size": trial.suggest_categorical("hidden_continuous_size", [32, 64, 128]),
            }

            model = TFTLightningModule(**params)

            trainer = pl.Trainer(
                max_epochs=30,
                accelerator="auto",
                devices="auto",
                callbacks=[EarlyStopping(monitor="val_loss", patience=5)],
                logger=False,
                enable_checkpointing=False,
            )

            trainer.fit(model, train_loader, val_loader)
            return trainer.callback_metrics["val_loss"].item()

        study = optuna.create_study(direction="minimize")
        study.optimize(objective, n_trials=n_trials)

        best_params = study.best_params
        logger.info(f"Best params: {best_params}")

        with open(os.path.join(output_dir, "best_params.json"), "w") as f:
            json.dump(best_params, f)
    else:
        best_params = {
            "hidden_size": 256,
            "lstm_layers": 2,
            "attention_heads": 4,
            "dropout": 0.1,
            "learning_rate": 1e-3,
            "hidden_continuous_size": 64,
        }

    # Train final model
    model = TFTLightningModule(**best_params)

    callbacks = [
        EarlyStopping(monitor="val_loss", patience=10, mode="min"),
        ModelCheckpoint(
            dirpath=output_dir,
            filename="tft-hypo-{epoch:02d}-{val_loss:.4f}",
            monitor="val_loss",
            mode="min",
            save_top_k=3,
        ),
        LearningRateMonitor(logging_interval="epoch"),
    ]

    mlflow_logger = MLflowLogger(
        experiment_name="tft-hypo-prediction",
        tracking_uri=os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000"),
    )

    trainer = pl.Trainer(
        max_epochs=max_epochs,
        accelerator="auto",
        devices="auto",
        callbacks=callbacks,
        logger=mlflow_logger,
        precision="16-mixed",
        gradient_clip_val=1.0,
        accumulate_grad_batches=1,
    )

    logger.info("Starting training...")
    trainer.fit(model, train_loader, val_loader)

    # Test on held-out patients
    logger.info("Testing on held-out patients...")
    test_results = trainer.test(model, test_loader)
    logger.info(f"Test results: {test_results}")

    # Export best model to ONNX
    best_model_path = trainer.checkpoint_callback.best_model_path
    logger.info(f"Best model: {best_model_path}")

    onnx_path = export_to_onnx(best_model_path, output_dir)

    # Save test patient IDs for evaluation
    np.save(os.path.join(output_dir, "test_patient_ids.npy"), test_patient_ids)

    return onnx_path


def export_to_onnx(checkpoint_path: str, output_dir: str) -> str:
    """Export trained model to ONNX format."""

    logger.info("Exporting to ONNX...")

    # Load model
    model = TFTLightningModule.load_from_checkpoint(checkpoint_path)
    model.eval()

    # Create dummy input
    dummy_time_series = torch.randn(1, SEQ_LEN, N_FEATURES)
    dummy_static = torch.randn(1, N_STATIC)

    # Export
    onnx_path = os.path.join(output_dir, "tft_hypo_predictor.onnx")

    torch.onnx.export(
        model.model,
        (dummy_time_series, dummy_static),
        onnx_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=["time_series_input", "static_input"],
        output_names=["quantile_predictions"],
        dynamic_axes={
            "time_series_input": {0: "batch_size"},
            "static_input": {0: "batch_size"},
            "quantile_predictions": {0: "batch_size"},
        },
    )

    # Verify ONNX model
    import onnx
    onnx_model = onnx.load(onnx_path)
    onnx.checker.check_model(onnx_model)
    logger.info(f"ONNX model verified and saved to {onnx_path}")

    return onnx_path


def evaluate_model(
    onnx_path: str,
    test_data_path: str,
    test_patient_ids: np.ndarray,
) -> Dict[str, float]:
    """Evaluate ONNX model on test set with clinical metrics."""

    import onnxruntime as ort

    # Load test data
    test_data = pd.read_parquet(test_data_path)
    test_data = test_data[test_data["patient_id"].isin(test_patient_ids)]

    preprocessor = T1DDataPreprocessor()
    features = preprocessor.transform(test_data)

    # Create ONNX session
    session = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])

    # Prepare inputs
    time_series = features[FEATURE_COLS].values.reshape(-1, SEQ_LEN, N_FEATURES).astype(np.float32)
    static = features[STATIC_COLS].values.astype(np.float32)
    targets = features[TARGET_COLS].values

    # Run inference
    inputs = {"time_series_input": time_series, "static_input": static}
    outputs = session.run(None, inputs)[0]  # (N, 6)

    # Compute metrics
    metrics = {}

    # For each horizon
    for horizon_idx, horizon in enumerate([30, 60]):
        base_idx = horizon_idx * 3
        p10 = outputs[:, base_idx]
        p50 = outputs[:, base_idx + 1]
        p90 = outputs[:, base_idx + 2]

        true_glucose = targets[:, base_idx + 1]  # p50 is median

        # Hypo prediction (p10 < 70)
        hypo_pred = (p10 < 70).astype(int)
        hypo_true = (true_glucose < 70).astype(int)

        # Sensitivity / Specificity
        tp = ((hypo_pred == 1) & (hypo_true == 1)).sum()
        fn = ((hypo_pred == 0) & (hypo_true == 1)).sum()
        fp = ((hypo_pred == 1) & (hypo_true == 0)).sum()
        tn = ((hypo_pred == 0) & (hypo_true == 0)).sum()

        sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
        specificity = tn / (tn + fp) if (tn + fp) > 0 else 0

        # MAE
        mae = np.mean(np.abs(p50 - true_glucose))

        # Coverage (should be ~80% for p10-p90)
        coverage = ((true_glucose >= p10) & (true_glucose <= p90)).mean()

        metrics[f"sensitivity_{horizon}min"] = sensitivity
        metrics[f"specificity_{horizon}min"] = specificity
        metrics[f"mae_{horizon}min"] = mae
        metrics[f"coverage_{horizon}min"] = coverage

        logger.info(f"{horizon}min - Sensitivity: {sensitivity:.3f}, Specificity: {specificity:.3f}, MAE: {mae:.1f}, Coverage: {coverage:.3f}")

    # Overall
    logger.info(f"Final metrics: {json.dumps(metrics, indent=2)}")

    # Save metrics
    with open(os.path.join(os.path.dirname(onnx_path), "eval_metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)

    return metrics


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Train TFT for hypoglycemia prediction")
    parser.add_argument("--data-path", type=str, required=True, help="Path to training data (parquet)")
    parser.add_argument("--output-dir", type=str, required=True, help="Output directory for models")
    parser.add_argument("--max-epochs", type=int, default=100)
    parser.add_argument("--use-optuna", action="store_true", help="Run hyperparameter optimization")
    parser.add_argument("--n-trials", type=int, default=50)
    parser.add_argument("--eval-only", type=str, help="Path to ONNX model for evaluation only")
    parser.add_argument("--test-data", type=str, help="Path to test data for evaluation")
    parser.add_argument("--test-patients", type=str, help="Path to test patient IDs (.npy)")

    args = parser.parse_args()

    if args.eval_only:
        test_patient_ids = np.load(args.test_patients)
        evaluate_model(args.eval_only, args.test_data, test_patient_ids)
    else:
        onnx_path = train_model(
            data_path=args.data_path,
            output_dir=args.output_dir,
            max_epochs=args.max_epochs,
            use_optuna=args.use_optuna,
            n_trials=args.n_trials,
        )
        logger.info(f"Training complete. Model saved to {onnx_path}")