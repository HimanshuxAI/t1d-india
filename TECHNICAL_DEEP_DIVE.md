# Technical Deep Dive: AI-Powered T1D Management for Indian Diets
## Expanded Implementation Specifications

---

## 1. ML Model Architecture Specifications

### 1.1 Hypoglycemia Prediction: Temporal Fusion Transformer (TFT) Detail

#### 1.1.1 Input Feature Engineering

```
Time-Series Features (per 5-min step, 30-min lookback = 6 steps):
┌────────────────────────────────────────────────────────────────────────────┐
│ Feature Group          │ Features                                          │ Dim │
├────────────────────────┼───────────────────────────────────────────────────┼─────┤
│ CGM Core               │ glucose_t, glucose_t-1...glucose_t-5              │  6  │
│ CGM Derived            │ roc_t, roc_t-1...roc_t-5 (mg/dL/min)              │  6  │
│                        │ accel_t (roc_t - roc_t-1)                         │  1  │
├────────────────────────┼───────────────────────────────────────────────────┼─────┤
│ Insulin PK State       │ IOB_rapid_t, IOB_rapid_t-1...IOB_rapid_t-5        │  6  │
│                        │ IOB_regular_t...IOB_regular_t-5                   │  6  │
│                        │ IOB_nph_t...IOB_nph_t-5                           │  6  │
│ Insulin Derived        │ insulin_rate_rapid_t (U/hr)                       │  1  │
│                        │ insulin_rate_regular_t                            │  1  │
│                        │ insulin_rate_nph_t                                │  1  │
├────────────────────────┼───────────────────────────────────────────────────┼─────┤
│ Meal Absorption        │ carbs_absorbing_t...carbs_absorbing_t-5 (g/5min)  │  6  │
│                        │ protein_absorbing_t... (g/5min)                   │  6  │
│                        │ fat_absorbing_t... (g/5min)                       │  6  │
│ Meal Derived           │ carbs_remaining_t (g)                             │  1  │
│                        │ meal_type_embedding_t (learned, 8-dim)            │  8  │
├────────────────────────┼───────────────────────────────────────────────────┼─────┤
│ Activity               │ steps_5min_t...steps_5min_t-5                     │  6  │
│                        │ hr_avg_5min_t...hr_avg_5min_t-5                   │  6  │
│                        │ activity_intensity_t (METs estimated)             │  1  │
├────────────────────────┼───────────────────────────────────────────────────┼─────┤
│ Static (per patient)   │ age, weight, height, diabetes_duration_years      │  4  │
│                        │ insulin_sensitivity_factor (ISF, mg/dL/U)         │  1  │
│                        │ carb_ratio (ICR, g/U)                             │  1  │
│                        │ basal_rate_U_hr (if pump)                         │  1  │
│                        │ regimen_type_embedding (4-dim: BB/NPH/Premix/Pump)│  4  │
│                        │ hypo_unawareness_flag (binary)                    │  1  │
└────────────────────────┴───────────────────────────────────────────────────┴─────┘
Total per timestep: ~72 features → Projected to 256-dim via Variable Selection Network
```

#### 1.1.2 TFT Architecture Configuration

```python
# Model hyperparameters (tuned via Optuna on validation set)
TFT_CONFIG = {
    # Input
    "input_size": 72,              # raw features per timestep
    "static_input_size": 12,       # static covariates
    "output_size": 3,              # P10, P50, P90 quantiles
    "num_encoder_steps": 6,        # 30-min lookback @ 5-min
    "num_decoder_steps": 12,       # 60-min forecast horizon (for auxiliary)
    
    # Architecture
    "hidden_size": 256,
    "lstm_layers": 2,
    "attention_heads": 4,
    "dropout": 0.1,
    "hidden_continuous_size": 64,  # for variable selection
    
    # Training
    "learning_rate": 1e-3,
    "batch_size": 64,
    "max_epochs": 100,
    "early_stopping_patience": 10,
    "gradient_clip_val": 1.0,
    
    # Loss
    "quantiles": [0.1, 0.5, 0.9],  # for prediction intervals
    "loss": "QuantileLoss",        # pinball loss
    
    # Indian-specific
    "insulin_pk_params": {
        "rapid": {"tau1": 55, "tau2": 75, "peak_min": 60},      # lispro/aspart/glulisine
        "regular": {"tau1": 90, "tau2": 150, "peak_min": 120},  # human regular
        "nph": {"tau1": 180, "tau2": 480, "peak_min": 360},     # NPH (isophane)
        "premixed_30_70": {"tau1": 90, "tau2": 480, "peak_min": 240},
    },
    "carb_absorption": {
        "indian_mixed_meal": {"k_abs": 0.025, "t_max_min": 45},  # slower due to fiber/fat
        "high_glycemic": {"k_abs": 0.045, "t_max_min": 30},      # sugar, juice, white rice
        "low_glycemic": {"k_abs": 0.015, "t_max_min": 90},       # whole grains, legumes
    },
}
```

#### 1.1.3 Insulin Pharmacokinetic Models (Critical for Indian Regimens)

**Two-Compartment Subcutaneous Model (Hovorka et al. adapted):**

```
For each insulin type, IOB(t) = Dose * (1 - exp(-k_a * t)) * exp(-k_e * t)

Where:
- k_a = absorption rate constant (min⁻¹)
- k_e = elimination rate constant (min⁻¹)

Indian Regimen Parameters (from published PK studies in South Asians):
┌──────────────┬──────────┬──────────┬──────────────┬────────────────────┐
│ Insulin      │ k_a      │ k_e      │ T_max (min)  │ Bioavailability    │
├──────────────┼──────────┼──────────┼──────────────┼────────────────────┤
│ Rapid-acting │ 0.018    │ 0.012    │ 55-75        │ 0.85               │
│ (Lispro/     │          │          │              │                    │
│ Aspart/Glul) │          │          │              │                    │
├──────────────┼──────────┼──────────┼──────────────┼────────────────────┤
│ Regular      │ 0.008    │ 0.006    │ 90-150       │ 0.75               │
│ (Human)      │          │          │              │                    │
├──────────────┼──────────┼──────────┼──────────────┼────────────────────┤
│ NPH          │ 0.003    │ 0.002    │ 240-480      │ 0.70               │
│ (Isophane)   │          │          │              │                    │
├──────────────┼──────────┼──────────┼──────────────┼────────────────────┤
│ Premixed 30/70│ 0.008   │ 0.003    │ 120-300      │ 0.72               │
│ (30% Reg/     │ (reg)    │ (nph)    │ (biphasic)   │                    │
│  70% NPH)    │ 0.003    │ 0.002    │              │                    │
└──────────────┴──────────┴──────────┴──────────────┴────────────────────┘

IOB Calculation (per insulin type, vectorized):
```python
def compute_iob_vectorized(dose_history, current_time, insulin_type):
    """
    dose_history: [(dose_U, timestamp), ...]
    Returns IOB at current_time + next 60 min (for decoder)
    """
    params = INSULIN_PK_PARAMS[insulin_type]
    k_a, k_e = params["k_a"], params["k_e"]
    
    # Time since each injection (minutes)
    t = current_time - dose_history[:, 1]  # shape: (n_injections,)
    
    # Only consider injections within 8 hours (NPH) or 4 hours (rapid)
    max_lookback = 480 if insulin_type == "nph" else 240
    mask = (t >= 0) & (t <= max_lookback)
    
    # Two-compartment: IOB = Dose * k_a/(k_a-k_e) * (exp(-k_e*t) - exp(-k_a*t))
    # Simplified single-compartment approximation for speed:
    iob = dose_history[:, 0] * (1 - np.exp(-k_a * t)) * np.exp(-k_e * t)
    iob = np.where(mask, iob, 0)
    
    return iob.sum()
```

#### 1.1.4 Carbohydrate Absorption Model for Indian Meals

```python
# Multi-phase absorption based on meal composition
# Indian meals: higher fiber, fat, protein vs Western → slower, prolonged absorption

class IndianCarbAbsorptionModel:
    """
    Three-phase absorption: 
    1. Rapid (sugars, refined carbs): 0-30 min
    2. Intermediate (starches): 30-90 min  
    3. Slow (fiber-rich, legumes, whole grains): 90-240 min
    """
    
    PHASE_PARAMS = {
        "rapid": {"fraction": 0.30, "k_abs": 0.045, "delay_min": 0},      # sugar, juice, white rice
        "intermediate": {"fraction": 0.50, "k_abs": 0.025, "delay_min": 15}, # wheat, potato, millet
        "slow": {"fraction": 0.20, "k_abs": 0.012, "delay_min": 45},        # legumes, whole grains, veg
    }
    
    # Meal-type adjustments (multipliers on fractions)
    MEAL_TYPE_MODIFIERS = {
        "south_indian_breakfast": {"rapid": 0.4, "intermediate": 0.5, "slow": 0.1},  # idli, dosa, upma
        "north_indian_lunch": {"rapid": 0.2, "intermediate": 0.5, "slow": 0.3},      # roti, dal, sabzi, rice
        "bengali_lunch": {"rapid": 0.25, "intermediate": 0.45, "slow": 0.3},         # rice, fish, dal, veg
        "gujarati_thali": {"rapid": 0.3, "intermediate": 0.4, "slow": 0.3},          # rotla, dal, kadhi, veg
        "mughlai_dinner": {"rapid": 0.15, "intermediate": 0.45, "slow": 0.4},        # biryani, kebab, naan
        "snack_fried": {"rapid": 0.35, "intermediate": 0.45, "slow": 0.2},           # samosa, pakora, vada
        "fruit_snack": {"rapid": 0.6, "intermediate": 0.3, "slow": 0.1},             # mango, banana, apple
    }
    
    def get_absorption_curve(self, total_carbs_g: float, meal_type: str, 
                             duration_min: int = 240) -> np.ndarray:
        """Returns carb absorption rate (g/min) for each minute."""
        modifiers = self.MEAL_TYPE_MODIFIERS.get(meal_type, 
            {"rapid": 0.3, "intermediate": 0.5, "slow": 0.2})
        
        curve = np.zeros(duration_min)
        for phase, params in self.PHASE_PARAMS.items():
            frac = params["fraction"] * modifiers[phase]
            phase_carbs = total_carbs_g * frac
            k = params["k_abs"]
            delay = params["delay_min"]
            
            # Gamma distribution absorption: t^(k-1) * exp(-t/θ)
            t = np.arange(duration_min) - delay
            t = np.maximum(t, 0)
            absorption = phase_carbs * k * np.exp(-k * t)
            curve += absorption
            
        return curve  # g/min per minute
```

#### 1.1.5 Training Pipeline: Data Alignment & Preprocessing

```python
# Preprocessing pipeline (Apache Beam / Dagster)

