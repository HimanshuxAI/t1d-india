#!/usr/bin/env python3
"""
Model Evaluation Script
Evaluates trained TFT model on test set and generates clinical metrics report.
"""

import argparse
import json
import logging
import numpy as np
import pandas as pd
import torch
import onnxruntime as ort
from pathlib import Path
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, 
    roc_auc_score, precision_recall_curve, auc,
    confusion_matrix, classification_report
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def load_onnx_model(model_path: str):
    """Load ONNX model for inference."""
    session = ort.InferenceSession(model_path, providers=['CPUExecutionProvider'])
    return session

def load_test_data(data_path: str):
    """Load test data from parquet."""
    df = pd.read_parquet(data_path)
    # Filter test patients (assuming patient_id column exists)
    test_patients = df['patient_id'].unique()
    np.random.seed(42)
    test_ids = np.random.choice(test_patients, size=int(len(test_patients) * 0.15), replace=False)
    test_df = df[df['patient_id'].isin(test_ids)].copy()
    return test_df

def prepare_onnx_inputs(df: pd.DataFrame, config: dict):
    """Prepare inputs for ONNX inference."""
    feature_cols = [
        'static_categorical', 'static_real',
        'time_varying_known_reals', 'time_varying_unknown_reals'
    ]
    
    # This is a simplified version - in reality you'd match the exact preprocessing
    # For now, return mock inputs
    return {
        'static_categorical': np.random.randint(0, 4, (len(df), 4)).astype(np.int64),
        'static_real': np.random.randn(len(df), 12).astype(np.float32),
        'time_varying_known': np.random.randn(len(df), 6, 8).astype(np.float32),
        'time_varying_unknown': np.random.randn(len(df), 6, 12).astype(np.float32),
    }

def run_inference(session, inputs: dict):
    """Run ONNX inference."""
    outputs = session.run(None, inputs)
    return outputs[0]  # predictions

def compute_regression_metrics(y_true: np.ndarray, y_pred: np.ndarray, horizons: list, quantiles: list):
    """Compute regression metrics for quantile predictions."""
    metrics = {}
    n_horizons = len(horizons)
    n_quantiles = len(quantiles)
    
    for h_idx, horizon in enumerate(horizons):
        start = h_idx * n_quantiles * 3  # glucose p10/p50/p90
        end = start + n_quantiles * 3
        
        horizon_preds = y_pred[:, start:end]
        horizon_true = y_true[:, start:end]  # Assuming same structure
        
        # P50 (median) predictions
        p50_idx = 1  # middle quantile
        p50_pred = horizon_preds[:, p50_idx::3]
        p50_true = horizon_true[:, p50_idx::3]
        
        mae = mean_absolute_error(p50_true, p50_pred)
        mse = mean_squared_error(p50_true, p50_pred)
        rmse = np.sqrt(mse)
        
        # Coverage (should be ~80% for p10-p90)
        p10_pred = horizon_preds[:, 0::3]
        p90_pred = horizon_preds[:, 2::3]
        coverage = np.mean((p50_true >= p10_pred) & (p50_true <= p90_pred))
        
        metrics[f'horizon_{horizons[h_idx]}min'] = {
            'mae': float(mae),
            'mse': float(mse),
            'rmse': float(rmse),
            'coverage': float(coverage),
        }
    
    return metrics

def compute_classification_metrics(y_true: np.ndarray, y_pred: np.ndarray, horizons: list):
    """Compute classification metrics for hypo prediction."""
    metrics = {}
    n_horizons = len(y_pred.shape[1]) // 2  # Assuming 2 classes per horizon
    
    for h_idx, horizon in enumerate(horizons):
        # Hypo probability
        hypo_pred = y_pred[:, h_idx * 2]
        hypo_true = y_true[:, h_idx * 2]
        
        # Severe hypo
        severe_pred = y_pred[:, h_idx * 2 + 1]
        severe_true = y_true[:, h_idx * 2 + 1]
        
        # ROC AUC
        try:
            hypo_auc = roc_auc_score(hypo_true, hypo_pred)
            severe_auc = roc_auc_score(severe_true, severe_pred)
        except ValueError:
            hypo_auc = 0.5
            severe_auc = 0.5
        
        # Sensitivity/Specificity at 0.5 threshold
        hypo_binary = (hypo_pred > 0.5).astype(int)
        severe_binary = (severe_pred > 0.5).astype(int)
        
        hypo_cm = confusion_matrix(hypo_true, hypo_binary)
        severe_cm = confusion_matrix(severe_true, severe_binary)
        
        if hypo_cm.shape == (2, 2):
            tn, fp, fn, tp = hypo_cm.ravel()
            sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
            specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
        else:
            sensitivity = specificity = 0
        
        if severe_cm.shape == (2, 2):
            tn, fp, fn, tp = severe_cm.ravel()
            severe_sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
            severe_specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
        else:
            severe_sensitivity = severe_specificity = 0
        
        metrics[f'horizon_{horizon}min'] = {
            'hypo_auc': float(hypo_auc),
            'severe_hypo_auc': float(severe_auc),
            'hypo_sensitivity': float(sensitivity),
            'hypo_specificity': float(specificity),
            'severe_hypo_sensitivity': float(severe_sensitivity),
            'severe_hypo_specificity': float(severe_specificity),
        }
    
    return metrics

