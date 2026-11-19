"""
TFT Hypoglycemia Prediction Training Pipeline
Trains a Temporal Fusion Transformer for 30/60-min hypoglycemia prediction
on Indian T1D CGM data with NPH/Regular insulin regimens.
"""

import os
import json
import logging
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import mlflow
import mlflow.pytorch
import onnx
import onnxruntime as ort
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass
import argparse
import yaml

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============================================
# CONFIGURATION
# ============================================

@dataclass
class TFTConfig:
    # Data
    sequence_length: int = 6  # 30 min at 5-min intervals
    prediction_horizons: List[int] = None  # [30, 60] minutes
    static_categorical_dims: Dict[str, int] = None
    static_reals: int = 12
    time_varying_known_reals: int = 8  # IOB, carbs absorbing, etc.
    time_varying_unknown_reals: int = 12  # CGM, trends, etc.
    
    # Model
    hidden_size: int = 256
    lstm_layers: int = 2
    dropout: float = 0.1
    attention_heads: int = 4
    hidden_continuous_size: int = 64
    
    # Training
    learning_rate: float = 1e-3
    batch_size: int = 64
    max_epochs: int = 100
    early_stopping_patience: int = 10
    gradient_clip_val: float = 1.0
    
    # Quantile loss
    quantiles: List[float] = None
    
    def __post_init__(self):
        if self.prediction_horizons is None:
            self.prediction_horizons = [30, 60]
        if self.quantiles is None:
            self.quantiles = [0.1, 0.5, 0.9]
        if self.static_categorical_dims is None:
            self.static_categorical_dims = {
                'regimen_type': 4,  # basal_bolus, nph_regular, premixed, pump
                'sex': 2,
                'cgm_type': 6,
            }


# ============================================
# DATA PREPROCESSING
# ============================================

