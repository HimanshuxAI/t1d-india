#!/usr/bin/env python3
"""
Complete Training Pipeline for TFT Hypoglycemia Prediction
Runs the full MLflow experiment with hyperparameter tuning.
"""

import os
import sys
import argparse
import logging
import mlflow
import mlflow.pytorch
import yaml
import torch
import torch.nn as nn
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from apps.ml_service.src.training.train_tft import (
    TFTConfig, TFTForHypoPrediction, TFTTrainer, T1DDataset,
    export_to_onnx, QuantileLoss, CombinedLoss
)
from apps.ml_service.src.training.prepare_training_data import TrainingDataPreparator
from torch.utils.data import DataLoader
import torch.optim as optim

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_config(config_path: str) -> dict:
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)

def run_hyperparameter_optimization(config: dict, train_loader: DataLoader, val_loader: DataLoader, 
                                     device: str, n_trials: int = 20) -> dict:
    """Run Optuna hyperparameter optimization."""
    import optuna
    
    def objective(trial):
        # Suggest hyperparameters
        params = {
            'hidden_size': trial.suggest_categorical('hidden_size', [128, 256, 512]),
            'lstm_layers': trial.suggest_int('lstm_layers', 1, 3),
            'attention_heads': trial.suggest_categorical('attention_heads', [2, 4, 8]),
            'dropout': trial.suggest_float('dropout', 0.05, 0.3),
            'learning_rate': trial.suggest_loguniform('learning_rate', 1e-4, 1e-2),
            'hidden_continuous_size': trial.suggest_categorical('hidden_continuous_size', [32, 64, 128]),
        }
        
        # Create model with trial params
        config = TFTConfig(**params)
        model = TFTForHypoPrediction(config).to(device)
        
        trainer = TFTTrainer(config, model, device)
        
        # Quick training for optimization
        trainer.train_epoch(train_loader)
        val_metrics = trainer.validate(val_loader)
        
        return val_metrics['val_loss']
    
    study = optuna.create_study(direction='minimize')
    study.optimize(objective, n_trials=n_trials, timeout=3600)  # 1 hour max
    
    logger.info(f"Best params: {study.best_params}")
    logger.info(f"Best value: {study.best_value}")
    
    return study.best_params

def main():
    parser = argparse.ArgumentParser(description="Run TFT training pipeline")
    parser.add_argument('--config', type=str, default='apps/ml-service/src/training/mlflow_config.yaml')
    parser.add_argument('--data-dir', type=str, default='/Users/himanshu/Documents/PBL/synthetic_data')
    parser.add_argument('--output-dir', type=str, default='/Users/himanshu/Documents/PBL/models')
    parser.add_argument('--epochs', type=int, default=100)
    parser.add_argument('--batch-size', type=int, default=64)
    parser.add_argument('--lr', type=float, default=1e-3)
    parser.add_argument('--device', type=str, default='cuda')
    parser.add_argument('--optimize', action='store_true', help='Run hyperparameter optimization')
    parser.add_argument('--n-trials', type=int, default=20)
    parser.add_argument('--mlflow-uri', type=str, default='http://localhost:5000')
    args = parser.parse_args()
    
    # Load config
    config_dict = load_config(args.config)
    
    # Setup MLflow
    mlflow.set_tracking_uri(args.mlflow_uri)
    mlflow.set_experiment(config_dict['experiment']['name'])
    
    # Prepare data
    logger.info("Preparing training data...")
    preparator = TrainingDataPreparator(args.data_dir)
    train_loader, val_loader, test_loader = preparator.prepare_all_patients(
        args.data_dir, 
        f"{args.output_dir}/training_features.parquet"
    )
    
    # Base config
    config = TFTConfig()
    config.max_epochs = args.epochs
    config.batch_size = args.batch_size
    config.learning_rate = args.lr
    
    # Hyperparameter optimization
    if args.optimize:
        logger.info("Running hyperparameter optimization...")
        best_params = run_hyperparameter_optimization(
            config_dict, train_loader, val_loader, args.device, args.n_trials
        )
        # Update config with best params
        for k, v in best_params.items():
            setattr(config, k, v)
    
    # Final training
    logger.info("Starting final training...")
    model = TFTForHypoPrediction(config).to(args.device)
    
    with mlflow.start_run(run_name=f"tft-final-{config.hidden_size}-{config.lstm_layers}layers"):
        mlflow.log_params({
            'hidden_size': config.hidden_size,
            'lstm_layers': config.lstm_layers,
            'attention_heads': config.attention_heads,
            'dropout': config.dropout,
            'learning_rate': config.learning_rate,
            'batch_size': config.batch_size,
            'seq_len': config.sequence_length,
        })
        
        trainer = TFTTrainer(config, model, args.device)
        best_model = trainer.fit(train_loader, val_loader)
        
        # Evaluate on test set
        test_metrics = trainer.validate(test_loader)
        for k, v in test_metrics.items():
            mlflow.log_metric(f"test_{k}", v)
        
        # Export to ONNX
        os.makedirs(args.output_dir, exist_ok=True)
        onnx_path = os.path.join(args.output_dir, 'tft_hypo_predictor.onnx')
        export_to_onnx(best_model, config, onnx_path)
        
        # Log model
        mlflow.pytorch.log_model(best_model, "model")
        mlflow.log_artifact(onnx_path, "model_onnx")
        
        # Save config
        with open(os.path.join(args.output_dir, 'config.yaml'), 'w') as f:
            yaml.dump(config.__dict__, f)
        
        logger.info(f"Training complete! Model saved to {onnx_path}")
        logger.info(f"Test metrics: {test_metrics}")


if __name__ == '__main__':
    main()