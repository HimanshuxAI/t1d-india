# AI-Powered Hypoglycemia Prediction and Carb-Counting Tool for Indian T1D Diets
## Implementation Plan

---

## 1. Executive Summary

This document outlines a comprehensive implementation plan for a top-tier web application that addresses the critical gap in Type 1 Diabetes (T1D) management tools for Indian users. The application will combine **hypoglycemia prediction** using deep learning models trained on Indian dietary patterns with **accurate carb-counting** for Indian meals, plus **insulin dose calculation** tailored to Indian insulin regimens (NPH + Regular insulin).

**Target Outcome**: A production-ready, clinically validated web application that a medical professional would confidently recommend to T1D patients in India.

---

## 2. Technical Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT LAYER                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  React/Next.js PWA                                                          │
│  ├── Meal Logger (camera + text + voice)                                    │
│  ├── CGM Dashboard (real-time glucose visualization)                        │
│  ├── Insulin Calculator (bolus + basal)                                     │
│  ├── Hypo Alert Panel (30/60 min predictions)                               │
│  └── Offline-First Sync (IndexedDB + Service Workers)                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            API GATEWAY (Kong/AWS API Gateway)               │
├─────────────────────────────────────────────────────────────────────────────┤
│  Rate Limiting │ Auth (JWT + Refresh Tokens) │ Request Validation          │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
        ┌───────────────┬───────────────┬───────────────┬───────────────┐
        ▼               ▼               ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  Meal API     │ │  CGM API      │ │  ML Inference │ │  User API     │ │  Sync API     │
│  (Node/Go)    │ │  (Node/Go)    │ │  (Python)     │ │  (Node/Go)    │ │  (Node/Go)    │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
        │               │               │               │               │
        ▼               ▼               ▼               ▼               ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ PostgreSQL    │ │ TimescaleDB   │ │ Model Registry│ │ PostgreSQL    │ │ Redis +       │
│ (meals, users)│ │ (CGM time-    │ │ (MLflow/S3)   │ │ (profiles,    │ │ Message Queue │
│               │ │  series data) │ │               │ │  insulin logs)│ │ (BullMQ)      │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Justification |
|-------|------------|---------------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS | SSR for SEO, PWA support, excellent DX |
| **State Management** | Zustand + React Query (TanStack Query) | Lightweight, server-state optimized |
| **Backend API** | Node.js (Fastify) or Go (Gin) | High performance, TypeScript/Go type safety |
| **ML Inference** | Python (FastAPI) + ONNX Runtime | Model serving, hardware acceleration |
| **Time-Series DB** | TimescaleDB (PostgreSQL extension) | Native CGM data optimization |
| **Relational DB** | PostgreSQL 16 | ACID, JSONB for flexible meal data |
| **Cache/Queue** | Redis 7 + BullMQ | Session cache, background jobs |
| **Auth** | Clerk or Auth0 (HIPAA-compliant) | Offload auth complexity, MFA, SOC2 |
| **File Storage** | S3-compatible (MinIO for local) | Meal photos, model artifacts |
| **Monitoring** | Grafana + Prometheus + Sentry | Full observability stack |
| **CI/CD** | GitHub Actions + ArgoCD | GitOps deployment |
| **Infrastructure** | Kubernetes (EKS/GKE) or Railway/Render | Scalable, production-grade |

---

## 3. Core Features & Implementation Phases

### Phase 1: Foundation (Weeks 1-4)

#### 3.1.1 Project Setup & DevOps
- [ ] Monorepo setup (Nx or Turborepo) with apps: `web`, `api`, `ml-service`
- [ ] CI/CD pipeline: lint, type-check, test, build, deploy preview
- [ ] Infrastructure as Code (Terraform/Pulumi) for staging/production
- [ ] Database schema design + migrations (Prisma/Drizzle ORM)
- [ ] Authentication integration (Clerk/Auth0) with role-based access
- [ ] Error tracking (Sentry) + logging (Pino/Winston) + metrics (Prometheus)