class T1DDataset(Dataset):
    """Dataset for T1D hypoglycemia prediction with Indian meal patterns."""
    
    def __init__(self, data_path: str, config: TFTConfig, split: str = 'train'):
        self.config = config
        self.data = self._load_and_preprocess(data_path, split)
        
    def _load_and_preprocess(self, data_path: str, split: str) -> Dict:
        """Load and preprocess T1D data for Indian population."""
        # Load data (expecting parquet format from synthetic generator)
        df = pd.read_parquet(data_path)
        
        # Split by patient to avoid data leakage
        patients = df['patient_id'].unique()
        train_patients, test_patients = train_test_split(
            patients, test_size=0.2, random_state=42
        )
        train_patients, val_patients = train_test_split(
            train_patients, test_size=0.125, random_state=42  # 0.125 * 0.8 = 0.1
        )
        
        if split == 'train':
            patient_ids = train_patients
        elif split == 'val':
            patient_ids = val_patients
        else:
            patient_ids = test_patients
            
        df = df[df['patient_id'].isin(patient_ids)].copy()
        
        # Sort by patient and time
        df = df.sort_values(['patient_id', 'time']).reset_index(drop=True)
        
        # Create sequences
        sequences = self._create_sequences(df)
        
        return sequences
    
    def _create_sequences(self, df: pd.DataFrame) -> Dict:
        """Create sliding window sequences for time series prediction."""
        seq_len = self.config.sequence_length
        horizons = self.config.prediction_horizons
        max_horizon = max(horizons) // 5  # 5-min intervals
        
        # Feature columns
        static_cats = ['regimen_type', 'sex', 'cgm_type']
        static_reals = ['age', 'weight', 'diabetes_duration_years', 'isf', 'icr', 
                       'target_glucose', 'hypo_unawareness']
        
        time_varying_known = [
            'iob_rapid', 'iob_regular', 'iob_nph', 'iob_premixed',
            'carbs_absorbing', 'insulin_rate_rapid', 'insulin_rate_regular', 
            'insulin_rate_nph'
        ]
        
        time_varying_unknown = [
            'glucose', 'roc', 'roc_5min_ago', 'accel',
            'steps_5min', 'hr', 'meal_type_id',
            'carb_absorbing_rapid', 'carb_absorbing_intermediate', 'carb_absorbing_slow'
        ]
        
        target_cols = [f'glucose_p10_{h}min' for h in self.config.prediction_horizons] + \
                      [f'glucose_p50_{h}min' for h in self.config.prediction_horizons] + \
                      [f'glucose_p90_{h}min' for h in self.config.prediction_horizons] + \
                      [f'hypo_prob_{h}min' for h in self.config.prediction_horizons] + \
                      [f'severe_hypo_prob_{h}min' for h in self.config.prediction_horizons]
        
        # Group by patient
        groups = df.groupby('patient_id')
        
        static_categorical = []
        static_real = []
        time_varying_known_reals = []
        time_varying_unknown_reals = []
        targets = []
        patient_ids = []
        
        for patient_id, group in groups:
            group = group.reset_index(drop=True)
            n_samples = len(group)
            
            if n_samples < seq_len + max_horizon:
                continue
                
            # Static features
            static_cats.append(group[static_cats].iloc[0].values)
            static_real.append(group[static_reals].iloc[0].values)
            
            # Create sliding windows
            for i in range(n_samples - seq_len - max_horizon + 1):
                # Time-varying known (includes current and future known)
                tv_known = group[time_varying_known].iloc[i:i+seq_len+max_horizon].values
                time_varying_known_reals.append(tv_known)
                
                # Time-varying unknown (only past, not future)
                tv_unknown = group[time_varying_unknown].iloc[i:i+seq_len].values
                time_varying_unknown_reals.append(tv_unknown)
                
                # Targets at horizons
                target_row = group[target_cols].iloc[i+seq_len-1].values
                targets.append(target_row)
                
                static_categorical.append(group[static_cats].iloc[0].values)
                static_real.append(group[static_reals].iloc[0].values)
                patient_ids.append(patient_id)
        
        return {
            'static_categorical': np.array(static_categorical, dtype=np.int64),
            'static_real': np.array(static_real, dtype=np.float32),
            'time_varying_known_reals': np.array(time_varying_known_reals, dtype=np.float32),
            'time_varying_unknown_reals': np.array(time_varying_unknown_reals, dtype=np.float32),
            'targets': np.array(targets, dtype=np.float32),
            'patient_ids': np.array(patient_ids),
        }
    
    def __len__(self):
        return len(self.data['targets'])
    
    def __getitem__(self, idx):
        return {
            'static_categorical': torch.tensor(self.data['static_categorical'][idx], dtype=torch.long),
            'static_real': torch.tensor(self.data['static_real'][idx], dtype=torch.float32),
            'time_varying_known_reals': torch.tensor(self.data['time_varying_known_reals'][idx], dtype=torch.float32),
            'time_varying_unknown_reals': torch.tensor(self.data['time_varying_unknown_reals'][idx], dtype=torch.float32),
            'targets': torch.tensor(self.data['targets'][idx], dtype=torch.float32),
        }


# ============================================
# TFT MODEL
# ============================================