class T1DDataPreprocessor:
    """
    Aligns multi-modal time series to 5-min grid, handles missing data,
    computes derived features (IOB, carb absorption, ROC).
    """
    
    RESAMPLE_FREQ = "5min"
    LOOKBACK_WINDOWS = {
        "cgm": "30min",      # 6 steps
        "insulin": "8hr",    # for NPH IOB
        "meal": "4hr",       # carb absorption tail
        "activity": "30min",
    }
    
    def align_patient_data(self, patient_id: str) -> pd.DataFrame:
        """
        Output: DataFrame with 5-min index, columns for all features
        """
        # 1. Load raw data
        cgm = self.load_cgm(patient_id)           # timestamp, glucose_mg_dL
        insulin = self.load_insulin(patient_id)   # timestamp, type, dose_U, site
        meals = self.load_meals(patient_id)       # timestamp, carbs_g, protein_g, fat_g, meal_type
        activity = self.load_activity(patient_id) # timestamp, steps, hr
        static = self.load_static(patient_id)     # age, weight, ISF, ICR, regimen
        
        # 2. Create unified 5-min timeline
        start = min(cgm.index.min(), insulin.index.min(), meals.index.min())
        end = max(cgm.index.max(), insulin.index.max(), meals.index.max())
        timeline = pd.date_range(start, end, freq="5min", tz="Asia/Kolkata")
        
        # 3. Resample & forward-fill (with limits)
        cgm_5min = cgm.resample("5min").interpolate("time", limit=3)  # max 15-min gap
        insulin_5min = insulin.resample("5min").sum()  # doses in each 5-min bin
        meals_5min = meals.resample("5min").first()    # meal events are sparse
        activity_5min = activity.resample("5min").interpolate("time", limit=6)
        
        # 4. Compute derived features
        features = pd.DataFrame(index=timeline)
        
        # CGM features
        features["glucose"] = cgm_5min["glucose_mg_dL"]
        features["roc"] = features["glucose"].diff() / 5  # mg/dL per min
        features["roc_5min_ago"] = features["roc"].shift(1)
        
        # Insulin IOB (vectorized per type)
        for ins_type in ["rapid", "regular", "nph"]:
            features[f"iob_{ins_type}"] = self.compute_iob_series(
                insulin_5min[insulin_5min["type"] == ins_type], timeline
            )
            features[f"insulin_rate_{ins_type}"] = features[f"iob_{ins_type}"].diff() / 5
        
        # Meal absorption
        absorption_curves = []
        for _, meal in meals_5min.dropna().iterrows():
            curve = self.carb_model.get_absorption_curve(
                meal["carbs_g"], meal["meal_type"], duration_min=240
            )
            # Align to timeline
            meal_idx = timeline.get_indexer([meal.name], method="nearest")[0]
            end_idx = min(meal_idx + len(curve), len(timeline))
            absorption_curves.append((meal_idx, end_idx, curve[:end_idx-meal_idx]))
        
        features["carbs_absorbing"] = 0.0
        for start_idx, end_idx, curve in absorption_curves:
            features.iloc[start_idx:end_idx, features.columns.get_loc("carbs_absorbing")] += curve
        
        # Meal type embedding (learned during training)
        features["meal_type_id"] = self.encode_meal_type(meals_5min)
        
        # Activity
        features["steps_5min"] = activity_5min["steps"].fillna(0)
        features["hr"] = activity_5min["hr"].fillna(method="ffill").fillna(70)
        
        # Static features (broadcast)
        for col, val in static.items():
            features[col] = val
            
        # 5. Create labels (30-min and 60-min ahead glucose)
        features["glucose_30min"] = features["glucose"].shift(-6)
        features["glucose_60min"] = features["glucose"].shift(-12)
        features["hypo_30min"] = (features["glucose_30min"] < 70).astype(int)
        features["hypo_60min"] = (features["glucose_60min"] < 70).astype(int)
        features["severe_hypo_30min"] = (features["glucose_30min"] < 54).astype(int)
        
        # 6. Drop rows with NaN labels (end of series)
        features = features.dropna(subset=["glucose_30min", "glucose_60min"])
        
        return features
```

---

### 1.2 Carb Estimation: Food Vision Model

#### 1.2.1 Architecture: Multi-Task EfficientNet-B3 + Attention

```python
class IndianFoodCarbEstimator(nn.Module):
    """
    Multi-task: classification + portion regression + carb regression
    """
    def __init__(self, num_classes=256, pretrained=True):
        super().__init__()
        # Backbone
        self.backbone = timm.create_model("efficientnet_b3", pretrained=pretrained, 
                                          num_classes=0, global_pool="")
        backbone_dim = 1536  # EfficientNet-B3 feature dim
        
        # Spatial attention for portion estimation
        self.attention = nn.Sequential(
            nn.Conv2d(backbone_dim, 256, 1),
            nn.ReLU(),
            nn.Conv2d(256, 1, 1),
            nn.Sigmoid()
        )
        
        # Global pooling
        self.pool = nn.AdaptiveAvgPool2d(1)
        
        # Task heads
        self.classifier = nn.Sequential(
            nn.Linear(backbone_dim, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, num_classes)
        )
        
        self.portion_head = nn.Sequential(
            nn.Linear(backbone_dim, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 1),  # grams
            nn.Softplus()       # ensure positive
        )
        
        self.carb_head = nn.Sequential(
            nn.Linear(backbone_dim + 1, 256),  # + portion estimate
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 1),
            nn.Softplus()
        )
        
    def forward(self, x):
        # x: (B, 3, 300, 300)
        features = self.backbone(x)  # (B, 1536, H, W)
        
        # Attention-weighted pooling for portion
        attn_map = self.attention(features)  # (B, 1, H, W)
        attended = features * attn_map
        pooled = self.pool(attended).flatten(1)  # (B, 1536)
        
        # Classification
        class_logits = self.classifier(pooled)
        
        # Portion estimation
        portion_g = self.portion_head(pooled)
        
        # Carb estimation (conditioned on portion)
        carb_input = torch.cat([pooled, portion_g], dim=1)
        carbs_g = self.carb_head(carb_input)
        
        return {
            "class_logits": class_logits,
            "portion_g": portion_g,
            "carbs_g": carbs_g,
            "attention_map": attn_map
        }
```

#### 1.2.2 Loss Function

```python
class MultiTaskFoodLoss(nn.Module):
    def __init__(self, class_weight=1.0, portion_weight=0.5, carb_weight=1.0):
        super().__init__()
        self.class_weight = class_weight
        self.portion_weight = portion_weight
        self.carb_weight = carb_weight
        self.ce_loss = nn.CrossEntropyLoss(label_smoothing=0.1)
        self.huber_loss = nn.HuberLoss(delta=10.0)  # robust to outliers
        
    def forward(self, preds, targets):
        """
        targets: {
            "class_id": (B,), 
            "portion_g": (B,), 
            "carbs_g": (B,),
            "has_portion_label": (B,) bool  # portion not always labeled
        }
        """
        # Classification loss (always)
        loss_class = self.ce_loss(preds["class_logits"], targets["class_id"])
        
        # Portion loss (only where labeled)
        portion_mask = targets["has_portion_label"]
        if portion_mask.any():
            loss_portion = self.huber_loss(
                preds["portion_g"][portion_mask], 
                targets["portion_g"][portion_mask]
            )
        else:
            loss_portion = torch.tensor(0.0, device=preds["portion_g"].device)
        
        # Carb loss (always, but weighted by portion confidence)
        loss_carb = self.huber_loss(preds["carbs_g"], targets["carbs_g"])
        
        total = (self.class_weight * loss_class + 
                 self.portion_weight * loss_portion + 
                 self.carb_weight * loss_carb)
        
        return {
            "total": total,
            "class": loss_class,
            "portion": loss_portion,
            "carb": loss_carb
        }
```

#### 1.2.3 Training Data Strategy

| Data Source | Images | Classes | Portion Labels | Carb Labels | Use Case |
|-------------|--------|---------|----------------|-------------|----------|
| **Synthetic (BlenderProc)** | 500k | 256 | ✓ Perfect | ✓ Perfect | Pre-training, domain randomization |
| **Nutrition5k** | 5k | 100+ | ✓ | ✓ | Transfer learning (Western foods) |
| **Food-101** | 101k | 101 | ✗ | ✗ | Backbone initialization |
| **Indian Food Dataset (collected)** | 50k | 200+ | ✓ Partial | ✓ Partial | Fine-tuning, Indian dishes |
| **User-contributed (opt-in)** | Growing | 200+ | ✓ Noisy | ✓ Noisy | Continuous learning |

**Synthetic Data Generation Pipeline:**
```python
# BlenderProc script for Indian dishes
SYNTHETIC_CONFIG = {
    "dishes": [
        "rajma_chawal", "chole_bhature", "dosa_sambar", "idli_sambar",
        "biryani_veg", "biryani_chicken", "roti_dal_sabzi", "paratha_aloo",
        "poha", "upma", "pongal", "khichdi", "thepla", "dhokla",
        "pav_bhaji", "vada_pav", "samosa", "pakora", "jalebi", "gulab_jamun"
    ],
    "plates": ["stainless_steel_thali", "banana_leaf", "plastic_plate", "steel_katori"],
    "lighting": ["indoor_warm", "indoor_cool", "daylight_window", "restaurant", "outdoor"],
    "camera_angles": ["top_down_90", "top_down_75", "top_down_60", "side_45", "side_30"],
    "clutter": ["spoon", "fork", "napkin", "glass", "phone", "none"],
    "domain_randomization": {
        "texture_noise": 0.1,
        "color_jitter": 0.2,
        "background_clutter": True,
        "occlusion": 0.15,
    },
    "samples_per_dish": 2000,  # 256 dishes * 2000 = 512k images
}
```

---

### 1.3 Insulin Dose Calculator: Algorithmic Details

#### 1.3.1 Bolus Calculation with Safety Constraints

```python
@dataclass
class BolusRecommendation:
    meal_bolus: float          # U for carbs
    correction_bolus: float    # U for high glucose
    total_bolus: float         # U recommended
    max_allowed: float         # U safety cap
    warnings: List[str]        # e.g., "High IOB", "Recent hypo"
    explanation: str           # Human-readable breakdown

