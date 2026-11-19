"""
Prepare Training Data from Synthetic Data
Converts synthetic CGM/meal/insulin data into training format for TFT model.
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TrainingDataPreparator:
    """Prepares training data from synthetic/synthetic CGM data."""
    
    def __init__(self, data_dir: str = '/Users/himanshu/Documents/PBL/synthetic_data'):
        self.data_dir = Path(data_dir)
        self.sequence_length = 6  # 30 min at 5-min intervals
        self.prediction_horizons = [30, 60]  # minutes
        self.max_horizon = max([30, 60]) // 5  # 12 steps
        
    def load_data(self) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Load synthetic data."""
        logger.info("Loading synthetic data...")
        
        with open(self.data_dir / 'patients.json') as f:
            patients = pd.DataFrame(json.load(f))
        
        with open(self.data_dir / 'cgm_readings.json') as f:
            cgm = pd.DataFrame(json.load(f))
        
        with open(self.data_dir / 'meal_logs.json') as f:
            meals = pd.DataFrame(json.load(f))
        
        with open(self.data_dir / 'insulin_logs.json') as f:
            insulin = pd.DataFrame(json.load(f))
        
        logger.info(f"Loaded {len(patients)} patients, {len(cgm)} CGM readings, {len(meals)} meals, {len(insulin)} insulin logs")
        return patients, cgm, meals, insulin
    
    def align_patient_data(self, patient_id: str, cgm: pd.DataFrame, meals: pd.DataFrame, 
                           insulin: pd.DataFrame, patient: pd.Series) -> pd.DataFrame:
        """Align all data for a single patient to 5-min grid."""
        
        # Filter patient data
        patient_cgm = cgm[cgm['patient_id'] == patient_id].copy()
        patient_meals = meals[meals['patient_id'] == patient_id].copy()
        patient_insulin = insulin[insulin['patient_id'] == patient_id].copy()
        
        if patient_cgm.empty:
            return pd.DataFrame()
        
        # Convert timestamps
        patient_cgm['time'] = pd.to_datetime(patient_cgm['time'])
        patient_meals['meal_time'] = pd.to_datetime(patient_meals['meal_time'])
        patient_insulin['administered_at'] = pd.to_datetime(patient_insulin['administered_at'])
        
        # Create unified 5-min timeline
        start = patient_cgm['time'].min()
        end = patient_cgm['time'].max()
        timeline = pd.date_range(start=start, end=end, freq='5min', tz='Asia/Kolkata')
        
        # Resample CGM to 5-min grid
        cgm_5min = patient_cgm.set_index('time').resample('5min').interpolate('time', limit=3)
        cgm_5min = cgm_5min.reindex(timeline)
        
        # Create feature DataFrame
        features = pd.DataFrame(index=timeline)
        features['glucose'] = cgm_5min['glucose_mg_dl']
        features['roc'] = features['glucose'].diff() / 5
        features['roc_5min_ago'] = features['roc'].shift(1)
        
        # Insulin IOB
        for ins_type in ['rapid', 'regular', 'nph']:
            col = f'iob_{ins_type}'
            features[col] = 0.0
            features[f'insulin_rate_{ins_type}'] = 0.0
        
        # Calculate IOB from insulin logs
        for _, insulin_row in patient_insulin.iterrows():
            admin_time = insulin_row['administered_at']
            dose = insulin_row['dose_u']
            ins_type = insulin_row['insulin_type'].lower()
            
            # Map insulin types
            type_map = {
                'rapid_lispro': 'rapid', 'rapid_aspart': 'rapid', 'rapid_glulisine': 'rapid',
                'regular_human': 'regular',
                'nph_human': 'nph',
                'premixed_30_70': 'premixed',
                'glargine_u100': 'glargine', 'glargine_u300': 'glargine',
                'degludec_u100': 'degludec', 'degludec_u200': 'degludec',
                'basal_pump': 'glargine',
            }
            mapped_type = type_map.get(ins_type, 'rapid')
            
            # Calculate IOB at each timeline point
            for i, ts in enumerate(timeline):
                min_ago = (ts - admin_time).total_seconds() / 60
                if 0 <= min_ago <= 480:
                    iob = self._calculate_iob(dose, min_ago, mapped_type)
                    idx = timeline.get_loc(ts)
                    if mapped_type == 'rapid':
                        features.iloc[idx, features.columns.get_loc('iob_rapid')] += iob
                    elif mapped_type == 'regular':
                        features.iloc[idx, features.columns.get_loc('iob_regular')] += iob
                    elif mapped_type == 'nph':
                        features.iloc[idx, features.columns.get_loc('iob_nph')] += iob
        
        # Meal absorption
        features['carbs_absorbing'] = 0.0
        for _, meal in patient_meals.iterrows():
            meal_time = meal['meal_time']
            carbs = meal['total_carbs_g']
            meal_type = meal.get('meal_type', 'default')
            
            # Generate absorption curve
            absorption = self._generate_absorption_curve(carbs, meal_type)
            
            # Align to timeline
            meal_idx = timeline.get_indexer([meal_time], method='nearest')[0]
            end_idx = min(meal_idx + len(absorption), len(timeline))
            features.iloc[meal_idx:end_idx, features.columns.get_loc('carbs_absorbing')] += absorption[:end_idx-meal_idx]
        
        # Static features
        static_features = {
            'age': self._calculate_age(patient.get('date_of_birth')),
            'weight': patient.get('weight_kg', 70),
            'diabetes_duration_years': patient.get('diabetes_duration_years', 5),
            'isf': patient.get('isf_mg_dl_per_u', 50),
            'icr': patient.get('icr_g_per_u', 10),
            'regimen_type': self._encode_regimen(patient.get('insulin_regimen', 'BASAL_BOLUS')),
            'hypo_unawareness': 0,
        }
        
        for key, val in static_features.items():
            features[key] = val
        
        # Create labels (30-min and 60-min ahead)
        features['glucose_30min'] = features['glucose'].shift(-6)
        features['glucose_60min'] = features['glucose'].shift(-12)
        features['hypo_30min'] = (features['glucose_30min'] < 70).astype(int)
        features['hypo_60min'] = (features['glucose_60min'] < 70).astype(int)
        features['severe_hypo_30min'] = (features['glucose_30min'] < 54).astype(int)
        
        # Drop rows with NaN labels
        features = features.dropna(subset=['glucose_30min', 'glucose_60min'])
        
        return features
    
    def _calculate_iob(self, dose: float, minutes_ago: float, insulin_type: str) -> float:
        """Calculate insulin on board."""
        params = {
            'rapid': {'ka': 0.018, 'ke': 0.012, 'bioav': 0.85},
            'regular': {'ka': 0.008, 'ke': 0.006, 'bioav': 0.75},
            'nph': {'ka': 0.003, 'ke': 0.002, 'bioav': 0.70},
            'glargine': {'ka': 0.001, 'ke': 0.0008, 'bioav': 0.90},
            'degludec': {'ka': 0.0008, 'ke': 0.0006, 'bioav': 0.95},
        }
        
        params = params.get('rapid')  # default
        for key in ['rapid', 'regular', 'nph', 'glargine', 'degludec']:
            if key in insulin_type.lower():
                params = {'ka': 0.018, 'ke': 0.012, 'bioav': 0.85}  # placeholder
                break
        
        # Simplified
        t = minutes_ago
        ka, ke, bioav = 0.018, 0.012, 0.85
        if abs(ka - ke) < 1e-6:
            iob = dose * bioav * (1 - np.exp(-ka * t)) * np.exp(-ke * t)
        else:
            iob = dose * bioav * (ka / (ka - ke)) * (np.exp(-ke * t) - np.exp(-ka * t))
        return max(0, iob)
    
    def _encode_regimen(self, regimen: str) -> int:
        mapping = {'BASAL_BOLUS': 0, 'NPH_REGULAR': 1, 'PREMIXED_30_70': 2, 'PREMIXED_50_50': 2, 'PUMP': 3}
        return mapping.get(regimen, 0)
    
    def prepare_all_patients(self, data_dir: str, output_path: str):
        """Prepare training data for all patients."""
        patients, cgm, meals, insulin = self.load_data()
        
        all_features = []
        
        for _, patient in patients.iterrows():
            patient_id = patient['patient_id']
            logger.info(f"Processing patient {patient_id}...")
            
            try:
                features = self.align_patient_data(
                    patient_id, 
                    cgm[cgm['patient_id'] == patient_id],
                    meals[meals['patient_id'] == patient_id],
                    insulin[insulin['patient_id'] == patient_id],
                    patient
                )
                
                if not features.empty:
                    features['patient_id'] = patient_id
                    all_features.append(features)
                    logger.info(f"  Generated {len(features)} samples")
            except Exception as e:
                logger.warning(f"Failed to process {patient_id}: {e}")
        
        if all_features:
            combined = pd.concat(all_features, ignore_index=True)
            
            # Save
            output_path = Path(output_path)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            combined.to_parquet(output_path, compression='snappy')
            logger.info(f"Saved {len(combined)} training samples to {output_path}")
            
            # Print stats
            logger.info(f"Total samples: {len(combined)}")
            logger.info(f"Hypo 30min rate: {combined['hypo_30min'].mean():.3f}")
            logger.info(f"Hypo 60min rate: {combined['hypo_60min'].mean():.3f}")
            logger.info(f"Patients: {combined['patient_id'].nunique()}")
            
            return combined
        else:
            logger.error("No training data generated!")
            return pd.DataFrame()


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--data-dir', type=str, default='/Users/himanshu/Documents/PBL/synthetic_data')
    parser.add_argument('--output', type=str, default='/Users/himanshu/Documents/PBL/training_data/training_features.parquet')
    args = parser.parse_args()
    
    preparator = TrainingDataPreparator(args.data_dir)
    preparator.prepare_all_patients(args.data_dir, args.output)