#### 3.1.2 Indian Food Database Construction
- [ ] **Data Sources**:
  - ICMR-NIN "Nutritive Value of Indian Foods" (primary reference)
  - USDA FoodData Central (for cross-reference)
  - FSSAI food composition databases
  - Published literature on Indian meal carbohydrate content
- [ ] **Database Schema**:
  ```sql
  foods (
    id, name_en, name_hi, name_regional[], category,
    serving_size_g, carbs_per_100g, protein_per_100g, fat_per_100g,
    glycemic_index, glycemic_load, source, verified_by, created_at
  )
  
  meals (
    id, name, description, region[], meal_type[],  -- breakfast/lunch/dinner/snack
    components: jsonb[]  -- [{food_id, quantity_g, prep_method}]
  )
  
  recipes (
    id, name, ingredients: jsonb[], instructions, 
    total_carbs, servings, region[], tags[]
  )
  ```
- [ ] **Target**: 500+ verified Indian foods, 100+ composite meals (thali, dosa-sambar, rajma-chawal, etc.)
- [ ] **Validation**: Cross-reference with 3+ sources; nutritionist review for top 100 items

#### 3.1.3 Meal Logging Interface (MVP)
- [ ] Text-based search with autocomplete (Indian + English names)
- [ ] Photo capture → OCR (Tesseract.js client-side + server-side fallback)
- [ ] Voice input (Web Speech API) for Hindi/English/Hinglish
- [ ] Portion estimation: reference objects (katori, chapati, spoon) + ML-assisted
- [ ] Composite meal builder: "dal-chawal-sabzi-roti" as single entry

---

### Phase 2: ML Models (Weeks 5-10)

#### 3.2.1 Hypoglycemia Prediction Model

**Data Requirements**:
- CGM time-series (5-min intervals): glucose, trend arrow, IOB (insulin on board)
- Meal logs: carbs, protein, fat, timestamp, meal type
- Insulin logs: type (NPH/Regular/Rapid), dose, timestamp, site
- Activity: steps, heart rate (optional, from phone/wearable)
- Demographics: age, weight, diabetes duration, insulin regimen

**Model Architecture**:
```
Input Features (30-min lookback window @ 5-min intervals = 6 time steps):
├── CGM: glucose_t, glucose_t-1...glucose_t-5, rate_of_change
├── Insulin: IOB_rapid, IOB_regular, IOB_nph (pharmacokinetic models)
├── Meal: carbs_absorbed_t, carbs_absorbed_t-1... (absorption curves)
├── Activity: steps_5min, hr_avg_5min
└── Static: age, weight, insulin_sensitivity_factor, carb_ratio

Architecture: Temporal Fusion Transformer (TFT) or LSTM-Attention Hybrid
├── Variable Selection Networks (feature importance)
├── Gated Residual Networks (non-linear processing)
├── Multi-head Attention (temporal dependencies)
└── Quantile Regression Head (predict P10, P50, P90 at 30/60 min)

Targets:
├── Binary: hypo_30min (<70 mg/dL), hypo_60min
├── Regression: glucose_30min, glucose_60min
└── Classification: severe_hypo_30min (<54 mg/dL)
```

**Training Pipeline**:
- [ ] Data preprocessing: alignment, missing value imputation, normalization
- [ ] Pharmacokinetic modeling for NPH/Regular insulin (critical differentiator)
- [ ] Carb absorption curves for Indian meals (different from Western)
- [ ] Train/val/test split: patient-wise (no data leakage)
- [ ] Cross-validation: leave-one-patient-out
- [ ] Metrics: Sensitivity @ 90% Specificity, AUROC, Brier Score, Calibration plots
- [ ] Target: >91% sensitivity at 30-min horizon (matching JMIR 2024 benchmark)
- [ ] Model export: ONNX for edge/inference optimization

**Indian-Specific Adaptations**:
- NPH + Regular insulin pharmacokinetics (peak at 4-12h vs rapid-acting 1-2h)
- Meal timing patterns: early lunch (12-1pm), late dinner (9-10pm)
- High-carb meals: typical Indian lunch 80-120g carbs vs Western 40-60g
- Dawn phenomenon patterns in Indian population
- Festival/occasion eating patterns (fasting + feasting)