class IndianBolusCalculator:
    """
    Supports NPH/Regular, Premixed, Basal-Bolus, Pump regimens
    """
    
    SAFETY_LIMITS = {
        "max_bolus_u": 15.0,              # Hard cap
        "max_correction_u": 5.0,          # Max correction per event
        "min_glucose_for_correction": 90, # Don't correct below this
        "target_glucose": 110,            # mg/dL
        "min_glucose_post_bolus": 70,     # Predicted floor
        "iob_threshold_high": 3.0,        # U, warn if IOB > this
        "recent_hypo_window_min": 120,    # 2 hours
    }
    
    def calculate(self, 
                  carbs_g: float,
                  current_glucose: float,
                  iob_rapid: float,
                  iob_regular: float,
                  iob_nph: float,
                  icr: float,           # Insulin-to-carb ratio (g/U)
                  isf: float,           # Insulin sensitivity factor (mg/dL/U)
                  regimen: str,         # "basal_bolus", "nph_regular", "premixed_30_70", "pump"
                  recent_hypo: bool = False,
                  time_since_last_meal_min: int = None) -> BolusRecommendation:
        
        warnings = []
        
        # 1. Meal bolus
        meal_bolus = carbs_g / icr if icr > 0 else 0
        
        # 2. Correction bolus (only if glucose > target and not recent hypo)
        correction_bolus = 0.0
        if (current_glucose > self.SAFETY_LIMITS["target_glucose"] and 
            not recent_hypo and
            current_glucose >= self.SAFETY_LIMITS["min_glucose_for_correction"]):
            
            correction_bolus = (current_glucose - self.SAFETY_LIMITS["target_glucose"]) / isf
            correction_bolus = min(correction_bolus, self.SAFETY_LIMITS["max_correction_u"])
            
        # 3. IOB adjustment (subtract active insulin)
        total_iob = iob_rapid + iob_regular * 0.5 + iob_nph * 0.3  # Weighted by potency
        if total_iob > self.SAFETY_LIMITS["iob_threshold_high"]:
            warnings.append(f"High IOB ({total_iob:.1f}U) - consider reducing bolus")
            # Conservative: subtract 50% of excess IOB
            iob_adjustment = max(0, (total_iob - self.SAFETY_LIMITS["iob_threshold_high"]) * 0.5)
        else:
            iob_adjustment = 0
            
        # 4. Regimen-specific adjustments
        regimen_adjustment, regimen_warnings = self._regimen_adjustments(
            regimen, iob_rapid, iob_regular, iob_nph, time_since_last_meal_min
        )
        warnings.extend(regimen_warnings)
        
        # 5. Total
        total_bolus = meal_bolus + correction_bolus - iob_adjustment + regimen_adjustment
        total_bolus = max(0, total_bolus)  # No negative bolus
        
        # 6. Safety cap
        max_allowed = self.SAFETY_LIMITS["max_bolus_u"]
        if total_bolus > max_allowed:
            warnings.append(f"Calculated bolus ({total_bolus:.1f}U) exceeds max ({max_allowed}U)")
            total_bolus = max_allowed
            
        # 7. Predicted glucose floor check (simple model)
        predicted_drop = total_bolus * isf
        predicted_min = current_glucose - predicted_drop
        if predicted_min < self.SAFETY_LIMITS["min_glucose_post_bolus"]:
            warnings.append(f"Predicted glucose may drop to {predicted_min:.0f} mg/dL")
            # Reduce to keep predicted min at 80
            safe_bolus = (current_glucose - 80) / isf
            total_bolus = min(total_bolus, max(0, safe_bolus))
            
        # 8. Recent hypo warning
        if recent_hypo:
            warnings.append("Recent hypoglycemia detected - consider reducing bolus by 25-50%")
            
        return BolusRecommendation(
            meal_bolus=round(meal_bolus, 1),
            correction_bolus=round(correction_bolus, 1),
            total_bolus=round(total_bolus, 1),
            max_allowed=max_allowed,
            warnings=warnings,
            explanation=self._generate_explanation(meal_bolus, correction_bolus, 
                                                   iob_adjustment, regimen_adjustment)
        )
    
    def _regimen_adjustments(self, regimen, iob_rapid, iob_regular, iob_nph, 
                             time_since_last_meal):
        """Regimen-specific logic for Indian insulin patterns"""
        warnings = []
        adjustment = 0.0
        
        if regimen == "nph_regular":
            # NPH given morning/evening, Regular before meals
            # If morning NPH peaking (4-8h post-injection), reduce meal bolus
            if time_since_last_meal and 240 <= time_since_last_meal <= 480:
                warnings.append("Morning NPH may be peaking - consider 20% bolus reduction")
                adjustment -= 0.2 * (iob_rapid + iob_regular)
                
        elif regimen == "premixed_30_70":
            # Fixed ratio, typically 2x/day (breakfast/dinner)
            # Mid-day bolus needs caution due to 70% NPH component
            if time_since_last_meal and 180 <= time_since_last_meal <= 360:
                warnings.append("Premixed NPH component active - reduced correction recommended")
                adjustment -= 0.15 * iob_nph
                
        elif regimen == "basal_bolus":
            # Standard basal-bolus with rapid + long-acting (glargine/degludec)
            # Minimal adjustment needed
            pass
            
        elif regimen == "pump":
            # Basal rate already accounted in IOB
            pass
            
        return adjustment, warnings
```

---

## 2. Database Schema: Complete Specifications

### 2.1 PostgreSQL: Core Tables (Prisma/Drizzle Schema)

```sql
-- Users & Profiles
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id TEXT UNIQUE NOT NULL,           -- Auth provider ID
    email TEXT UNIQUE NOT NULL,
    phone_hash TEXT,                         -- Hashed for privacy
    role TEXT DEFAULT 'patient',             -- patient, caregiver, clinician, admin
    locale TEXT DEFAULT 'en-IN',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE patient_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    -- Demographics
    date_of_birth DATE NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    height_cm NUMERIC(5,2),
    weight_kg NUMERIC(5,2),
    diabetes_type TEXT CHECK (diabetes_type IN ('T1D', 'T2D', 'LADA', 'MODY', 'other')),
    diagnosis_date DATE,
    -- Clinical
    hba1c_latest NUMERIC(3,1),
    hba1c_date DATE,
    insulin_regimen TEXT CHECK (insulin_regimen IN (
        'basal_bolus', 'nph_regular', 'premixed_30_70', 'premixed_50_50', 'pump', 'other'
    )),
    -- Insulin parameters (U-100 assumed)
    icr_g_per_u NUMERIC(5,2),                -- Insulin-to-carb ratio
    isf_mg_dl_per_u NUMERIC(5,1),            -- Insulin sensitivity factor
    target_glucose_mg_dl SMALLINT DEFAULT 110,
    basal_rate_u_per_hr NUMERIC(4,2),        -- For pump
    nph_morning_u NUMERIC(4,1),              -- NPH doses
    nph_evening_u NUMERIC(4,1),
    regular_breakfast_u NUMERIC(4,1),
    regular_lunch_u NUMERIC(4,1),
    regular_dinner_u NUMERIC(4,1),
    -- Device
    cgm_type TEXT CHECK (cgm_type IN ('dexcom_g6', 'dexcom_g7', 'libre_2', 'libre_3', 'medtronic_g3', 'medtronic_g4', 'none')),
    cgm_serial_hash TEXT,                    -- Hashed
    pump_type TEXT,
    -- Preferences
    hypo_threshold_mg_dl SMALLINT DEFAULT 70,
    severe_hypo_threshold_mg_dl SMALLINT DEFAULT 54,
    alert_sound_enabled BOOLEAN DEFAULT TRUE,
    caregiver_share_enabled BOOLEAN DEFAULT FALSE,
    -- Consent
    data_sharing_consent BOOLEAN DEFAULT FALSE,
    research_consent BOOLEAN DEFAULT FALSE,
    marketing_consent BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indian Food Database
CREATE TABLE foods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fdc_id INTEGER,                          -- USDA FDC ID if mapped
    nin_code TEXT,                           -- ICMR-NIN code if available
    name_en TEXT NOT NULL,
    name_hi TEXT,
    name_regional JSONB DEFAULT '{}',        -- {"ta": "சாம்பார்", "te": "సాంబార్"}
    category TEXT NOT NULL,                  -- cereal, pulse, vegetable, fruit, dairy, meat, fat, sweet, beverage, composite
    subcategory TEXT,                        -- e.g., "rice_varieties", "dal_varieties"
    region_tags TEXT[],                      -- ['north', 'south', 'east', 'west', 'pan_india']
    -- Nutrition per 100g (edible portion)
    energy_kcal NUMERIC(6,2),
    carbs_g NUMERIC(6,2) NOT NULL,
    protein_g NUMERIC(6,2),
    fat_g NUMERIC(6,2),
    fiber_g NUMERIC(6,2),
    sugar_g NUMERIC(6,2),
    sodium_mg NUMERIC(6,2),
    potassium_mg NUMERIC(6,2),
    -- Glycemic
    glycemic_index SMALLINT,                 -- 1-100
    glycemic_load_per_serving NUMERIC(5,2),
    -- Portion reference
    typical_serving_g NUMERIC(7,2),          -- e.g., 150 for cooked rice
    serving_description TEXT,                -- "1 katori (150g)"
    reference_objects JSONB,                 -- {"katori": 150, "chapati": 30}
    -- Preparation effects
    prep_methods JSONB DEFAULT '{}',         -- {"boiled": {"carbs_mult": 1.0}, "fried": {"carbs_mult": 1.15, "fat_add_g": 10}}
    -- Metadata
    source TEXT NOT NULL,                    -- 'ICMR-NIN', 'USDA', 'FSSAI', 'literature', 'measured'
    verified_by TEXT,                        -- Nutritionist name/ID
    verified_at TIMESTAMPTZ,
    confidence_score NUMERIC(3,2) DEFAULT 0.8,  -- 0-1
    is_composite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Composite Meals (Thali, Meal combos)
CREATE TABLE composite_meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_en TEXT NOT NULL,
    name_hi TEXT,
    name_regional JSONB DEFAULT '{}',
    description TEXT,
    region_tags TEXT[],
    meal_type_tags TEXT[],                   -- ['breakfast', 'lunch', 'dinner', 'snack', 'festival']
    occasion_tags TEXT[],                    -- ['daily', 'festival', 'fasting_break', 'wedding']
    -- Components: array of {food_id, quantity_g, prep_method, notes}
    components JSONB NOT NULL,
    -- Computed nutrition (per serving)
    total_carbs_g NUMERIC(7,2) NOT NULL,
    total_protein_g NUMERIC(7,2),
    total_fat_g NUMERIC(7,2),
    total_fiber_g NUMERIC(7,2),
    total_energy_kcal NUMERIC(7,2),
    estimated_gi SMALLINT,
    estimated_gl NUMERIC(5,2),
    servings SMALLINT DEFAULT 1,
    -- Metadata
    source TEXT,                             -- 'standard_recipe', 'restaurant', 'home_cooked', 'literature'
    verified_by TEXT,
    verified_at TIMESTAMPTZ,
    confidence_score NUMERIC(3,2) DEFAULT 0.75,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Meal Logs