class VariableSelectionNetwork(nn.Module):
    """Variable Selection Network for feature importance."""
    
    def __init__(self, input_size: int, hidden_size: int, num_inputs: int, dropout: float):
        super().__init__()
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.num_inputs = num_inputs
        
        self.flatten = nn.Linear(input_size * num_inputs, hidden_size)
        self.var_selection = nn.Sequential(
            nn.Linear(hidden_size, hidden_size),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(hidden_size, num_inputs),
            nn.Softmax(dim=-1),
        )
        
        self.processing = nn.ModuleList([
            nn.Sequential(
                nn.Linear(input_size, hidden_size),
                nn.ReLU(),
                nn.Dropout(dropout),
            ) for _ in range(num_inputs)
        ])
    
    def forward(self, x):
        # x: (batch, seq_len, num_inputs * input_size) or (batch, num_inputs * input_size)
        has_seq = x.dim() == 3
        if has_seq:
            batch, seq_len, _ = x.shape
            x_flat = x.view(batch * seq_len, -1)
        else:
            x_flat = x
        
        flat = self.flatten(x_flat)
        weights = self.var_selection(flat)
        
        if has_seq:
            x_reshaped = x.view(batch * seq_len, self.num_inputs, self.input_size)
        else:
            x_reshaped = x.view(-1, self.num_inputs, self.input_size)
        
        processed = []
        for i in range(self.num_inputs):
            var_input = x_reshaped[:, i, :]
            processed.append(self.processing[i](var_input))
        
        processed = torch.stack(processed, dim=1)
        weighted = processed * weights.unsqueeze(-1)
        output = weighted.sum(dim=1)
        
        if has_seq:
            output = output.view(batch, seq_len, -1)
            weights = weights.view(batch, seq_len, self.num_inputs)
        
        return output, weights


class GatedResidualNetwork(nn.Module):
    """Gated Residual Network (GRN)."""
    
    def __init__(self, input_size: int, hidden_size: int, output_size: int = None,
                 dropout: float = 0.1, context_size: int = None):
        super().__init__()
        self.input_size = input_size
        self.hidden_size = hidden_size
        self.output_size = output_size or hidden_size
        self.context_size = context_size
        
        self.layer_norm = nn.LayerNorm(self.output_size)
        self.fc1 = nn.Linear(input_size, hidden_size)
        self.elu = nn.ELU()
        self.fc2 = nn.Linear(hidden_size, self.output_size)
        self.dropout = nn.Dropout(dropout)
        
        if context_size:
            self.context_fc = nn.Linear(context_size, hidden_size, bias=False)
        
        self.gate = nn.Sequential(
            nn.Linear(self.output_size, self.output_size),
            nn.Sigmoid(),
        )
        
        if input_size != self.output_size:
            self.skip = nn.Linear(input_size, self.output_size)
        else:
            self.skip = None
    
    def forward(self, x, context=None):
        hidden = self.fc1(x)
        if context is not None and self.context_size:
            hidden = hidden + self.context_fc(context)
        hidden = self.elu(hidden)
        hidden = self.fc2(hidden)
        hidden = self.dropout(hidden)
        
        gate = self.gate(hidden)
        
        if self.skip is not None:
            skip = self.skip(x)
        else:
            skip = x
        
        output = gate * hidden + (1 - gate) * skip
        output = self.layer_norm(output)
        return output


class InterpretableMultiHeadAttention(nn.Module):
    """Interpretable Multi-Head Attention from TFT paper."""
    
    def __init__(self, hidden_size: int, num_heads: int, dropout: float = 0.1):
        super().__init__()
        assert hidden_size % num_heads == 0
        
        self.hidden_size = hidden_size
        self.num_heads = num_heads
        self.head_size = hidden_size // num_heads
        
        self.query_proj = nn.Linear(hidden_size, hidden_size)
        self.key_proj = nn.Linear(hidden_size, hidden_size)
        self.value_proj = nn.Linear(hidden_size, hidden_size)
        self.output_proj = nn.Linear(hidden_size, hidden_size)
        self.dropout = nn.Dropout(dropout)
        self.scale = math.sqrt(self.head_size)
    
    def forward(self, query, key, value, mask=None):
        batch_size = query.size(0)
        
        Q = self.query_proj(query).view(batch_size, -1, self.num_heads, self.head_size).transpose(1, 2)
        K = self.key_proj(key).view(batch_size, -1, self.num_heads, self.head_size).transpose(1, 2)
        V = self.value_proj(value).view(batch_size, -1, self.num_heads, self.head_size).transpose(1, 2)
        
        scores = torch.matmul(Q, K.transpose(-2, -1)) / self.scale
        
        if mask is not None:
            mask = mask.unsqueeze(1)
            scores = scores.masked_fill(mask == 0, -1e9)
        
        attn_weights = F.softmax(scores, dim=-1)
        attn_weights = self.dropout(attn_weights)
        
        context = torch.matmul(attn_weights, V)
        context = context.transpose(1, 2).contiguous().view(batch_size, -1, self.hidden_size)
        output = self.output_proj(context)
        
        return output, attn_weights