#### 3.2.2 Carb Estimation Model (Food Vision)

**Approach**: Multi-task learning
- [ ] Food classification (Indian dishes): 200+ classes
- [ ] Portion estimation: regression (grams)
- [ ] Carb prediction: regression (grams) - end-to-end or two-stage

**Data Strategy**:
- [ ] Synthetic data generation: 3D food models + domain randomization
- [ ] Real data collection: user-contributed photos (with consent)
- [ ] Transfer learning: Food-101, Nutrition5k → fine-tune on Indian dishes
- [ ] Target: ±15g carb accuracy for composite meals

#### 3.2.3 Insulin Dose Calculator

**Algorithms**:
- [ ] Bolus calculator: `(Carbs / ICR) + (Current_Glucose - Target) / ISF - IOB`
- [ ] Basal calculator: NPH dosing schedules (split-dose, bedtime)
- [ ] Correction factor adjustments for Indian insulin types
- [ ] Safety bounds: max bolus, min glucose thresholds
- [ ] Regimen support: 
  - Basal-bolus (rapid + long-acting)
  - NPH + Regular (2-3 injections/day)
  - Premixed (30/70, 50/50)
  - Pump therapy (future)

---

### Phase 3: Core Application (Weeks 11-18)

#### 3.3.1 Real-Time CGM Dashboard
- [ ] Dexcom G6/G7, Libre 2/3, Medtronic Guardian integration (API/SDK)
- [ ] Local Bluetooth fallback (Web Bluetooth API) for offline use
- [ ] Visualization: AGP report, glucose trend, time-in-range (70-180 mg/dL)
- [ ] Alert system: predictive (ML), threshold, rate-of-change, signal loss
- [ ] Data export: PDF reports for clinician visits

#### 3.3.2 Insulin Dose Calculator UI
- [ ] Step-by-step wizard: meal → carbs → current glucose → IOB → recommendation
- [ ] Regimen selector with visual insulin action curves
- [ ] History: past doses, outcomes (glucose at 2h post-meal)
- [ ] Smart suggestions: "Last time you ate rajma-chawal, you took 6U"

#### 3.3.3 Hypoglycemia Alert System
- [ ] Push notifications (Firebase/OneSignal) + in-app banner
- [ ] Escalation: 30-min warning → 15-min urgent → emergency contact
- [ ] Actionable guidance: "Eat 15g fast carbs now" with Indian options (glucose tablets, juice, sugar)
- [ ] Snooze/dismiss with reason logging (false alarm tracking)

#### 3.3.4 Offline-First Architecture
- [ ] Service Worker: cache shell + API responses
- [ ] IndexedDB: meal logs, CGM buffer, insulin logs (sync on reconnect)
- [ ] Background sync: queue mutations, retry with exponential backoff
- [ ] Conflict resolution: last-write-wins with server timestamp

---

### Phase 4: Polish & Clinical Validation (Weeks 19-26)

#### 3.4.1 Clinical Validation Study Design
- [ ] IRB/EC approval (partner with Indian hospital: AIIMS, PGIMER, etc.)
- [ ] Study protocol: prospective, single-arm, 50 T1D participants, 12 weeks
- [ ] Primary endpoint: % time <70 mg/dL reduction vs baseline
- [ ] Secondary: hypoglycemia events, HbA1c, user satisfaction (SUS score)
- [ ] Data sharing agreement + informed consent (HIPAA/India DPDP Act)

#### 3.4.2 Accessibility & Localization
- [ ] WCAG 2.1 AA compliance
- [ ] Languages: English, Hindi, Tamil, Telugu, Marathi, Gujarati, Bengali
- [ ] RTL support (Urdu - future)
- [ ] VoiceOver/TalkBack optimization
- [ ] High contrast mode, large text scaling