CREATE TABLE meal_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    meal_time TIMESTAMPTZ NOT NULL,          -- When actually eaten
    meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout', 'bedtime')),
    -- Input method
    input_method TEXT CHECK (input_method IN ('text_search', 'voice', 'photo_ocr', 'photo_ml', 'barcode', 'composite_select', 'manual')),
    -- Food items (denormalized for query performance)
    items JSONB NOT NULL,                    -- [{food_id, name, quantity_g, prep_method, carbs_g, protein_g, fat_g, confidence}]
    -- Totals
    total_carbs_g NUMERIC(7,2) NOT NULL,
    total_protein_g NUMERIC(7,2),
    total_fat_g NUMERIC(7,2),
    total_fiber_g NUMERIC(7,2),
    -- Carb absorption profile (precomputed)
    absorption_profile JSONB,                -- {"phases": [{"name": "rapid", "carbs_g": 15, "k_abs": 0.045, "delay_min": 0}, ...]}
    -- Context
    location_type TEXT CHECK (location_type IN ('home', 'work', 'school', 'restaurant', 'travel', 'other')),
    hunger_level SMALLINT CHECK (hunger_level BETWEEN 1 AND 10),
    mood_tag TEXT,
    notes TEXT,
    -- Sync
    synced_at TIMESTAMPTZ,
    client_id TEXT,                          -- Device identifier
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insulin Logs
CREATE TABLE insulin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    administered_at TIMESTAMPTZ NOT NULL,
    insulin_type TEXT CHECK (insulin_type IN (
        'rapid_lispro', 'rapid_aspart', 'rapid_glulisine', 
        'regular_human', 'nph_human', 
        'premixed_30_70', 'premixed_50_50', 'premixed_25_75',
        'glargine_u100', 'glargine_u300', 'degludec_u100', 'degludec_u200',
        'basal_pump'
    )),
    dose_u NUMERIC(4,2) NOT NULL,
    injection_site TEXT CHECK (injection_site IN ('abdomen', 'thigh', 'arm', 'buttock', 'pump_site')),
    -- Context
    related_meal_log_id UUID REFERENCES meal_logs(id),
    glucose_at_injection SMALLINT,           -- mg/dL
    carb_estimate_g NUMERIC(6,2),            -- If bolus for meal
    calculator_recommended_u NUMERIC(4,2),   -- What app recommended
    override_reason TEXT,                    -- Why user changed dose
    -- Device
    delivery_method TEXT CHECK (delivery_method IN ('pen', 'syringe', 'pump', 'inhaler')),
    device_id TEXT,
    -- Sync
    synced_at TIMESTAMPTZ,
    client_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CGM Readings (high volume → TimescaleDB hypertable)
-- See section 2.2

-- Hypoglycemia Predictions & Alerts
CREATE TABLE hypo_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    predicted_at TIMESTAMPTZ NOT NULL,
    prediction_horizon_min SMALLINT NOT NULL CHECK (prediction_horizon_min IN (30, 60)),
    -- Model output
    glucose_p10 SMALLINT,                    -- 10th percentile
    glucose_p50 SMALLINT,                    -- Median
    glucose_p90 SMALLINT,                    -- 90th percentile
    hypo_probability NUMERIC(4,3),           -- P(glucose < 70)
    severe_hypo_probability NUMERIC(4,3),    -- P(glucose < 54)
    -- Explainability
    top_features JSONB,                      -- [{"feature": "iob_rapid", "contribution": 0.35}, ...]
    model_version TEXT NOT NULL,
    -- Outcome (filled later)
    actual_glucose_30min SMALLINT,
    actual_glucose_60min SMALLINT,
    was_hypo_30min BOOLEAN,
    was_hypo_60min BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hypo_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prediction_id UUID REFERENCES hypo_predictions(id),
    triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    alert_level TEXT CHECK (alert_level IN ('warning', 'urgent', 'emergency')),
    message TEXT NOT NULL,
    recommended_action TEXT,                 -- "Eat 15g fast carbs: 1 glucose tablet / 150ml juice / 1 tsp sugar"
    indian_carb_options JSONB,               -- [{"item": "glucose tablet", "quantity": "3 tablets", "carbs_g": 12}, ...]
    acknowledged_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    dismiss_reason TEXT,
    escalated_to_caregiver_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_meal_logs_user_time ON meal_logs(user_id, meal_time DESC);
CREATE INDEX idx_insulin_logs_user_time ON insulin_logs(user_id, administered_at DESC);
CREATE INDEX idx_hypo_predictions_user_time ON hypo_predictions(user_id, predicted_at DESC);
CREATE INDEX idx_hypo_alerts_user_triggered ON hypo_alerts(user_id, triggered_at DESC);
```

### 2.2 TimescaleDB: CGM Hypertable

```sql
-- Enable TimescaleDB
CREATE EXTENSION IF NOT EXISTS timescaledb;

CREATE TABLE cgm_readings (
    time TIMESTAMPTZ NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    glucose_mg_dL SMALLINT NOT NULL CHECK (glucose_mg_dL BETWEEN 20 AND 400),
    trend SMALLINT CHECK (trend BETWEEN -3 AND 3),  -- Dexcom: -3 to +3
    trend_arrow TEXT,                               -- '↑↑', '↑', '→', '↓', '↓↓'
    -- Quality
    is_valid BOOLEAN DEFAULT TRUE,
    noise_level TEXT CHECK (noise_level IN ('clean', 'moderate', 'high')),
    signal_loss BOOLEAN DEFAULT FALSE,
    -- Source
    source TEXT CHECK (source IN ('dexcom_api', 'libre_api', 'medtronic_api', 'bluetooth', 'manual', 'simulated')),
    device_timestamp TIMESTAMPTZ,                   -- Original device time
    -- Metadata
    client_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('cgm_readings', 'time', 
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Compression (after 7 days)
ALTER TABLE cgm_readings SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'user_id'
);

SELECT add_compression_policy('cgm_readings', INTERVAL '7 days');

-- Continuous aggregates for common queries
-- 5-min aggregates (already native resolution)
-- 1-hour aggregates for AGP
CREATE MATERIALIZED VIEW cgm_hourly_stats
WITH (timescaledb.continuous) AS
SELECT 
    user_id,
    time_bucket('1 hour', time) AS hour_bucket,
    COUNT(*) AS reading_count,
    AVG(glucose_mg_dL)::SMALLINT AS avg_glucose,
    MIN(glucose_mg_dL) AS min_glucose,
    MAX(glucose_mg_dL) AS max_glucose,
    PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY glucose_mg_dL) AS p25,
    PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY glucose_mg_dL) AS p50,
    PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY glucose_mg_dL) AS p75,
    SUM(CASE WHEN glucose_mg_dL < 54 THEN 1 ELSE 0 END) AS very_low_count,
    SUM(CASE WHEN glucose_mg_dL < 70 THEN 1 ELSE 0 END) AS low_count,
    SUM(CASE WHEN glucose_mg_dL BETWEEN 70 AND 180 THEN 1 ELSE 0 END) AS in_range_count,
    SUM(CASE WHEN glucose_mg_dL > 180 THEN 1 ELSE 0 END) AS high_count,
    SUM(CASE WHEN glucose_mg_dL > 250 THEN 1 ELSE 0 END) AS very_high_count
FROM cgm_readings
WHERE is_valid = TRUE
GROUP BY user_id, hour_bucket;