class StaticCovariateEncoder(nn.Module):
    """Encodes static covariates into context vectors."""
    
    def __init__(self, static_categorical_dims: Dict[str, int], static_real_size: int,
                 hidden_size: int, dropout: float):
        super().__init__()
        
        # Embeddings for categorical
        self.categorical_embeddings = nn.ModuleDict({
            name: nn.Embedding(dim, hidden_size)
            for name, dim in static_categorical_dims.items()
        })
        
        # Variable selection for static covariates
        num_static = len(static_categorical_dims) + static_real_size
        self.var_selection = VariableSelectionNetwork(
            input_size=hidden_size,
            hidden_size=hidden_size,
            num_inputs=num_static,
            dropout=dropout,
        )
        
        # Context GRNs
        self.variable_context = GatedResidualNetwork(hidden_size, hidden_size, hidden_size, dropout)
        self.encoder_context = GatedResidualNetwork(hidden_size, hidden_size, hidden_size, dropout)
        self.decoder_context = GatedResidualNetwork(hidden_size, hidden_size, hidden_size, dropout)
    
    def forward(self, static_categorical, static_real):
        # Embed categorical
        embedded = []
        for i, (name, emb) in enumerate(self.categorical_embeddings.items()):
            embedded.append(emb(static_categorical[:, i]))
        
        # Static real projections
        static_real_proj = static_real.unsqueeze(-1)  # (batch, num_real, 1)
        static_real_proj = static_real_proj.expand(-1, -1, embedded[0].size(-1))
        
        # Concatenate all static inputs
        all_static = torch.cat(embedded + [static_real_proj], dim=1)
        
        # Variable selection
        selected, static_weights = self.var_selection(all_static)
        
        # Context vectors
        var_context = self.variable_context(selected)
        enc_context = self.encoder_context(selected)
        dec_context = self.decoder_context(selected)
        
        return var_context, enc_context, dec_context, static_weights