#### 3.4.3 Performance Optimization
- [ ] Core Web Vitals: LCP <2.5s, INP <200ms, CLS <0.1
- [ ] Bundle analysis: code splitting, tree shaking
- [ ] Image optimization: WebP/AVIF, responsive images
- [ ] ML inference: ONNX Runtime Web (client-side) + server fallback
- [ ] Database: query optimization, connection pooling, read replicas

#### 3.4.4 Security & Compliance
- [ ] Data encryption: at rest (AES-256), in transit (TLS 1.3)
- [ ] Audit logging: all PHI access
- [ ] Penetration testing (OWASP Top 10)
- [ ] DPDP Act 2023 compliance (India)
- [ ] HIPAA-aligned practices (for future US expansion)
- [ ] Data retention/deletion policies

---

## 4. Data Strategy & Privacy

### 4.1 Data Collection Principles
- **Minimal necessary**: Only collect what's needed for core features
- **On-device first**: ML inference on phone where possible
- **Explicit consent**: Granular permissions per data type
- **User ownership**: Export/delete anytime (GDPR/DPDP style)

### 4.2 Synthetic Data Generation (for ML training)
- [ ] CGM simulators: UVA/Padova T1D Simulator (FDA accepted)
- [ ] Indian meal simulation: carb absorption curves from literature
- [ ] Insulin PK/PD: validated models for NPH, Regular, rapid-acting
- [ ] Population variability: virtual patient cohorts (n=1000+)

### 4.3 Federated Learning (Future)
- [ ] Local model updates on device
- [ ] Secure aggregation server
- [ ] Differential privacy for model updates
- [ ] Enables continuous learning without data leaving device

---

## 5. Team Structure & Roles

| Role | Count | Key Responsibilities |
|------|-------|---------------------|
| **Tech Lead / Architect** | 1 | Architecture, code review, technical decisions |
| **Full-Stack Engineers** | 3 | Web app, API, database, auth, testing |
| **ML Engineers** | 2 | Model training, deployment, monitoring, data pipeline |
| **Mobile/PWA Specialist** | 1 | Offline-first, push notifications, native features |
| **UX/UI Designer** | 1 | User research, prototyping, accessibility, design system |
| **Clinical Advisor (Part-time)** | 1 | Medical validation, safety review, study design |
| **Nutritionist (Part-time)** | 1 | Food database verification, meal guidance |
| **DevOps/Platform Engineer** | 1 | Infrastructure, CI/CD, monitoring, security |
| **QA/Test Engineer** | 1 | E2E testing, accessibility testing, test automation |

---

## 6. Timeline Summary (26 Weeks / ~6 Months)

```
Weeks 1-4   ████████████░░░░░░░░░░░░░░░░░░░░  Foundation & Food DB
Weeks 5-10  ░░░░░░░░░░████████████████████  ML Models (Hypo + Carb + Insulin)
Weeks 11-18 ░░░░░░░░░░░░░░░░░░████████████  Core App Features
Weeks 19-26 ░░░░░░░░░░░░░░░░░░░░░░░░░░████  Polish, Validation, Launch
```

**Key Milestones**:
- Week 4: Food database (500 items) + meal logger demo
- Week 10: ML models meeting sensitivity targets (>91% @ 30min)
- Week 18: End-to-end working app (offline + online)
- Week 22: Clinical study enrollment begins
- Week 26: Production launch + study interim results

---

## 7. Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Clinical data access delays | High | High | Start IRB process Week 1; use synthetic data for initial training |
| NPH/Regular PK model accuracy | Medium | High | Literature review + endocrinologist consultation; sensitivity analysis |
| Indian food database completeness | Medium | Medium | Crowdsourcing + nutritionist review; launch with top 200, expand |
| CGM API reliability/access | Medium | High | Multi-vendor support; offline Bluetooth fallback; simulated data for dev |
| Regulatory classification (SaMD) | Low | High | Early consultation with CDSCO; design for IEC 62304 |
| User adoption in target demographic | Medium | High | Co-design with T1D community; Hindi-first UX; family/caregiver mode |
| Model drift over time | Medium | Medium | Monitoring dashboard; retraining pipeline; federated learning roadmap |