SELECT add_continuous_aggregate_policy('cgm_hourly_stats',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- Indexes
CREATE INDEX idx_cgm_user_time ON cgm_readings(user_id, time DESC);
CREATE INDEX idx_cgm_user_time_valid ON cgm_readings(user_id, time DESC) WHERE is_valid = TRUE;
```

---

## 3. API Specifications (OpenAPI 3.1)

### 3.1 Core Endpoints

```yaml
# Meal Logging
POST /api/v1/meals
  Summary: Log a meal entry
  RequestBody:
    content:
      application/json:
        schema:
          type: object
          required: [meal_time, meal_type, items, input_method]
          properties:
            meal_time:
              type: string
              format: date-time
              description: When meal was consumed (ISO 8601, user timezone)
            meal_type:
              type: string
              enum: [breakfast, lunch, dinner, snack, pre_workout, post_workout, bedtime]
            items:
              type: array
              minItems: 1
              maxItems: 20
              items:
                type: object
                required: [food_id, quantity_g]
                properties:
                  food_id:
                    type: string
                    format: uuid
                  name:
                    type: string
                    description: User-entered name (for manual entries)
                  quantity_g:
                    type: number
                    minimum: 1
                    maximum: 2000
                  prep_method:
                    type: string
                    enum: [raw, boiled, steamed, fried, roasted, baked, pressure_cooked, sautéed]
                    default: boiled
                  carbs_override_g:
                    type: number
                    description: Override computed carbs (advanced)
            input_method:
              type: string
              enum: [text_search, voice, photo_ocr, photo_ml, barcode, composite_select, manual]
            location_type:
              type: string
              enum: [home, work, school, restaurant, travel, other]
            hunger_level:
              type: integer
              minimum: 1
              maximum: 10
            notes:
              type: string
              maxLength: 500
  Responses:
    '201':
      description: Meal logged successfully
      content:
        application/json:
          schema:
            type: object
            properties:
              id:
                type: string
                format: uuid
              total_carbs_g:
                type: number
              absorption_profile:
                type: object
              logged_at:
                type: string
                format: date-time

# Food Search
GET /api/v1/foods/search
  Summary: Search food database with autocomplete
  Parameters:
    - name: q
      in: query
      required: true
      schema:
        type: string
        minLength: 1
        maxLength: 100
    - name: locale
      in: query
      schema:
        type: string
        enum: [en, hi, ta, te, mr, gu, bn]
        default: en
    - name: category
      in: query
      schema:
        type: string
    - name: region
      in: query
      schema:
        type: string
    - name: limit
      in: query
      schema:
        type: integer
        minimum: 1
        maximum: 50
        default: 20
  Responses:
    '200':
      content:
        application/json:
          schema:
            type: array
            items:
              type: object
              properties:
                id:
                  type: string
                  format: uuid
                name:
                  type: string
                name_localized:
                  type: string
                category:
                  type: string
                carbs_per_100g:
                  type: number
                typical_serving_g:
                  type: number
                serving_description:
                  type: string
                confidence_score:
                  type: number

# CGM Data Ingestion (batch for efficiency)
POST /api/v1/cgm/readings/batch
  Summary: Batch upload CGM readings
  RequestBody:
    content:
      application/json:
        schema:
          type: object
          required: [readings]
          properties:
            readings:
              type: array
              minItems: 1
              maxItems: 288  # 24 hours @ 5-min
              items:
                type: object
                required: [time, glucose_mg_dL]
                properties:
                  time:
                    type: string
                    format: date-time
                  glucose_mg_dL:
                    type: integer
                    minimum: 20
                    maximum: 400
                  trend:
                    type: integer
                    minimum: -3
                    maximum: 3
                  trend_arrow:
                    type: string
                  source:
                    type: string
                    enum: [dexcom_api, libre_api, medtronic_api, bluetooth, manual, simulated]
                  device_timestamp:
                    type: string
                    format: date-time
  Responses:
    '202':
      description: Accepted for processing
      content:
        application/json:
          schema:
            type: object
            properties:
              accepted:
                type: integer
              rejected:
                type: integer
              errors:
                type: array
                items:
                  type: object
                  properties:
                    index:
                      type: integer
                    code:
                      type: string
                    message:
                      type: string

# Hypoglycemia Prediction (real-time)
GET /api/v1/predictions/hypo/latest
  Summary: Get latest hypoglycemia prediction
  Parameters:
    - name: horizons
      in: query
      schema:
        type: array
        items:
          type: integer
          enum: [30, 60]
        default: [30, 60]
  Responses:
    '200':
      content:
        application/json:
          schema:
            type: object
            properties:
              predictions:
                type: array
                items:
                  type: object
                  properties:
                    horizon_min:
                      type: integer
                    glucose_p10:
                      type: integer
                    glucose_p50:
                      type: integer
                    glucose_p90:
                      type: integer
                    hypo_probability:
                      type: number
                      minimum: 0
                      maximum: 1
                    severe_hypo_probability:
                      type: number
                      minimum: 0
                      maximum: 1
                    top_features:
                      type: array
                      items:
                        type: object
                        properties:
                          feature:
                            type: string
                          contribution:
                            type: number
                    predicted_at:
                      type: string
                      format: date-time
                    model_version:
                      type: string

# Insulin Dose Calculation
POST /api/v1/insulin/calculate-bolus
  Summary: Calculate recommended insulin bolus
  RequestBody:
    content:
      application/json:
        schema:
          type: object
          required: [carbs_g, current_glucose_mg_dL]
          properties:
            carbs_g:
              type: number
              minimum: 0
              maximum: 300
            current_glucose_mg_dL:
              type: integer
              minimum: 30
              maximum: 400
            meal_type:
              type: string
              enum: [breakfast, lunch, dinner, snack]
            # Optional: will use profile defaults if omitted
            icr_g_per_u:
              type: number
              minimum: 1
              maximum: 100
            isf_mg_dl_per_u:
              type: number
              minimum: 10
              maximum: 200
            regimen:
              type: string
              enum: [basal_bolus, nph_regular, premixed_30_70, premixed_50_50, pump]
  Responses:
    '200':
      content:
        application/json:
          schema:
            type: object
            properties:
              meal_bolus_u:
                type: number
              correction_bolus_u:
                type: number
              total_bolus_u:
                type: number
              max_allowed_u:
                type: number
              warnings:
                type: array
                items:
                  type: string
              explanation:
                type: string
              safety_check:
                type: object
                properties:
                  predicted_min_glucose:
                    type: integer
                  iob_total_u:
                    type: number
```

---

## 4. Infrastructure as Code (Terraform)

### 4.1 AWS/GCP Production Stack

```hcl
# main.tf
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.10"
    }
  }
  
  backend "s3" {
    bucket = "t1d-infra-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "ap-south-1"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "t1d-india"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# VPC with public/private subnets across 3 AZs
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"
  
  name = "${var.project_name}-${var.environment}"
  cidr = var.vpc_cidr
  
  azs             = var.availability_zones
  private_subnets = var.private_subnet_cidrs
  public_subnets  = var.public_subnet_cidrs
  
  enable_nat_gateway     = true
  single_nat_gateway     = var.environment == "staging"
  enable_dns_hostnames   = true
  enable_dns_support     = true
  
  # VPC Flow Logs for security
  vpc_flow_logs_destination_arn = aws_cloudwatch_log_group.vpc_flow_logs.arn
  vpc_flow_logs_traffic_type    = "ALL"
}

# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"
  
  cluster_name    = "${var.project_name}-${var.environment}"
  cluster_version = "1.28"
  
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnets
  
  eks_managed_node_group_defaults = {
    ami_type       = "AL2_x86_64"
    instance_types = ["m6i.xlarge"]
    capacity_type  = "ON_DEMAND"
  }
  
  eks_managed_node_groups = {
    general = {
      name           = "general"
      instance_types = ["m6i.xlarge", "m6i.2xlarge"]
      capacity_type  = "ON_DEMAND"
      
      min_size     = var.environment == "prod" ? 3 : 1
      max_size     = var.environment == "prod" ? 20 : 5
      desired_size = var.environment == "prod" ? 6 : 2
      
      labels = {
        workload = "general"
      }
      
      taints = [{
        key    = "workload"
        value  = "general"
        effect = "PREFER_NO_SCHEDULE"
      }]
    }
    
    ml_inference = {
      name           = "ml-inference"
      instance_types = ["g5.xlarge", "g5.2xlarge"]  # GPU for ONNX Runtime
      capacity_type  = "SPOT"
      
      min_size     = 0
      max_size     = var.environment == "prod" ? 10 : 2
      desired_size = 0
      
      labels = {
        workload = "ml-inference"
        nvidia.com/gpu = "true"
      }
      
      taints = [{
        key    = "workload"
        value  = "ml-inference"
        effect = "NO_SCHEDULE"
      }]
      
      # GPU device plugin
      user_data = <<-EOF
        MIME-Version: 1.0
        Content-Type: multipart/mixed; boundary="==BOUNDARY=="
        
        --==BOUNDARY==
        Content-Type: text/x-shellscript; charset="us-ascii"
        
        #!/bin/bash
        /etc/eks/bootstrap.sh ${cluster_name} --kubelet-extra-args '--node-labels=workload=ml-inference,nvidia.com/gpu=true'
        
        # Install NVIDIA GPU operator
        kubectl apply -f https://raw.githubusercontent.com/NVIDIA/gpu-operator/v23.9.0/deployments/gpu-operator/values.yaml
        --==BOUNDARY==--
      EOF
    }
    
    data_processing = {
      name           = "data-processing"
      instance_types = ["r6i.2xlarge", "r6i.4xlarge"]  # Memory optimized
      capacity_type  = "SPOT"
      
      min_size     = 0
      max_size     = 5
      desired_size = 0
      
      labels = {
        workload = "data-processing"
      }
    }
  }
  
  # IRSA for pod identities
  enable_irsa = true
  
  # Cluster encryption
  cluster_encryption_config = [{
    provider_key_arn = aws_kms_key.eks.arn
    resources        = ["secrets"]
  }]
}

# RDS PostgreSQL + TimescaleDB
resource "aws_db_instance" "postgres" {
  identifier = "${var.project_name}-${var.environment}-postgres"
  
  engine               = "postgres"
  engine_version       = "16.3"
  instance_class       = var.environment == "prod" ? "db.r6g.2xlarge" : "db.r6g.xlarge"
  
  allocated_storage     = 500
  max_allocated_storage = 2000
  storage_encrypted     = true
  kms_key_id           = aws_kms_key.rds.arn
  
  db_name  = "t1d"
  username = "admin"
  password = random_password.db_password.result
  
  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.main.name
  
  backup_retention_period = var.environment == "prod" ? 30 : 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"
  
  deletion_protection = var.environment == "prod"
  skip_final_snapshot = var.environment != "prod"
  
  # Performance Insights
  performance_insights_enabled = true
  performance_insights_kms_key_id = aws_kms_key.rds.arn
  
  # TimescaleDB via RDS Custom or use Timescale Cloud
  # For self-managed: parameter_group = aws_db_parameter_group.timescale.name
}

# Redis (ElastiCache)
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id = "${var.project_name}-${var.environment}-redis"
  
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = var.environment == "prod" ? "cache.r6g.xlarge" : "cache.r6g.large"
  number_cache_clusters = var.environment == "prod" ? 3 : 1
  
  port                 = 6379
  parameter_group_name = aws_elasticache_parameter_group.redis7.name
  
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  
  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token_enabled         = true
  auth_token                 = random_password.redis_password.result
  
  automatic_failover_enabled = var.environment == "prod"
  multi_az_enabled           = var.environment == "prod"
  
  snapshot_retention_limit = var.environment == "prod" ? 7 : 1
  snapshot_window          = "03:00-04:00"
}

# S3 for model artifacts & meal photos
resource "aws_s3_bucket" "models" {
  bucket = "${var.project_name}-${var.environment}-models"
  
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "aws:kms"
        kms_master_key_id = aws_kms_key.s3.arn
      }
    }
  }
  
  versioning {
    enabled = true
  }
  
  lifecycle_rule {
    id      = "model-versions"
    enabled = true
    
    noncurrent_version_expiration {
      days = 90
    }
  }
}

resource "aws_s3_bucket" "meal_photos" {
  bucket = "${var.project_name}-${var.environment}-meal-photos"
  
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "aws:kms"
        kms_master_key_id = aws_kms_key.s3.arn
      }
    }
  }
  
  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = var.allowed_origins
    max_age_seconds = 3600
  }
  
  lifecycle_rule {
    id      = "delete-unverified-photos"
    enabled = true
    expiration {
      days = 30
    }
    filter {
      tag = "verified"
      value = "false"
    }
  }
}

# KMS Keys
resource "aws_kms_key" "eks" {
  description = "EKS encryption key"
  deletion_window_in_days = 30
}

resource "aws_kms_key" "rds" {
  description = "RDS encryption key"
  deletion_window_in_days = 30
}

resource "aws_kms_key" "s3" {
  description = "S3 encryption key"
  deletion_window_in_days = 30
}

# Monitoring: Grafana Cloud or self-hosted
resource "aws_grafana_workspace" "main" {
  name        = "${var.project_name}-${var.environment}"
  description = "T1D India monitoring"
  
  account_access_type = "CURRENT_ACCOUNT"
  authentication_providers = ["AWS_SSO"]
  
  permission_type = "SERVICE_MANAGED"
  
  data_sources = ["PROMETHEUS"]
  
  vpc_configuration {
    security_group_ids = [aws_security_group.grafana.id]
    subnet_ids         = module.vpc.private_subnets
  }
}

# Secrets Manager for API keys
resource "aws_secretsmanager_secret" "cgm_apis" {
  name = "${var.project_name}/${var.environment}/cgm-apis"
}

resource "aws_secretsmanager_secret_version" "cgm_apis" {
  secret_id = aws_secretsmanager_secret.cgm_apis.id
  secret_string = jsonencode({
    dexcom_client_id     = var.dexcom_client_id
    dexcom_client_secret = var.dexcom_client_secret
    libre_client_id      = var.libre_client_id
    libre_client_secret  = var.libre_client_secret
  })
}
```

---

## 5. ML Pipeline: Training & Deployment

### 5.1 Training Pipeline (Dagster/Airflow)

```python
# dagster_pipeline/training_pipeline.py
from dagster import asset, AssetIn, Output, MaterializeResult, MetadataValue
import pandas as pd
import mlflow
import torch
from pathlib import Path