class TFTForHypoPrediction(nn.Module):
    """Temporal Fusion Transformer for Hypoglycemia Prediction."""
    
    def __init__(self, config: TFTConfig):
        super().__init__()
        self.config = config
        
        # Static encoder
        self.static_encoder = StaticCovariateEncoder(
            config.static_categorical_dims,
            config.static_reals,
            config.hidden_size,
            config.dropout,
        )
        
        # Input variable selection
        self.input_var_selection = VariableSelectionNetwork(
            input_size=1,
            hidden_size=config.hidden_size,
            num_inputs=config.time_varying_known_reals + config.time_varying_unknown_reals,
            dropout=config.dropout,
            hidden_continuous_size=config.hidden_continuous_size,
        )
        
        # LSTM encoder
        self.lstm_encoder = nn.LSTM(
            input_size=config.hidden_continuous_size,
            hidden_size=config.hidden_size,
            num_layers=config.lstm_layers,
            batch_first=True,
            dropout=config.dropout if config.lstm_layers > 1 else 0,
            bidirectional=False,
        )
        
        # Static context for LSTM initial states
        self.encoder_h0 = nn.Linear(config.hidden_size, config.hidden_size * config.lstm_layers)
        self.encoder_c0 = nn.Linear(config.hidden_size, config.hidden_size * config.lstm_layers)
        
        # Temporal attention
        self.temporal_attention = InterpretableMultiHeadAttention(
            hidden_size=config.hidden_size,
            num_heads=config.attention_heads,
            dropout=config.dropout,
        )
        
        # Position-wise feed-forward
        self.position_wise_ff = GatedResidualNetwork(
            config.hidden_size, config.hidden_size, config.hidden_size, config.dropout
        )
        
        # Output heads for each horizon
        num_targets = len(config.prediction_horizons) * len(config.quantiles) * 3  # glucose p10/p50/p90 + hypo + severe_hypo
        self.quantile_heads = nn.ModuleList([
            nn.Linear(config.hidden_size, num_targets // len(config.prediction_horizons))
            for _ in range(len(config.prediction_horizons))
        ])
        
        # Feature importance extraction
        self.register_buffer('feature_importance', torch.zeros(1))
    
    def forward(self, static_categorical, static_real, time_varying_known, time_varying_unknown):
        batch_size, seq_len, _ = time_varying_unknown.shape
        
        # 1. Encode static covariates
        var_context, enc_context, dec_context, static_weights = self.static_encoder(
            static_categorical, static_real
        )
        
        # 2. Variable selection on time-varying inputs
        # Concatenate known and unknown
        tv_concat = torch.cat([time_varying_known, time_varying_unknown], dim=-1)
        tv_expanded = tv_concat.unsqueeze(-1)  # (batch, seq, features, 1)
        selected_ts, ts_weights = self.input_var_selection(tv_expanded)
        
        # 3. LSTM encoding
        h0 = self.encoder_h0(enc_context).view(-1, batch_size, self.config.hidden_size)
        c0 = self.encoder_c0(enc_context).view(-1, batch_size, self.config.hidden_size)
        
        lstm_out, _ = self.lstm_encoder(selected_ts, (h0.contiguous(), c0.contiguous()))
        
        # 4. Temporal self-attention (causal mask)
        causal_mask = torch.tril(torch.ones(seq_len, seq_len, device=lstm_out.device)).bool()
        attn_out, attn_weights = self.temporal_attention(
            lstm_out, lstm_out, lstm_out, mask=causal_mask
        )
        
        # 5. Gated residual + position-wise FF
        x = lstm_out + attn_out
        x = self.position_wise_ff(x)
        
        # 6. Use last timestep for prediction
        last_hidden = x[:, -1, :]
        
        # 7. Quantile predictions for each horizon
        predictions = []
        for head in self.quantile_heads:
            pred = head(last_hidden)
            predictions.append(pred)
        
        output = torch.cat(predictions, dim=1)
        
        # Store for interpretability
        self.feature_importance = ts_weights.detach().mean(dim=0).mean(dim=0) if 'ts_weights' in locals() else None
        
        return output


# ============================================
# LOSS FUNCTIONS
# ============================================

class QuantileLoss(nn.Module):
    """Pinball loss for quantile regression."""
    
    def __init__(self, quantiles: List[float]):
        super().__init__()
        self.quantiles = quantiles
    
    def forward(self, preds: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        """
        preds: (batch, num_quantiles * num_horizons)
        targets: (batch, num_quantiles * num_horizons)
        """
        losses = []
        for i, q in enumerate(self.quantiles):
            errors = targets[:, i] - preds[:, i]
            loss = torch.max(q * errors, (q - 1) * errors)
            losses.append(loss.mean())
        
        return torch.stack(losses).mean()


class HypoClassificationLoss(nn.Module):
    """Binary cross-entropy for hypoglycemia classification."""
    
    def __init__(self, pos_weight: float = 10.0):  # Hypo is rare, weight it higher
        super().__init__()
        self.pos_weight = pos_weight
        self.bce = nn.BCEWithLogitsLoss(pos_weight=torch.tensor(pos_weight))
    
    def forward(self, preds: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        """
        preds: (batch, num_horizons * 2) - hypo_prob, severe_hypo_prob
        targets: (batch, num_horizons * 2) - binary labels
        """
        return self.bce(preds, targets)


class CombinedLoss(nn.Module):
    """Combined quantile regression + classification loss."""
    
    def __init__(self, quantiles: List[float], alpha: float = 0.7):
        super().__init__()
        self.quantile_loss = QuantileLoss(quantiles)
        self.classification_loss = HypoClassificationLoss()
        self.alpha = alpha  # Weight for quantile loss
    
    def forward(self, preds: torch.Tensor, targets: torch.Tensor) -> torch.Tensor:
        # Split predictions and targets
        # Assuming targets structure: [quantile_targets, classification_targets]
        num_quantiles = len(self.quantiles) * 3 * len(TFTConfig().prediction_horizons)
        
        quantile_preds = preds[:, :num_quantiles]
        quantile_targets = targets[:, :num_quantiles]
        
        class_preds = preds[:, num_quantiles:]
        class_targets = targets[:, num_quantiles:]
        
        q_loss = self.quantile_loss(quantile_preds, quantile_targets)
        c_loss = self.classification_loss(class_preds, class_targets)
        
        return self.alpha * q_loss + (1 - self.alpha) * c_loss


# ============================================
# TRAINING LOOP
# ============================================

class TFTTrainer:
    def __init__(self, config: TFTConfig, model: nn.Module, device: str = 'cuda'):
        self.config = config
        self.model = model.to(device)
        self.device = device
        
        self.criterion = CombinedLoss(config.quantiles)
        self.optimizer = optim.AdamW(
            model.parameters(),
            lr=config.learning_rate,
            weight_decay=1e-4
        )
        self.scheduler = optim.lr_scheduler.ReduceLROnPlateau(
            self.optimizer, mode='min', factor=0.5, patience=5, verbose=True
        )
        
        self.best_val_loss = float('inf')
        self.patience_counter = 0
        
        # MLflow
        mlflow.set_experiment("t1d-hypo-prediction")
    
    def train_epoch(self, dataloader: DataLoader) -> float:
        self.model.train()
        total_loss = 0
        
        for batch in dataloader:
            static_cat = batch['static_categorical'].to(self.device)
            static_real = batch['static_real'].to(self.device)
            tv_known = batch['time_varying_known_reals'].to(self.device)
            tv_unknown = batch['time_varying_unknown_reals'].to(self.device)
            targets = batch['targets'].to(self.device)
            
            self.optimizer.zero_grad()
            
            preds = self.model(static_cat, static_real, tv_known, tv_unknown)
            loss = self.criterion(preds, targets)
            
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), self.config.gradient_clip_val)
            self.optimizer.step()
            
            total_loss += loss.item()
        
        return total_loss / len(dataloader)
    
    def validate(self, dataloader: DataLoader) -> Dict[str, float]:
        self.model.eval()
        total_loss = 0
        all_preds = []
        all_targets = []
        
        with torch.no_grad():
            for batch in dataloader:
                static_cat = batch['static_categorical'].to(self.device)
                static_real = batch['static_real'].to(self.device)
                tv_known = batch['time_varying_known_reals'].to(self.device)
                tv_unknown = batch['time_varying_unknown_reals'].to(self.device)
                targets = batch['targets'].to(self.device)
                
                preds = self.model(static_cat, static_real, tv_known, tv_unknown)
                loss = self.criterion(preds, targets)
                
                total_loss += loss.item()
                all_preds.append(preds.cpu())
                all_targets.append(targets.cpu())
        
        avg_loss = total_loss / len(dataloader)
        
        # Compute clinical metrics
        all_preds = torch.cat(all_preds, dim=0)
        all_targets = torch.cat(all_targets, dim=0)
        
        metrics = self._compute_clinical_metrics(all_preds, all_targets)
        metrics['val_loss'] = avg_loss
        
        return metrics
    
    def _compute_clinical_metrics(self, preds: torch.Tensor, targets: torch.Tensor) -> Dict:
        """Compute clinical metrics: sensitivity, specificity, MAE, etc."""
        metrics = {}
        
        # Split predictions
        num_horizons = len(self.config.prediction_horizons)
        num_quantiles = len(self.config.quantiles)
        
        for h_idx, horizon in enumerate(self.config.prediction_horizons):
            # Quantile predictions for this horizon
            start_q = h_idx * 3 * len(self.config.quantiles)
            end_q = start_q + 3 * len(self.config.quantiles)
            
            horizon_preds = preds[:, start_q:end_q]
            horizon_targets = targets[:, start_q:end_q]
            
            # P50 (median) predictions
            p50_idx = len(self.config.quantiles)  # middle quantile
            p50_preds = horizon_preds[:, p50_idx::3]  # every 3rd starting from p50
            p50_targets = horizon_targets[:, p50_idx::3]
            
            # MAE
            mae = torch.mean(torch.abs(p50_preds - p50_targets)).item()
            metrics[f'mae_{horizon}min'] = mae
            
            # Hypoglycemia classification metrics
            hypo_start = 3 * len(self.config.quantiles) * len(self.config.prediction_horizons)
            class_preds = preds[:, hypo_start:]
            class_targets = targets[:, hypo_start:]
            
            for i, label in enumerate(['hypo', 'severe_hypo']):
                pred_probs = torch.sigmoid(class_preds[:, i::2])
                true_labels = class_targets[:, i::2]
                binary_preds = (pred_probs > 0.5).float()
                
                # Sensitivity (recall)
                tp = (binary_preds * true_labels).sum().item()
                fn = ((1 - binary_preds) * true_labels).sum().item()
                tn = ((1 - binary_preds) * (1 - true_labels)).sum().item()
                fp = (binary_preds * (1 - true_labels)).sum().item()
                
                sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
                specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
                
                metrics[f'sensitivity_{label}_{horizon}min'] = sensitivity
                metrics[f'specificity_{label}_{horizon}min'] = specificity
        
        return metrics
    
    def fit(self, train_loader: DataLoader, val_loader: DataLoader, 
            experiment_name: str = "tft-hypo-training") -> nn.Module:
        
        with mlflow.start_run(run_name=experiment_name):
            mlflow.log_params({
                'hidden_size': self.config.hidden_size,
                'lstm_layers': self.config.lstm_layers,
                'dropout': self.config.dropout,
                'learning_rate': self.config.learning_rate,
                'batch_size': self.config.batch_size,
                'seq_len': self.config.sequence_length,
            })
            
            for epoch in range(self.config.max_epochs):
                train_loss = self.train_epoch(train_loader)
                val_metrics = self.validate(val_loader)
                
                self.scheduler.step(val_metrics['val_loss'])
                
                # Logging
                mlflow.log_metric('train_loss', train_loss, step=epoch)
                for k, v in val_metrics.items():
                    mlflow.log_metric(k, v, step=epoch)
                
                logger.info(f"Epoch {epoch}: train_loss={train_loss:.4f}, "
                           f"val_loss={val_metrics['val_loss']:.4f}, "
                           f"sensitivity_hypo_30min={val_metrics.get('sensitivity_hypo_30min', 0):.4f}")
                
                # Early stopping
                if val_metrics['val_loss'] < self.best_val_loss:
                    self.best_val_loss = val_metrics['val_loss']
                    self.patience_counter = 0
                    # Save best model
                    torch.save(self.model.state_dict(), 'best_model.pt')
                    mlflow.pytorch.log_model(self.model, "model")
                else:
                    self.patience_counter += 1
                    if self.patience_counter >= self.config.early_stopping_patience:
                        logger.info(f"Early stopping at epoch {epoch}")
                        break
        
        # Load best model
        self.model.load_state_dict(torch.load('best_model.pt'))
        return self.model


# ============================================
# ONNX EXPORT
# ============================================

def export_to_onnx(model: nn.Module, config: TFTConfig, output_path: str):
    """Export trained model to ONNX format."""
    model.eval()
    
    # Create dummy inputs
    batch_size = 1
    seq_len = config.sequence_length
    max_horizon = max(config.prediction_horizons) // 5
    
    # Dummy inputs
    static_cat = torch.randint(0, 4, (batch_size, len(config.static_categorical_dims)))
    static_real = torch.randn(batch_size, config.static_reals)
    tv_known = torch.randn(batch_size, seq_len + max_horizon, 8)
    tv_unknown = torch.randn(batch_size, seq_len, 12)
    
    # Export
    torch.onnx.export(
        model,
        (static_cat, static_real, tv_known, tv_unknown),
        output_path,
        export_params=True,
        opset_version=14,
        do_constant_folding=True,
        input_names=['static_categorical', 'static_real', 'time_varying_known', 'time_varying_unknown'],
        output_names=['predictions'],
        dynamic_axes={
            'static_categorical': {0: 'batch_size'},
            'static_real': {0: 'batch_size'},
            'time_varying_known': {0: 'batch_size', 1: 'seq_len'},
            'time_varying_unknown': {0: 'batch_size', 1: 'seq_len'},
            'predictions': {0: 'batch_size'},
        },
    )
    
    # Verify ONNX model
    onnx_model = onnx.load(output_path)
    onnx.checker.check_model(onnx_model)
    logger.info(f"ONNX model exported to {output_path}")
    
    # Test with ONNX Runtime
    ort_session = ort.InferenceSession(output_path)
    ort_inputs = {
        'static_categorical': static_cat.numpy(),
        'static_real': static_real.numpy(),
        'time_varying_known': tv_known.numpy(),
        'time_varying_unknown': tv_unknown.numpy(),
    }
    ort_outs = ort_session.run(None, ort_inputs)
    logger.info(f"ONNX Runtime test passed, output shape: {ort_outs[0].shape}")


# ============================================
# MAIN ENTRY POINT
# ============================================

def main():
    parser = argparse.ArgumentParser(description="Train TFT for hypoglycemia prediction")
    parser.add_argument('--data-path', type=str, required=True, help='Path to training data (parquet)')
    parser.add_argument('--output-dir', type=str, default='./models', help='Output directory')
    parser.add_argument('--config', type=str, help='Path to config YAML')
    parser.add_argument('--epochs', type=int, default=100)
    parser.add_argument('--batch-size', type=int, default=64)
    parser.add_argument('--lr', type=float, default=1e-3)
    parser.add_argument('--device', type=str, default='cuda')
    args = parser.parse_args()
    
    # Load config
    config = TFTConfig()
    if args.config:
        with open(args.config, 'r') as f:
            config_dict = yaml.safe_load(f)
            for k, v in config_dict.items():
                if hasattr(config, k):
                    setattr(config, k, v)
    
    if args.epochs:
        config.max_epochs = args.epochs
    if args.batch_size:
        config.batch_size = args.batch_size
    if args.lr:
        config.learning_rate = args.lr
    
    device = args.device if torch.cuda.is_available() else 'cpu'
    logger.info(f"Using device: {device}")
    
    # Create datasets
    train_dataset = T1DDataset(args.data_path, config, 'train')
    val_dataset = T1DDataset(args.data_path, config, 'val')
    test_dataset = T1DDataset(args.data_path, config, 'test')
    
    train_loader = DataLoader(train_dataset, batch_size=config.batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_dataset, batch_size=config.batch_size, shuffle=False, num_workers=4)
    test_loader = DataLoader(test_dataset, batch_size=config.batch_size, shuffle=False, num_workers=4)
    
    logger.info(f"Train samples: {len(train_dataset)}, Val: {len(val_dataset)}, Test: {len(test_dataset)}")
    
    # Create model
    model = TFTForHypoPrediction(config)
    
    # Train
    trainer = TFTTrainer(config, model, device)
    best_model = trainer.fit(train_loader, val_loader)
    
    # Export to ONNX
    os.makedirs(args.output_dir, exist_ok=True)
    export_to_onnx(best_model, config, os.path.join(args.output_dir, 'tft_hypo_predictor.onnx'))
    
    # Save config
    with open(os.path.join(args.output_dir, 'config.yaml'), 'w') as f:
        yaml.dump(config.__dict__, f)
    
    logger.info("Training complete!")


if __name__ == '__main__':
    import math
    import torch.nn.functional as F
    main()