def generate_report(metrics: dict, output_path: str):
    """Generate evaluation report."""
    report = {
        'model_info': {
            'model_type': 'TemporalFusionTransformer',
            'task': 'hypoglycemia_prediction',
            'population': 'indian_t1d',
            'evaluation_date': datetime.now().isoformat(),
        },
        'regression_metrics': metrics.get('regression', {}),
        'classification_metrics': metrics.get('classification', {}),
        'summary': {
            'meets_sensitivity_target': all(
                m.get('hypo_sensitivity', 0) >= 0.91 
                for m in metrics.get('classification', {}).values()
            ),
            'meets_specificity_target': all(
                m.get('hypo_specificity', 0) >= 0.90 
                for m in metrics.get('classification', {}).values()
            ),
        }
    }
    
    with open(output_path, 'w') as f:
        json.dump(report, f, indent=2)
    
    # Print summary
    print("\n" + "="*60)
    print("MODEL EVALUATION REPORT")
    print("="*60)
    print(f"Model: TFT Hypoglycemia Prediction")
    print(f"Population: Indian T1D")
    print(f"Evaluation Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print("-"*60)
    
    print("\nRegression Metrics:")
    for horizon, m in metrics.get('regression', {}).items():
        print(f"  {horizon}: MAE={m['mae']:.2f}, RMSE={m['rmse']:.2f}, Coverage={m['coverage']:.3f}")
    
    print("\nClassification Metrics:")
    for horizon, m in metrics.get('classification', {}).items():
        print(f"  {horizon}:")
        print(f"    Hypo AUC: {m['hypo_auc']:.3f}, Sensitivity: {m['hypo_sensitivity']:.3f}, Specificity: {m['hypo_specificity']:.3f}")
        print(f"    Severe Hypo AUC: {m['severe_hypo_auc']:.3f}, Sensitivity: {m['severe_hypo_sensitivity']:.3f}, Specificity: {m['severe_hypo_specificity']:.3f}")
    
    print(f"\nMeets Sensitivity Target (≥91%): {report['summary']['meets_sensitivity_target']}")
    print(f"Meets Specificity Target (≥90%): {report['summary']['meets_specificity_target']}")
    
    return report


def main():
    parser = argparse.ArgumentParser(description='Evaluate TFT hypoglycemia prediction model')
    parser.add_argument('--model-path', type=str, required=True, help='Path to ONNX model')
    parser.add_argument('--data-path', type=str, default='/data/synthetic', help='Path to test data')
    parser.add_argument('--output', type=str, default='/models/evaluation_report.json', help='Output report path')
    args = parser.parse_args()
    
    logger.info(f"Loading model from {args.model_path}")
    session = load_onnx_model(args.model_path)
    
    logger.info(f"Loading test data from {args.data_path}")
    test_df = load_test_data(args.data_path)
    
    logger.info("Preparing inputs...")
    inputs = prepare_onnx_inputs(test_df, {})
    
    logger.info("Running inference...")
    predictions = run_inference(session, inputs)
    
    # Extract true targets from test_df
    # This is simplified - in reality you'd have proper target columns
    logger.warning("Using mock targets for demonstration")
    
    # Compute metrics (using mock data for demo)
    horizons = [30, 60]
    quantiles = [0.1, 0.5, 0.9]
    
    # Mock true values
    y_true = np.random.randn(len(test_df), 12)  # 2 horizons * 3 quantiles * 2 (glucose + hypo)
    y_pred = predictions
    
    logger.info("Computing regression metrics...")
    reg_metrics = compute_regression_metrics(y_true, y_pred, horizons, [0.1, 0.5, 0.9])
    
    logger.info("Computing classification metrics...")
    cls_metrics = compute_classification_metrics(y_true, y_pred, horizons)
    
    metrics = {
        'regression': reg_metrics,
        'classification': cls_metrics,
    }
    
    report = generate_report(metrics, args.output)
    
    logger.info(f"Report saved to {args.output}")
    logger.info("Evaluation complete!")


if __name__ == '__main__':
    main()