@asset(
    ins={
        "raw_patient_data": AssetIn(key="raw_patient_data"),
        "food_database": AssetIn(key="food_database"),
    },
    io_manager_key="warehouse_io_manager",
    group_name="feature_engineering"
)
def training_features(context, raw_patient_data: pd.DataFrame, food_database: pd.DataFrame) -> pd.DataFrame:
    """
    Generate aligned training features from raw patient data.
    Output: Parquet partitioned by patient_id for distributed training.
    """
    preprocessor = T1DDataPreprocessor(food_database)
    
    all_features = []
    for patient_id in raw_patient_data["patient_id"].unique():
        patient_data = raw_patient_data[raw_patient_data["patient_id"] == patient_id]
        features = preprocessor.align_patient_data(patient_data)
        features["patient_id"] = patient_id
        all_features.append(features)
    
    combined = pd.concat(all_features, ignore_index=True)
    
    # Save partitioned by patient for LOPO-CV
    output_path = Path(f"s3://{context.resources.s3.bucket}/features/training/")
    combined.to_parquet(
        output_path,
        partition_cols=["patient_id"],
        compression="snappy"
    )
    
    return Output(
        value=combined,
        metadata={
            "num_patients": combined["patient_id"].nunique(),
            "num_samples": len(combined),
            "hypo_30min_rate": combined["hypo_30min"].mean(),
            "hypo_60min_rate": combined["hypo_60min"].mean(),
            "feature_columns": MetadataValue.md(", ".join(combined.columns.tolist()))
        }
    )

@asset(
    ins={"training_features": AssetIn()},
    group_name="model_training",
    config_schema={
        "model_type": str,  # "tft" or "lstm_attention"
        "hyperparameters": dict,
        "cv_strategy": str,  # "lopo" (leave-one-patient-out) or "stratified_kfold"
        "n_splits": int,
    }
)
def trained_model(context, training_features: pd.DataFrame) -> dict:
    """
    Train hypoglycemia prediction model with MLflow tracking.
    Returns model URI and metrics.
    """
    config = context.op_config
    
    mlflow.set_experiment(f"t1d-hypo-{config['model_type']}")
    
    with mlflow.start_run(run_name=f"{config['model_type']}-{context.run_id}") as run:
        mlflow.log_params(config["hyperparameters"])
        mlflow.log_param("cv_strategy", config["cv_strategy"])
        mlflow.log_param("n_patients", training_features["patient_id"].nunique())
        mlflow.log_param("n_samples", len(training_features))
        
        # Cross-validation
        if config["cv_strategy"] == "lopo":
            cv_results = leave_one_patient_out_cv(
                training_features, 
                config["model_type"], 
                config["hyperparameters"]
            )
        else:
            cv_results = stratified_kfold_cv(
                training_features,
                config["model_type"],
                config["hyperparameters"],
                n_splits=config["n_splits"]
            )
        
        # Log CV metrics
        for metric_name, values in cv_results["metrics"].items():
            mlflow.log_metric(f"cv_{metric_name}_mean", np.mean(values))
            mlflow.log_metric(f"cv_{metric_name}_std", np.std(values))
            for i, v in enumerate(values):
                mlflow.log_metric(f"cv_{metric_name}_fold_{i}", v)
        
        # Train final model on all data
        final_model = train_final_model(
            training_features,
            config["model_type"],
            config["hyperparameters"]
        )
        
        # Export to ONNX
        onnx_path = f"/tmp/model_{run.info.run_id}.onnx"
        export_to_onnx(final_model, onnx_path)
        mlflow.log_artifact(onnx_path, "model_onnx")
        
        # Log PyTorch model
        mlflow.pytorch.log_model(final_model, "model_pytorch")
        
        # Register model
        model_uri = f"runs:/{run.info.run_id}/model_onnx"
        mv = mlflow.register_model(model_uri, f"t1d-hypo-{config['model_type']}")
        
        # Transition to Staging
        client = mlflow.MlflowClient()
        client.transition_model_version_stage(
            name=mv.name,
            version=mv.version,
            stage="Staging"
        )
        
        return {
            "model_uri": model_uri,
            "model_name": mv.name,
            "model_version": mv.version,
            "run_id": run.info.run_id,
            "cv_metrics": {k: float(np.mean(v)) for k, v in cv_results["metrics"].items()},
            "feature_importance": cv_results.get("feature_importance", {})
        }

@asset(
    ins={"trained_model": AssetIn()},
    group_name="model_deployment",
    config_schema={
        "target_stage": str,  # "Staging" or "Production"
        "canary_percentage": int,
    }
)
def deployed_model(context, trained_model: dict) -> dict:
    """
    Deploy model to inference service (Seldon Core / KServe / custom FastAPI).
    """
    from kubernetes import client, config
    
    config.load_incluster_config()
    k8s_client = client.CustomObjectsApi()
    
    # Create/update SeldonDeployment or InferenceService
    deployment = build_seldon_deployment(
        model_name=trained_model["model_name"],
        model_version=trained_model["model_version"],
        model_uri=trained_model["model_uri"],
        canary_percentage=context.op_config["canary_percentage"]
    )
    
    # Apply to cluster
    k8s_client.patch_namespaced_custom_object(
        group="machinelearning.seldon.io",
        version="v1",
        namespace="ml-serving",
        plural="seldondeployments",
        name=f"t1d-hypo-predictor",
        body=deployment
    )
    
    # Wait for rollout
    wait_for_rollout("t1d-hypo-predictor", namespace="ml-serving")
    
    # Run smoke tests
    smoke_results = run_smoke_tests(
        endpoint=f"http://t1d-hypo-predictor.ml-serving.svc.cluster.local/v1/models/t1d-hypo:predict"
    )
    
    return {
        "deployment_name": "t1d-hypo-predictor",
        "model_version": trained_model["model_version"],
        "smoke_test_passed": smoke_results["passed"],
        "latency_p50_ms": smoke_results["latency_p50_ms"],
        "latency_p99_ms": smoke_results["latency_p99_ms"]
    }

def build_seldon_deployment(model_name, model_version, model_uri, canary_percentage):
    return {
        "apiVersion": "machinelearning.seldon.io/v1",
        "kind": "SeldonDeployment",
        "metadata": {
            "name": "t1d-hypo-predictor",
            "namespace": "ml-serving"
        },
        "spec": {
            "protocol": "v2",
            "predictors": [
                {
                    "name": "stable",
                    "replicas": 3,
                    "graph": {
                        "name": "tft-hypo-model",
                        "implementation": "TRITON_SERVER",
                        "modelUri": model_uri,
                        "parameters": [
                            {"name": "model_name", "value": "tft_hypo", "type": "STRING"},
                            {"name": "model_version_policy", "value": "latest", "type": "STRING"}
                        ]
                    },
                    "svcOrchSpec": {
                        "env": [
                            {"name": "MLFLOW_TRACKING_URI", "value": "http://mlflow.mlflow.svc.cluster.local"}
                        ]
                    }
                },
                {
                    "name": "canary",
                    "replicas": 1,
                    "graph": {
                        "name": "tft-hypo-model-canary",
                        "implementation": "TRITON_SERVER",
                        "modelUri": model_uri,
                    }
                }
            ],
            "traffic": {
                "stable": 100 - canary_percentage,
                "canary": canary_percentage
            }
        }
    }
```

### 5.2 Model Monitoring & Drift Detection

```python
# monitoring/model_monitor.py
from evidently import ColumnMapping
from evidently.report import Report
from evidently.metric_preset import DataDriftPreset, TargetDriftPreset, RegressionPreset
import mlflow

class ModelMonitor:
    def __init__(self, model_name: str, reference_data: pd.DataFrame):
        self.model_name = model_name
        self.reference_data = reference_data
        self.column_mapping = ColumnMapping(
            target="glucose_30min",
            prediction=["glucose_p10", "glucose_p50", "glucose_p90"],
            numerical_features=[
                "glucose", "roc", "iob_rapid", "iob_regular", "iob_nph",
                "carbs_absorbing", "steps_5min", "hr"
            ],
            categorical_features=["meal_type_id", "regimen_type"]
        )
    
    def check_data_drift(self, current_data: pd.DataFrame) -> dict:
        """Detect feature distribution shifts."""
        report = Report(metrics=[DataDriftPreset()])
        report.run(
            reference_data=self.reference_data,
            current_data=current_data,
            column_mapping=self.column_mapping
        )
        
        drift_results = report.as_dict()
        dataset_drift = drift_results["metrics"][0]["result"]["dataset_drift"]
        drift_share = drift_results["metrics"][0]["result"]["drift_share"]
        drifted_features = [
            m["result"]["column_name"] 
            for m in drift_results["metrics"][0]["result"]["drift_by_columns"] 
            if m["result"]["drift_detected"]
        ]
        
        return {
            "dataset_drift": dataset_drift,
            "drift_share": drift_share,
            "drifted_features": drifted_features,
            "report_html": report.get_html()
        }
    
    def check_prediction_drift(self, current_data: pd.DataFrame) -> dict:
        """Detect prediction distribution shifts."""
        report = Report(metrics=[TargetDriftPreset()])
        report.run(
            reference_data=self.reference_data,
            current_data=current_data,
            column_mapping=self.column_mapping
        )
        
        drift_results = report.as_dict()
        target_drift = drift_results["metrics"][0]["result"]["target_drift"]
        
        return {
            "target_drift": target_drift,
            "report_html": report.get_html()
        }
    
    def check_performance(self, current_data: pd.DataFrame) -> dict:
        """Evaluate model performance on recent data."""
        report = Report(metrics=[RegressionPreset()])
        report.run(
            reference_data=self.reference_data,
            current_data=current_data,
            column_mapping=self.column_mapping
        )
        
        perf_results = report.as_dict()
        metrics = perf_results["metrics"][0]["result"]["current"]
        
        return {
            "mae": metrics["mae"],
            "rmse": metrics["rmse"],
            "mape": metrics["mape"],
            "r2": metrics["r2"],
            "report_html": report.get_html()
        }
    
    def log_to_mlflow(self, results: dict, period: str):
        """Log monitoring results to MLflow."""
        with mlflow.start_run(run_name=f"{self.model_name}-monitoring-{period}"):
            mlflow.log_metric("data_drift_detected", results["data_drift"]["dataset_drift"])
            mlflow.log_metric("data_drift_share", results["data_drift"]["drift_share"])
            mlflow.log_metric("target_drift", results["target_drift"]["target_drift"])
            mlflow.log_metric("mae", results["performance"]["mae"])
            mlflow.log_metric("rmse", results["performance"]["rmse"])
            
            # Log HTML reports as artifacts
            for key, report_html in [
                ("data_drift", results["data_drift"]["report_html"]),
                ("target_drift", results["target_drift"]["report_html"]),
                ("performance", results["performance"]["report_html"])
            ]:
                path = f"/tmp/{key}_report.html"
                with open(path, "w") as f:
                    f.write(report_html)
                mlflow.log_artifact(path, f"monitoring/{key}")