---

## 8. Success Metrics

### Technical Metrics
- [ ] Hypoglycemia prediction: Sensitivity >91% @ 30min, >85% @ 60min
- [ ] Carb estimation: MAE <15g for composite meals
- [ ] App performance: LCP <2.5s, 99.9% uptime
- [ ] Offline reliability: 100% data sync within 5 min of reconnect

### Clinical Metrics (12-week study)
- [ ] Time <70 mg/dL: ≥30% reduction vs baseline
- [ ] Severe hypo events (<54 mg/dL): ≥50% reduction
- [ ] HbA1c: ≥0.5% reduction
- [ ] User retention: >70% at 12 weeks

### User Experience Metrics
- [ ] SUS score: >80
- [ ] Net Promoter Score: >50
- [ ] Daily active users / Monthly active users: >0.4
- [ ] Support tickets per 100 users: <5

---

## 9. Budget Estimate (Indicative)

| Category | Monthly Cost | 6-Month Total |
|----------|--------------|---------------|
| Team (8 FTE) | ₹45-60L | ₹2.7-3.6Cr |
| Cloud Infrastructure | ₹2-3L | ₹12-18L |
| CGM API / Data Access | ₹1-2L | ₹6-12L |
| Clinical Study (50 patients) | - | ₹15-25L |
| Security Audit / Compliance | - | ₹5-8L |
| **Total** | | **₹3.1-4.2Cr** |

*Note: Can be phased; MVP (Phases 1-3) ≈ ₹1.5-2Cr*

---

## 10. Differentiators That Will Impress Evaluators

1. **Indian-First Design**: Not a ported Western app — built for NPH/Regular insulin, Indian meal patterns, Hindi/Hinglish UX
2. **Clinical Rigor**: Prospective validation study design from Day 1, not an afterthought
3. **Offline-First Architecture**: Works in school/rural settings with poor connectivity
4. **Composite Meal Intelligence**: "Rajma-chawal" as one entry, not 3 separate items
5. **Explainable Predictions**: Shows *why* hypo predicted (IOB spike + carb absorption lag)
6. **Family/Caregiver Mode**: Shared alerts for parents of T1D children
7. **Open Science Commitment**: Model cards, datasheets, synthetic data generation code released

---

## 11. Next Steps (Immediate Actions)

1. [ ] **Week 1**: Finalize team, sign NDAs, set up repos/infra
2. [ ] **Week 1**: Begin IRB application for clinical study
3. [ ] **Week 1-2**: Nutritionist engagement for food database
4. [ ] **Week 2**: CGM vendor partnerships (Dexcom, Abbott, Medtronic)
5. [ ] **Week 2**: Synthetic data pipeline for ML kickstart
6. [ ] **Week 3**: Design system + component library (Storybook)
7. [ ] **Week 4**: Food database v1 (200 items) + meal logger demo

---

## Appendix A: Key References

1. **Hypoglycemia Prediction**: 
   - JMIR 2024: "LSTM-based hypoglycemia prediction achieving >91% sensitivity at 30-60 min"
   - BMC Med Inform Decis Mak 2023: "Temporal Fusion Transformers for glucose forecasting"
   
2. **Indian Insulin Regimens**:
   - Indian J Endocrinol Metab 2022: "NPH + Regular insulin usage patterns in Indian T1D"
   - Diabetes Ther 2021: "Pharmacokinetics of human insulin vs analogues in South Asians"

3. **Indian Food Composition**:
   - ICMR-NIN 2017: "Nutritive Value of Indian Foods" (Longvah et al.)
   - IFCT 2017: Indian Food Composition Tables

4. **Regulatory**:
   - CDSCO: "Guidance on Software as Medical Device (SaMD)" 2022
   - DPDP Act 2023: Digital Personal Data Protection Act (India)
   - IEC 62304: Medical device software lifecycle

---

*Document Version: 1.0*  
*Last Updated: November 2026*  
*Status: DRAFT - For Review*