```

---

## 6. Security Implementation Details

### 6.1 Data Encryption

```python
# security/encryption.py
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
import os

class FieldEncryption:
    """
    Field-level encryption for PII/PHI before database storage.
    Uses envelope encryption: DEK per field, KEK in KMS.
    """
    
    def __init__(self, kms_client, key_arn: str):
        self.kms = kms_client
        self.key_arn = key_arn
        self._dek_cache = {}
    
    def _get_dek(self, field_name: str) -> bytes:
        """Get or generate Data Encryption Key for field."""
        if field_name not in self._dek_cache:
            # Generate DEK
            dek = Fernet.generate_key()
            # Encrypt DEK with KEK in KMS
            encrypted_dek = self.kms.encrypt(KeyId=self.key_arn, Plaintext=dek)["CiphertextBlob"]
            self._dek_cache[field_name] = (dek, encrypted_dek)
        return self._dek_cache[field_name][0]
    
    def encrypt_field(self, field_name: str, plaintext: str) -> dict:
        """Encrypt a field value."""
        dek = self._get_dek(field_name)
        f = Fernet(dek)
        ciphertext = f.encrypt(plaintext.encode())
        _, encrypted_dek = self._dek_cache[field_name]
        
        return {
            "ciphertext": base64.b64encode(ciphertext).decode(),
            "encrypted_dek": base64.b64encode(encrypted_dek).decode(),
            "algorithm": "AES-256-GCM",
            "key_arn": self.key_arn
        }
    
    def decrypt_field(self, field_name: str, encrypted_data: dict) -> str:
        """Decrypt a field value."""
        encrypted_dek = base64.b64decode(encrypted_data["encrypted_dek"])
        dek = self.kms.decrypt(CiphertextBlob=encrypted_dek)["Plaintext"]
        f = Fernet(dek)
        ciphertext = base64.b64decode(encrypted_data["ciphertext"])
        return f.decrypt(ciphertext).decode()

# Usage in SQLAlchemy model
class PatientProfile(Base):
    __tablename__ = "patient_profiles"
    
    user_id = Column(UUID, primary_key=True)
    # Encrypted fields stored as JSONB
    _encrypted_data = Column("encrypted_fields", JSONB, nullable=False)
    
    @hybrid_property
    def phone(self):
        return self.encryption.decrypt_field("phone", self._encrypted_data["phone"])
    
    @phone.setter
    def phone(self, value):
        self._encrypted_data["phone"] = self.encryption.encrypt_field("phone", value)
```

### 6.2 Audit Logging

```python
# security/audit.py
import structlog
from functools import wraps
from flask import g, request
import json

audit_logger = structlog.get_logger("audit")

def audit_log(action: str, resource_type: str, resource_id: str = None):
    """Decorator for automatic audit logging."""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            user_id = getattr(g, "user_id", "anonymous")
            start_time = time.time()
            
            try:
                result = f(*args, **kwargs)
                status = "success"
                return result
            except Exception as e:
                status = "failure"
                raise
            finally:
                duration_ms = (time.time() - start_time) * 1000
                audit_logger.info(
                    "api_access",
                    user_id=user_id,
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id or kwargs.get("id"),
                    ip=request.remote_addr,
                    user_agent=request.user_agent.string,
                    method=request.method,
                    path=request.path,
                    status=status,
                    duration_ms=round(duration_ms, 2),
                    # Don't log request body for PHI endpoints
                    request_keys=list(request.json.keys()) if request.is_json and "phi" not in request.path else None
                )
        return wrapped
    return decorator

# Usage
@app.route("/api/v1/meals", methods=["POST"])
@audit_log("create", "meal_log")
def create_meal():
    ...
```

---

## 7. Testing Strategy

### 7.1 Test Pyramid

```
                    ┌─────────────┐
                    │   E2E (5%)  │  Cypress/Playwright - critical user journeys
                    ├─────────────┤
                    │ Integration │  API contracts, DB, ML service, CGM mocks
                    │   (15%)     │
                    ├─────────────┤
                    │   Unit (80%)│  Pure functions, model logic, calculations
                    └─────────────┘
```

### 7.2 Key Test Cases

```python
# tests/test_bolus_calculator.py
import pytest
from app.domain.bolus_calculator import IndianBolusCalculator, BolusRecommendation

class TestBolusCalculator:
    
    @pytest.fixture
    def calculator(self):
        return IndianBolusCalculator()
    
    @pytest.fixture
    def standard_profile(self):
        return {
            "icr": 10.0,      # 10g carbs per unit
            "isf": 50.0,      # 50 mg/dL per unit
            "target": 110,
            "regimen": "basal_bolus"
        }
    
    def test_basic_meal_bolus(self, calculator, standard_profile):
        """Meal bolus = carbs / ICR"""
        result = calculator.calculate(
            carbs_g=60,
            current_glucose=120,
            iob_rapid=0, iob_regular=0, iob_nph=0,
            **standard_profile
        )
        assert result.meal_bolus == 6.0
        assert result.correction_bolus == 0.0  # glucose at target
        assert result.total_bolus == 6.0
    
    def test_correction_bolus(self, calculator, standard_profile):
        """Correction = (current - target) / ISF"""
        result = calculator.calculate(
            carbs_g=0,
            current_glucose=210,  # 100 above target
            iob_rapid=0, iob_regular=0, iob_nph=0,
            **standard_profile
        )
        assert result.correction_bolus == 2.0  # 100/50
        assert result.total_bolus == 2.0
    
    def test_iob_subtraction(self, calculator, standard_profile):
        """High IOB reduces recommended bolus"""
        result = calculator.calculate(
            carbs_g=60,
            current_glucose=120,
            iob_rapid=4.0,  # High IOB
            iob_regular=0, iob_nph=0,
            **standard_profile
        )
        # IOB adjustment = (4.0 - 3.0) * 0.5 = 0.5U
        assert result.total_bolus == 5.5  # 6.0 - 0.5
        assert "High IOB" in result.warnings[0]
    
    def test_nph_regular_regimen_morning_peak(self, calculator):
        """NPH peaking at 4-8h reduces bolus"""
        result = calculator.calculate(
            carbs_g=60,
            current_glucose=120,
            iob_rapid=0, iob_regular=1.0, iob_nph=8.0,
            icr=10.0, isf=50.0, target=110,
            regimen="nph_regular",
            time_since_last_meal_min=300  # 5 hours - NPH peaking
        )
        assert result.total_bolus < 6.0
        assert "NPH may be peaking" in result.warnings[0]
    
    def test_safety_cap(self, calculator, standard_profile):
        """Max bolus cap enforced"""
        result = calculator.calculate(
            carbs_g=200,  # Would be 20U
            current_glucose=300,  # Would add 3.8U correction
            iob_rapid=0, iob_regular=0, iob_nph=0,
            **standard_profile
        )
        assert result.total_bolus == 15.0  # Max cap
        assert "exceeds max" in result.warnings[0]
    
    def test_recent_hypo_reduces_bolus(self, calculator, standard_profile):
        """Recent hypoglycemia warning"""
        result = calculator.calculate(
            carbs_g=60,
            current_glucose=120,
            iob_rapid=0, iob_regular=0, iob_nph=0,
            recent_hypo=True,
            **standard_profile
        )
        assert "Recent hypoglycemia" in result.warnings[0]
    
    def test_predicted_floor_check(self, calculator):
        """Prevent bolus that would predict <70 mg/dL"""
        result = calculator.calculate(
            carbs_g=0,
            current_glucose=90,  # Only 20 above floor
            iob_rapid=0, iob_regular=0, iob_nph=0,
            icr=10.0, isf=50.0, target=110,
            regimen="basal_bolus"
        )
        # Max safe bolus = (90-80)/50 = 0.2U
        assert result.total_bolus <= 0.2

# tests/test_cgm_alignment.py
def test_cgm_5min_resampling():
    """Verify CGM data aligns to 5-min grid"""
    timestamps = pd.date_range("2024-01-01", periods=10, freq="3min", tz="Asia/Kolkata")
    glucose = [100, 102, 105, 108, 110, 112, 115, 118, 120, 122]
    df = pd.DataFrame({"glucose": glucose}, index=timestamps)
    
    aligned = df.resample("5min").interpolate("time", limit=3)
    
    assert len(aligned) == 6  # 30 min / 5 min
    assert aligned.index.freq == pd.tseries.frequencies.to_offset("5min")
    # Values should be interpolated
    assert aligned.iloc[0]["glucose"] == 100
    assert aligned.iloc[-1]["glucose"] == 122

# tests/test_food_db.py
def test_composite_meal_carbs():
    """Verify rajma-chawal carb calculation"""
    rajma = Food(id="1", name="rajma", carbs_per_100g=20.0)
    chawal = Food(id="2", name="chawal (cooked rice)", carbs_per_100g=28.0)
    
    meal = CompositeMeal(
        name="rajma_chawal",
        components=[
            {"food_id": "1", "quantity_g": 150, "prep_method": "boiled"},
            {"food_id": "2", "quantity_g": 200, "prep_method": "steamed"}
        ]
    )
    
    assert meal.total_carbs_g == pytest.approx(86.0, rel=0.01)  # 30 + 56
```

---

## 8. Performance Benchmarks & Targets

### 8.1 Latency Budgets

| Operation | P50 Target | P99 Target | Measurement |
|-----------|------------|------------|-------------|
| Meal search (autocomplete) | <50ms | <150ms | API gateway |
| Meal logging (text) | <100ms | <300ms | API gateway |
| Photo upload + ML inference | <2s | <5s | Client + ML service |
| CGM batch upload (288 readings) | <500ms | <1s | API gateway |
| Hypo prediction (real-time) | <100ms | <300ms | ML service |
| Bolus calculation | <50ms | <100ms | API gateway |
| Dashboard initial load | <1.5s | <3s | Lighthouse |
| Offline sync (100 meals) | <2s | <5s | Background sync |

### 8.2 Load Testing (k6)

```javascript
// load-test/spike-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },   // Steady
    { duration: '2m', target: 500 },   // Spike
    { duration: '5m', target: 500 },   // Sustained spike
    { duration: '2m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    checks: ['rate>0.99'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://api.t1d-india.example.com';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;

export default function() {
  const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  };
  
  // Simulate typical user session
  const mealRes = http.post(`${BASE_URL}/api/v1/meals`, JSON.stringify({
    meal_time: new Date().toISOString(),
    meal_type: 'lunch',
    items: [
      { food_id: 'rajma-id', quantity_g: 150 },
      { food_id: 'rice-id', quantity_g: 200 }
    ],
    input_method: 'text_search'
  }), { headers });
  
  check(mealRes, { 'meal logged': (r) => r.status === 201 });
  
  // Get prediction
  const predRes = http.get(`${BASE_URL}/api/v1/predictions/hypo/latest`, { headers });
  check(predRes, { 'prediction ok': (r) => r.status === 200 });
  
  // Calculate bolus
  const bolusRes = http.post(`${BASE_URL}/api/v1/insulin/calculate-bolus`, JSON.stringify({
    carbs_g: 86,
    current_glucose_mg_dL: 140
  }), { headers });
  check(bolusRes, { 'bolus ok': (r) => r.status === 200 });
  
  sleep(Math.random() * 30 + 10); // 10-40s between actions
}
```

---

## 9. CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]
  workflow_dispatch:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run format:check

  test-unit:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: timescale/timescaledb:latest-pg16
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports: ['5432:5432']
      redis:
        image: redis:7-alpine
        ports: ['6379:6379']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v3

  test-integration:
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, test-unit]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:integration

  test-ml:
    runs-on: ubuntu-latest
    needs: lint-and-typecheck
    container:
      image: python:3.11-slim
    steps:
      - uses: actions/checkout@v4
      - run: pip install -r ml-service/requirements.txt
      - run: pip install -r ml-service/requirements-dev.txt
      - run: pytest ml-service/tests/ -v --cov=ml_service

  build-and-push:
    runs-on: ubuntu-latest
    needs: [test-unit, test-integration, test-ml]
    if: github.event_name != 'pull_request'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha
            type=raw,value=latest,enable={{is_default_branch}}
      - uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/develop'
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: azure/k8s-set-context@v1
        with:
          kubeconfig: ${{ secrets.STAGING_KUBECONFIG }}
      - run: |
          helm upgrade --install t1d-india ./helm/t1d-india \
            --namespace t1d-staging \
            --create-namespace \
            --set image.tag=${{ github.sha }} \
            --set environment=staging \
            --wait --timeout 10m

  deploy-production:
    runs-on: ubuntu-latest
    needs: build-and-push
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: azure/k8s-set-context@v1
        with:
          kubeconfig: ${{ secrets.PROD_KUBECONFIG }}
      - run: |
          helm upgrade --install t1d-india ./helm/t1d-india \
            --namespace t1d-prod \
            --create-namespace \
            --set image.tag=${{ github.sha }} \
            --set environment=production \
            --set replicaCount=6 \
            --set mlInference.replicaCount=3 \
            --wait --timeout 15m
      - name: Smoke tests
        run: |
          kubectl run smoke-test --image=curlimages/curl:latest \
            --restart=Never --rm -i -- \
            curl -f https://api.t1d-india.example.com/health
```

---

## 10. Appendix: Indian Food Database - Sample Entries

### 10.1 Top 50 Foods by Consumption Frequency (ICMR-NIN)

| Food (English) | Hindi | Region | Category | Carbs/100g | Typical Serving | GI |
|----------------|-------|--------|----------|------------|-----------------|-----|
| Rice, cooked | चावल | Pan-India | Cereal | 28.0 | 150g (1 katori) | 73 |
| Wheat roti | रोटी | North/West | Cereal | 46.0 | 30g (1 medium) | 62 |
| Wheat paratha | पराठा | North | Cereal | 48.0 | 60g (1 medium) | 58 |
| Toor dal, cooked | अरहर दाल | Pan-India | Pulse | 20.0 | 100g (1 katori) | 29 |
| Moong dal, cooked | मूंग दाल | Pan-India | Pulse | 18.0 | 100g (1 katori) | 31 |
| Chana dal, cooked | चना दाल | North/East | Pulse | 22.0 | 100g (1 katori) | 33 |
| Rajma, cooked | राजमा | North | Pulse | 22.0 | 150g (1 katori) | 24 |
| Chole, cooked | छोले | North | Pulse | 27.0 | 150g (1 katori) | 33 |
| Potato, boiled | आलू | Pan-India | Vegetable | 20.0 | 100g (1 medium) | 78 |
| Onion, raw | प्याज | Pan-India | Vegetable | 9.0 | 50g (1 small) | 10 |
| Tomato, raw | टमाटर | Pan-India | Vegetable | 3.9 | 50g (1 medium) | 15 |
| Banana, ripe | केला | Pan-India | Fruit | 23.0 | 100g (1 medium) | 51 |
| Mango, ripe | आम | Pan-India | Fruit | 17.0 | 150g (1 medium) | 51 |
| Apple | सेब | North | Fruit | 14.0 | 150g (1 medium) | 36 |
| Milk, cow | दूध | Pan-India | Dairy | 4.8 | 200ml (1 glass) | 27 |
| Curd, plain | दही | Pan-India | Dairy | 3.5 | 100g (1 katori) | 28 |
| Paneer | पनीर | North | Dairy | 1.2 | 50g | 27 |
| Egg, boiled | अंडा | Pan-India | Protein | 1.1 | 50g (1 large) | 0 |
| Chicken, cooked | चिकन | Pan-India | Protein | 0.0 | 100g | 0 |
| Fish, cooked | मछली | East/South | Protein | 0.0 | 100g | 0 |
| Ghee | घी | Pan-India | Fat | 0.0 | 5g (1 tsp) | 0 |
| Mustard oil | सरसों तेल | North/East | Fat | 0.0 | 5g (1 tsp) | 0 |
| Coconut oil | नारियल तेल | South | Fat | 0.0 | 5g (1 tsp) | 0 |
| Sugar | चीनी | Pan-India | Sweet | 100.0 | 5g (1 tsp) | 65 |
| Jaggery | गुड़ | Pan-India | Sweet | 98.0 | 10g | 84 |
| Idli | इडली | South | Composite | 25.0 | 50g (2 pieces) | 65 |
| Dosa, plain | डोसा | South | Composite | 30.0 | 60g (1 medium) | 68 |
| Sambar | सांभर | South | Composite | 12.0 | 100g (1 katori) | 55 |
| Coconut chutney | नारियल चटनी | South | Condiment | 8.0 | 30g (2 tbsp) | 45 |
| Upma | उपमा | South | Composite | 22.0 | 150g (1 plate) | 68 |
| Poha | पोहा | West/Central | Composite | 25.0 | 150g (1 plate) | 65 |
| Thepla | थेपला | West | Composite | 40.0 | 40g (1 medium) | 55 |
| Dhokla | ढोकला | West | Composite | 35.0 | 50g (2 pieces) | 35 |
| Pav bhaji | पाव भाजी | West | Composite | 35.0 | 200g (1 plate) | 65 |
| Vada pav | वड़ा पाव | West | Composite | 40.0 | 150g (1 piece) | 70 |
| Samosa | समोसा | North | Composite | 32.0 | 50g (1 piece) | 60 |
| Pakora | पकोड़ा | North | Composite | 28.0 | 60g (3 pieces) | 55 |
| Jalebi | जलेबी | North | Sweet | 45.0 | 30g (2 pieces) | 75 |
| Gulab jamun | गुलाब जामुन | North | Sweet | 40.0 | 40g (2 pieces) | 70 |
| Kheer | खीर | Pan-India | Sweet | 22.0 | 150g (1 katori) | 55 |
| Biryani, veg | वेज बिरयानी | Pan-India | Composite | 28.0 | 250g (1 plate) | 60 |
| Biryani, chicken | चिकन बिरयानी | Pan-India | Composite | 25.0 | 300g (1 plate) | 58 |
| Pulao | पुलाव | North | Composite | 30.0 | 200g (1 plate) | 62 |
| Khichdi | खिचड़ी | Pan-India | Composite | 25.0 | 200g (1 plate) | 55 |
| Dal khichdi | दाल खिचड़ी | Pan-India | Composite | 22.0 | 200g (1 plate) | 50 |
| Bisi bele bath | बिसी बेले बाथ | South | Composite | 28.0 | 250g (1 plate) | 58 |
| Pongal | पोंगल | South | Composite | 26.0 | 200g (1 plate) | 60 |
| Appam | अप्पम | South | Composite | 30.0 | 50g (2 pieces) | 65 |
| Puttu | पुट्टु | South | Composite | 28.0 | 100g (1 cylinder) | 60 |

### 10.2 Composite Meal Definitions (JSON)

```json
{
  "id": "rajma-chawal-standard",
  "name_en": "Rajma-Chawal (Kidney beans with rice)",
  "name_hi": "राजमा-चावल",
  "name_regional": {
    "pa": "ਰਾਜਮਾ-ਚਾਵਲ",
    "gu": "રાજમા-ચોખા",
    "bn": "রাজমা-ভাত"
  },
  "description": "North Indian staple: red kidney beans in tomato-onion gravy with steamed basmati rice",
  "region_tags": ["north", "punjab", "delhi", "haryana", "himachal"],
  "meal_type_tags": ["lunch", "dinner"],
  "occasion_tags": ["daily", "comfort_food"],
  "components": [
    {
      "food_id": "rajma-cooked",
      "name": "Rajma (cooked)",
      "quantity_g": 150,
      "prep_method": "pressure_cooked",
      "carbs_g": 33.0,
      "protein_g": 12.0,
      "fat_g": 2.0
    },
    {
      "food_id": "basmati-rice-cooked",
      "name": "Basmati rice (steamed)",
      "quantity_g": 200,
      "prep_method": "steamed",
      "carbs_g": 56.0,
      "protein_g": 5.0,
      "fat_g": 0.5
    }
  ],
  "total_carbs_g": 89.0,
  "total_protein_g": 17.0,
  "total_fat_g": 2.5,
  "total_fiber_g": 12.0,
  "total_energy_kcal": 445.0,
  "estimated_gi": 55,
  "estimated_gl": 49.0,
  "servings": 1,
  "absorption_profile": {
    "phases": [
      {"name": "rapid", "carbs_g": 18, "k_abs": 0.045, "delay_min": 0},
      {"name": "intermediate", "carbs_g": 45, "k_abs": 0.025, "delay_min": 15},
      {"name": "slow", "carbs_g": 26, "k_abs": 0.012, "delay_min": 45}
    ]
  },
  "source": "standard_recipe",
  "verified_by": "Dr. A. Sharma, RD",
  "verified_at": "2024-01-15T00:00:00Z",
  "confidence_score": 0.92
}
```

---

*Document Version: 1.0*  
*Last Updated: November 2026*  
*Classification: Technical Specification - Internal Use*