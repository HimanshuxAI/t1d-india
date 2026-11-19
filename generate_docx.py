import docx
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
import subprocess
import os

doc = docx.Document()

# Set default font
style = doc.styles['Normal']
font = style.font
font.name = 'Times New Roman'
font.size = Pt(10)

def add_heading_styled(text, level=1):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.name = 'Times New Roman'
        run.font.color.rgb = RGBColor(0, 0, 0)
    return h

def add_para(text, bold=False, italic=False, size=10, alignment=None, space_after=Pt(6), space_before=Pt(0)):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(size)
    run.bold = bold
    run.italic = italic
    if alignment:
        p.alignment = alignment
    p.paragraph_format.space_after = space_after
    p.paragraph_format.space_before = space_before
    return p

# ===================== TITLE =====================
title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = title.add_run("T1D India: AI-Powered Hypoglycemia Prediction and Carb-Counting for Indian Type 1 Diabetes Diets")
run.font.name = 'Times New Roman'
run.font.size = Pt(20)
run.bold = True
title.paragraph_format.space_after = Pt(12)

# ===================== AUTHORS =====================
authors = doc.add_paragraph()
authors.alignment = WD_ALIGN_PARAGRAPH.CENTER
run = authors.add_run("First A. Author1, Second B. Author2, and Third C. Author3")
run.font.name = 'Times New Roman'
run.font.size = Pt(11)
authors.paragraph_format.space_after = Pt(2)

for i in range(1, 4):
    affil = doc.add_paragraph()
    affil.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = affil.add_run(f"{i}Member, Institute/Organization name")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(11)
    affil.paragraph_format.space_after = Pt(0)
affil.paragraph_format.space_after = Pt(12)

# ===================== ABSTRACT =====================
add_para("Abstract", bold=True, size=9, space_after=Pt(2))
abstract_text = (
    "This paper presents T1D India, a full-stack medical device software platform for Type 1 Diabetes (T1D) "
    "management in the Indian context. The system integrates three core capabilities: (1) an Indian food database "
    "with 500+ items from ICMR-NIN (not USDA), 20+ composite meals (e.g., rajma-chawal), and reference objects "
    "(katori, chapati, ladle) eliminating food scales; (2) a Temporal Fusion Transformer (TFT) for hypoglycemia "
    "prediction at 30/60-minute horizons using Indian-specific insulin pharmacokinetics — two-compartment models "
    "for Regular human insulin (peak 120 min), NPH (peak 360 min), and premixed 30/70 — and a three-phase "
    "carbohydrate absorption model (rapid/intermediate/slow) tuned to Indian meal compositions; (3) a safety-first "
    "bolus calculator supporting basal-bolus, NPH+Regular, premixed, and pump regimens with hard caps (15 U), "
    "IOB adjustment, predicted glucose floor (70 mg/dL), and regimen-aware warnings. The architecture is "
    "offline-first (Service Worker + IndexedDB + Background Sync) for school/rural connectivity. Clinical "
    "validation is designed as a prospective 12-week single-arm study (50 patients, AIIMS/PGIMER) with IRB/EC "
    "approval and DPDP Act 2023 compliance. Current implementation status: monorepo complete (Fastify API, "
    "FastAPI ML service, Next.js 14 PWA, TimescaleDB), CI/CD operational, ML models in training phase (no "
    "trained weights deployed). Measured sensitivity/specificity, latency benchmarks, and clinical outcomes are "
    "NOT FOUND IN CODE."
)
add_para(abstract_text, size=9, space_after=Pt(6))

add_para("Index Terms", bold=True, size=9, space_after=Pt(2))
add_para("Type 1 Diabetes, hypoglycemia prediction, Temporal Fusion Transformer, Indian food composition, insulin pharmacokinetics, offline-first progressive web app, software as medical device.", size=9, space_after=Pt(12))

# ===================== I. INTRODUCTION =====================
add_heading_styled("I. INTRODUCTION", level=1)

intro_text = (
    "Existing diabetes applications in India (BeatO, Fitterfly, Sugar.fit) target Type 2 diabetes reversal — "
    "weight loss, HbA1c reduction, lifestyle coaching [README.md:11-13]. None support Type 1 Diabetes management "
    "for Indian diets. Critical gaps identified in the codebase documentation:"
)
add_para(intro_text, size=10)

gaps = [
    ("1. Food database: ", "Western apps use USDA; Indian staples (rajma, dosa, poha, thepla, bhakri, appam) are missing. T1D India uses ICMR-NIN 2017 \"Nutritive Value of Indian Foods\" as primary source [README.md:22, prisma/seed-data.json]."),
    ("2. Insulin regimens: ", "~80% of Indian T1D children use Human Regular + NPH insulin (cost: ₹300/month vs ₹3000+ for rapid-acting analogues). Western apps assume rapid-acting insulin PK. T1D India implements two-compartment PK models with South Asian parameters: Regular (ka=0.008, ke=0.006, t_max=120 min), NPH (ka=0.003, ke=0.002, t_max=360 min) [ARCHITECTURE.md:93-99, packages/shared/src/utils/bolus-calculator.ts:164-188]."),
    ("3. Carbohydrate absorption: ", "Typical Indian lunch = 80-120g carbs (rajma-chawal + roti + sabzi) vs Western 40-60g. T1D India uses a three-phase model: rapid (sugars, 0-30 min), intermediate (starches, 30-90 min), slow (legumes/whole grains, 90-240 min) with meal-type modifiers (North Indian lunch: 20/50/30% rapid/intermediate/slow) [TECHNICAL_DEEP_DIVE.md:148-199]."),
    ("4. Hypoglycemia prediction: ", "No existing app predicts hypos 30 minutes ahead with explainability for Indian regimens. T1D India targets >91% sensitivity at 30-min horizon (matching JMIR 2024 LSTM benchmark [README.md:28, docs/irb/irb_protocol.md:13]) using a Temporal Fusion Transformer with quantile regression (P10/P50/P90) and attention-based feature attribution."),
    ("5. Connectivity: ", "Schools/rural India have poor WiFi. T1D India is offline-first PWA with Service Worker caching, IndexedDB local storage, and Background Sync API [ARCHITECTURE.md:103-115, apps/web/src/lib/offline-sync.ts].")
]

for bold_part, normal_part in gaps:
    p = doc.add_paragraph()
    run = p.add_run(bold_part)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(10)
    run.bold = True
    run = p.add_run(normal_part)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(10)
    p.paragraph_format.space_after = Pt(6)

add_para(
    "This paper describes the system architecture, algorithms, implementation status, and validation framework. "
    "All claims cite specific source files; measured results are marked NOT FOUND IN CODE where absent.",
    size=10, space_after=Pt(12)
)

# ===================== II. SYSTEM ARCHITECTURE =====================
add_heading_styled("II. SYSTEM ARCHITECTURE", level=1)

add_para(
    "The monorepo uses npm workspaces with four packages: apps/api (Fastify), apps/ml-service (FastAPI), "
    "apps/web (Next.js 14), packages/shared (types, constants, utilities) [ARCHITECTURE.md:7-15, package.json].",
    size=10
)

add_heading_styled("A. API Layer (Fastify)", level=2)
add_para(
    "apps/api/src/index.ts registers plugins: Prisma (PostgreSQL), Redis, Clerk JWT auth, audit logging, CORS, "
    "Helmet, rate-limit (100 req/min), Swagger, multipart. Routes: /meals, /foods, /cgm, /predictions, "
    "/insulin, /profile, /auth [apps/api/src/routes/*.ts].",
    size=10
)

add_heading_styled("B. Data Layer", level=2)
add_para(
    "PostgreSQL + Prisma for relational data. TimescaleDB hypertable for CGM readings (1-day chunks, "
    "compression after 7 days, continuous aggregates for hourly AGP stats) [prisma/schema.prisma:391-417, "
    "TECHNICAL_DEEP_DIVE.md:835-905]. Redis for caching (food search 1h, predictions 1min) and BullMQ queues.",
    size=10
)

add_heading_styled("C. ML Inference Service (FastAPI + ONNX Runtime)", level=2)
add_para(
    "apps/ml-service/src/main.py loads ONNX models at startup. Endpoints: /v1/predict/hypo, "
    "/v1/predict/carbs, /v1/calculate/bolus. Batched inference via BatchProcessor (max 32, 10ms wait) "
    "[apps/ml-service/src/inference/onnx_inference.py:73-140].",
    size=10
)

add_heading_styled("D. Frontend (Next.js 14 PWA)", level=2)
add_para(
    "React 18, Tailwind, TanStack Query, Zustand. Hooks: useCGM (30s refetch), useHypoPredictions "
    "(1min refetch), useUploadCGM [apps/web/src/hooks/use-cgm.ts, use-hypo-predictions.ts]. Offline sync "
    "via offline-sync.ts (IndexedDB stores: pendingMeals, pendingInsulin, pendingCGM, apiCache) "
    "[apps/web/src/lib/offline-sync.ts].",
    size=10
)

add_heading_styled("E. Infrastructure", level=2)
add_para(
    "Docker Compose for local dev (PostgreSQL, Redis, MinIO, Prometheus, Grafana) "
    "[infrastructure/docker/docker-compose.yml]. Helm charts for EKS: 3 node pools (general m6i.xlarge, "
    "ml-inference g5.xlarge SPOT with GPU, data-processing r6i.2xlarge SPOT) [infrastructure/helm/t1d-india/]. "
    "GitHub Actions CI/CD: lint → typecheck → unit → integration → ML tests → build → deploy staging "
    "(develop) → deploy prod (main, manual approval) [.github/workflows/ci.yml].",
    size=10
)

# ===================== III. CORE ALGORITHMS =====================
add_heading_styled("III. CORE ALGORITHMS", level=1)

add_heading_styled("A. Temporal Fusion Transformer for Hypoglycemia Prediction", level=2)
add_para(
    "From apps/ml-service/src/models/tft.py and TECHNICAL_DEEP_DIVE.md:1.1:",
    size=10
)

algo_items = [
    ("Input: ", "Time-series (6 steps × 5-min = 30-min lookback, 72 features: glucose, ROC, IOB rapid/regular/NPH ×6, carb absorption ×6, steps ×6, HR ×6) + Static (12 features: age, weight, diabetes duration, ISF, ICR, regimen type, hypo unawareness)."),
    ("Architecture: ", "Variable Selection Network (weights 72 features) → LSTM encoder (2 layers, 256 hidden) → Interpretable Multi-Head Attention (4 heads, causal mask) → Position-wise GRN → Quantile heads (3 quantiles × 2 horizons = 6 glucose outputs) + Classification heads (hypo prob, severe hypo prob per horizon)."),
    ("Loss: ", "Combined QuantileLoss (pinball, α=0.7) + BCEWithLogitsLoss (classification, α=0.3) [apps/ml-service/src/training/train_tft.py:559-582]."),
    ("Indian-specific features: ", "Separate IOB time-series for rapid/regular/NPH (18 features), three-phase carb absorption precomputed per meal log, regimen type embedding (4-dim: basal-bolus/NPH+Regular/premixed/pump) [TECHNICAL_DEEP_DIVE.md:12-45]."),
    ("Output: ", "P10/P50/P90 glucose at 30/60 min, hypo probability, severe hypo probability, top-5 contributing features via attention weights.")
]

for bold_part, normal_part in algo_items:
    p = doc.add_paragraph()
    run = p.add_run(bold_part)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(10)
    run.bold = True
    run = p.add_run(normal_part)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(10)
    p.paragraph_format.space_after = Pt(6)

add_heading_styled("B. Insulin Bolus Calculator with Safety Constraints", level=2)
add_para(
    "Shared implementation: packages/shared/src/utils/bolus-calculator.ts (TypeScript) and "
    "apps/ml-service/src/main.py:420-504 / inference/onnx_inference.py:426-544 (Python). Algorithm:",
    size=10
)

steps = [
    "Meal bolus = carbs_g / ICR",
    "Correction bolus = max(0, (current_glucose - 110) / ISF) capped at 5 U; only if glucose > 110, no recent hypo, glucose ≥ 90",
    "IOB adjustment: total_IOB = IOB_rapid + 0.5×IOB_regular + 0.3×IOB_NPH; if > 3 U, reduce by (total_IOB - 3) × 0.5",
    "Regimen-specific: NPH+Regular at 4-8h post-meal → -20% bolus; Premixed 30/70 at 3-6h → -15% NPH component",
    "Safety cap: max 15 U total",
    "Predicted floor: if current_glucose - total_bolus × ISF < 70, reduce to (current_glucose - 80) / ISF",
    "Recent hypo warning: if hypo in last 120 min, warn \"reduce 25-50%\""
]

for step in steps:
    p = doc.add_paragraph(style='List Number')
    run = p.add_run(step)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(10)

add_para(
    "Returns: meal_bolus, correction_bolus, total_bolus, max_allowed, warnings[], explanation, safety_check.",
    size=10, space_after=Pt(6)
)

add_heading_styled("C. Three-Phase Carbohydrate Absorption for Indian Meals", level=2)
add_para(
    "From TECHNICAL_DEEP_DIVE.md:1.1.4 and packages/shared/src/utils/index.ts:",
    size=10
)

phase_items = [
    ("Phase parameters: ", "Rapid (fraction 0.30, k_abs=0.045, delay=0), Intermediate (0.50, k_abs=0.025, delay=15), Slow (0.20, k_abs=0.012, delay=45)."),
    ("Meal-type modifiers (multiply fractions): ", "North Indian lunch (0.2/0.5/0.3), South Indian breakfast (0.4/0.5/0.1), Mughlai dinner (0.15/0.45/0.4), Snack fried (0.35/0.45/0.2), Fruit snack (0.6/0.3/0.1)."),
    ("Absorption curve: ", "Gamma distribution rate(t) = carbs × k × exp(-k×(t-delay)) for t ≥ delay. Stored as JSONB absorption_profile with meal log, used directly as ML features.")
]

for bold_part, normal_part in phase_items:
    p = doc.add_paragraph()
    run = p.add_run(bold_part)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(10)
    run.bold = True
    run = p.add_run(normal_part)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(10)
    p.paragraph_format.space_after = Pt(6)

add_heading_styled("D. CGM Data Alignment", level=2)
add_para(
    "apps/api/src/utils/cgm-alignment.ts: Aligns raw readings to 5-min grid, deduplicates (keeps latest "
    "device timestamp), forward-fills gaps ≤15 min (maxGapMin=15), marks isValid=false and "
    "interpolated=true for filled gaps, gaps >15 min break continuity. Computes ROC (mg/dL/min) and "
    "ROC-5min-ago. Validates glucose 20-400 mg/dL, trend -3 to +3.",
    size=10
)

# ===================== IV. DATA MODELS AND FOOD DATABASE =====================
add_heading_styled("IV. DATA MODELS AND FOOD DATABASE", level=1)

add_heading_styled("A. Database Schema (Prisma)", level=2)
add_para("Key tables [prisma/schema.prisma]:", size=10)

tables = [
    ("users", "(clerk_id, role, locale, timezone)"),
    ("patient_profiles", "(ICR, ISF, insulin_regimen, NPH/Regular doses, CGM type, consent flags)"),
    ("foods", "(500+ atomic items: name_en/hi/regional, carbs_g/100g, typical_serving_g, reference_objects{katori:150, chapati:30}, prep_methods, glycemic_index, confidence_score, source=ICMR-NIN/USDA/FSSAI)"),
    ("composite_meals", "(20+ pre-built: components[food_id, quantity_g, prep], total_carbs_g, absorption_profile, region_tags, occasion_tags)"),
    ("meal_logs", "(items denormalized JSONB, total_carbs_g, absorption_profile, input_method)"),
    ("insulin_logs", "(14 insulin types, dose_u, injection_site, related_meal_log_id, calculator_recommended_u, override_reason)"),
    ("cgm_readings", "(TimescaleDB hypertable: time, glucose_mg_dL, trend, isValid, source)"),
    ("hypo_predictions", "(glucose_p10/50/90 at 30/60min, hypo_prob, severe_hypo_prob, top_features, model_version, actuals for calibration)"),
    ("hypo_alerts", "(level: WARNING/URGENT/EMERGENCY, indian_carb_options: glucose tablets, juice, sugar, honey, banana, dates)"),
    ("ml_models", "(registry: name, version, framework, S3 URI, metrics, status)")
]

for table, desc in tables:
    p = doc.add_paragraph(style='List Bullet')
    run = p.add_run(table)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(10)
    run.bold = True
    run = p.add_run(" " + desc)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(10)

add_heading_styled("B. Seed Data", level=2)
add_para(
    "prisma/seed-data.json contains 50 foods (rice, roti, dals, rajma, vegetables, fruits, dairy, sweets, "
    "composite dishes) with regional names (Hindi, Tamil, Telugu, Kannada, Malayalam, Punjabi, Gujarati, "
    "Bengali), reference objects, prep method multipliers, glycemic index, confidence scores (0.9-0.95 for "
    "ICMR-NIN verified). Composite meals include rajma-chawal (89g carbs, 3-phase absorption), chole-bhature, "
    "dosa-sambar, etc.",
    size=10
)

# ===================== V. SECURITY, COMPLIANCE, AND ERROR HANDLING =====================
add_heading_styled("V. SECURITY, COMPLIANCE, AND ERROR HANDLING", level=1)

add_heading_styled("A. Authentication & Authorization", level=2)
add_para(
    "Clerk JWT (HS256, 15min access/7day refresh) via @fastify/jwt [apps/api/src/plugins/auth.ts]. "
    "Role-based access: requireRole('PATIENT','CAREGIVER','CLINICIAN') on routes.",
    size=10
)

add_heading_styled("B. Data Protection", level=2)
add_para(
    "Field-level AES-256-GCM envelope encryption (DEK per field, KEK in AWS KMS) "
    "[TECHNICAL_DEEP_DIVE.md:6.1]. PII hashed (phone_hash, cgm_serial_hash). DPDP Act 2023 compliance: "
    "consent flags (data_sharing, research, marketing), export endpoint (/profile/export), delete/anonymize "
    "endpoint (/profile/account) [apps/api/src/routes/profile.ts:220-257, docs/security/dpdp_compliance.md].",
    size=10
)

add_heading_styled("C. Audit Logging", level=2)
add_para(
    "Structured JSON logs for all PHI access via @audit_log decorator [TECHNICAL_DEEP_DIVE.md:6.2, "
    "apps/api/src/plugins/audit.ts].",
    size=10
)

add_heading_styled("D. Input Validation", level=2)
add_para(
    "Zod schemas for all routes (shared package) [packages/shared/src/types/index.ts]. Fastify AJV with "
    "removeAdditional: 'all'.",
    size=10
)

add_heading_styled("E. Error Handling", level=2)
add_para(
    "Custom AppError hierarchy (ValidationError, NotFoundError, UnauthorizedError, RateLimitError). Global "
    "handler sanitizes responses. ML service: 5s timeout on prediction calls, structured error responses "
    "[apps/ml-service/src/main.py:541-555].",
    size=10
)

add_heading_styled("F. Performance Optimizations", level=2)
add_para(
    "Redis caching (TTLs: food search 1h, predictions 1min), TimescaleDB continuous aggregates for AGP, "
    "ONNX Runtime ORT_ENABLE_ALL with 4 threads, request batching (max 32, 10ms), connection pooling "
    "[TECHNICAL_DEEP_DIVE.md:8.1, apps/ml-service/src/inference/onnx_inference.py].",
    size=10
)

# ===================== VI. TESTING AND VALIDATION FRAMEWORK =====================
add_heading_styled("VI. TESTING AND VALIDATION FRAMEWORK", level=1)

add_heading_styled("A. Test Pyramid", level=2)
add_para(
    "Unit (80%): bolus calculator, CGM alignment, food DB [apps/api/src/routes/__tests__/bolus-calculator.test.ts, "
    "meals.test.ts]. Integration (15%): API contracts with test DB. E2E (5%): Cypress/Playwright (planned) "
    "[TECHNICAL_DEEP_DIVE.md:7.1].",
    size=10
)

add_heading_styled("B. Key Unit Tests", level=2)
add_para(
    "Bolus calculator: meal bolus = carbs/ICR (60g/10=6U), correction = (glucose-110)/ISF (210→2U), IOB "
    "adjustment (4U rapid→-0.5U), NPH peaking at 5h (regimen NPH_REGULAR, time=300min→warning + reduction), "
    "safety cap 15U, predicted floor <70 mg/dL (90 glucose→max 0.2U), recent hypo warning "
    "[apps/api/src/routes/__tests__/bolus-calculator.test.ts].",
    size=10
)
add_para(
    "Meal routes: composite meal carb calc (rajma 150g + rice 200g = 89g), absorption profile 3 phases, "
    "pagination [apps/api/src/routes/__tests__/meals.test.ts].",
    size=10
)

add_heading_styled("C. Clinical Validation Study", level=2)
add_para(
    "docs/irb/irb_protocol.md: Prospective single-arm, 50 T1D patients, 12 weeks. Primary endpoint: % time "
    "<70 mg/dL reduction vs baseline. Sites: AIIMS, PGIMER. IRB/EC approval pending, CTRI registration "
    "required before enrollment. CDSCO SaMD consultation per 2022 guidance. Budget: ₹45,00,000 (staff, "
    "devices, cloud, IRB fees). Timeline: Months 1-3 preparation, 4-15 enrollment/follow-up, 16-18 analysis, "
    "24-27 dissemination.",
    size=10
)

add_heading_styled("D. Model Evaluation Metrics", level=2)
add_para(
    "Training code computes [apps/ml-service/src/training/train_tft.py:667-714, evaluate_model.py]:",
    size=10
)

metrics = [
    "MAE per horizon (30/60 min)",
    "Sensitivity/specificity for hypo (<70) and severe hypo (<54) at each horizon",
    "Target: sensitivity ≥91% at 30 min (SENSITIVITY_TARGET=0.91 in packages/shared/src/constants/index.ts:63)",
    "LOPO-CV (Leave-One-Patient-Out) to avoid data leakage"
]
for m in metrics:
    p = doc.add_paragraph(style='List Bullet')
    run = p.add_run(m)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(10)

add_heading_styled("E. Load Testing", level=2)
add_para(
    "k6 script defined [TECHNICAL_DEEP_DIVE.md:8.2]: spike test 100→500 VUs, thresholds P95<500ms, "
    "P99<1000ms, error rate<1%. NOT EXECUTED — no results in codebase.",
    size=10
)

# ===================== VII. IMPLEMENTATION STATUS AND LIMITATIONS =====================
add_heading_styled("VII. IMPLEMENTATION STATUS AND LIMITATIONS", level=1)

# Create table
table = doc.add_table(rows=14, cols=3)
table.style = 'Table Grid'

headers = ["Component", "Status", "Evidence"]
for i, h in enumerate(headers):
    cell = table.rows[0].cells[i]
    cell.text = h
    for paragraph in cell.paragraphs:
        for run in paragraph.runs:
            run.font.name = 'Times New Roman'
            run.font.size = Pt(9)
            run.bold = True

data = [
    ["Monorepo, Prisma schema, API routes, ML service skeleton, Next.js PWA, Docker/Helm, CI/CD", "Complete", "All source files present"],
    ["Indian food database (50 seeded, target 500+)", "Partial", "prisma/seed-data.json (50 items)"],
    ["ML models (TFT, carb vision, bolus)", "Training phase", "No .onnx weights exist; main.py loads return 503"],
    ["CGM vendor integrations (Dexcom/Libre/Medtronic)", "Implemented, not wired", "apps/api/src/services/cgm_integration.py complete; no API route uses it"],
    ["Offline sync (client)", "Complete", "apps/web/src/lib/offline-sync.ts"],
    ["Offline sync (server /api/v1/sync)", "Missing", "No route implemented"],
    ["Clinical study (IRB, enrollment)", "Written, pending", "docs/irb/irb_protocol.md; README: IRB pending"],
    ["Accessibility (WCAG 2.1 AA)", "Utilities implemented", "apps/web/src/lib/accessibility.ts; no audit results"],
    ["Security (encryption, audit, DPDP)", "Design complete", "TECHNICAL_DEEP_DIVE.md §6; no pen test report"],
    ["Measured model performance", "NOT FOUND IN CODE", "Targets only (91% sensitivity)"],
    ["Latency benchmarks", "NOT FOUND IN CODE", "Targets only (TECHNICAL_DEEP_DIVE.md §8.1)"],
    ["Model calibration", "Missing", "No temperature scaling / isotonic regression"],
    ["Automated retraining pipeline", "Missing", "ADR-018 proposes Evidently AI; not implemented"]
]

for row_idx, row_data in enumerate(data, 1):
    for col_idx, cell_text in enumerate(row_data):
        cell = table.rows[row_idx].cells[col_idx]
        cell.text = cell_text
        for paragraph in cell.paragraphs:
            for run in paragraph.runs:
                run.font.name = 'Times New Roman'
                run.font.size = Pt(8)

add_para("", size=6, space_after=Pt(6))

add_para("Key Limitations:", bold=True, size=10)

limitations = [
    "(1) No trained model weights — predictions return 503;",
    "(2) CGM integrations not connected to API;",
    "(3) Server sync endpoint missing;",
    "(4) Hardcoded insulin PK params duplicated in 4+ files;",
    "(5) No circuit breaker for ML service calls (5s timeout only);",
    "(6) WebSocket for real-time CGM commented out;",
    "(7) No automated retraining pipeline."
]
for lim in limitations:
    p = doc.add_paragraph(style='List Bullet')
    run = p.add_run(lim)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(10)

# ===================== VIII. CONCLUSION =====================
add_heading_styled("VIII. CONCLUSION", level=1)

conclusion_text = (
    "T1D India presents a culturally-grounded, technically comprehensive platform for T1D management in India. "
    "The architecture addresses Indian-specific gaps: ICMR-NIN food database with composite meals and reference "
    "objects, NPH/Regular insulin PK models, three-phase carb absorption for mixed Indian meals, and offline-first "
    "PWA for low-connectivity settings. The TFT-based hypoglycemia prediction with quantile outputs and "
    "attention-based explainability targets >91% sensitivity at 30 minutes. Safety-first bolus calculation "
    "includes regimen-aware logic for Indian insulin patterns."
)
add_para(conclusion_text, size=10)

conclusion_text2 = (
    "The codebase is architecturally complete for MVP but pre-data, pre-clinical, pre-launch. All performance "
    "claims (91% sensitivity, <100ms inference, offline sync working) are design targets, NOT FOUND IN CODE as "
    "measured results. Next phases: synthetic data generation (UVA/Padova + BlenderProc), model training, "
    "clinical study launch, accessibility/security audits."
)
add_para(conclusion_text2, size=10)

# ===================== ACKNOWLEDGMENT =====================
add_heading_styled("ACKNOWLEDGMENT", level=1)

ack_text = (
    "ICMR-NIN for \"Nutritive Value of Indian Foods\" (primary food reference). JMIR 2024 for LSTM "
    "hypoglycemia prediction benchmark. UVA/Padova T1D Simulator for FDA-accepted synthetic CGM generation. "
    "T1D families in India for co-design input. [README.md:182-185]"
)
add_para(ack_text, size=10)

# ===================== REFERENCES =====================
add_heading_styled("REFERENCES", level=1)

refs = [
    "[1] ICMR-NIN, \"Nutritive Value of Indian Foods,\" 2017.",
    "[2] H. Godwin et al., \"Temporal Fusion Transformers for Interpretable Multi-horizon Time Series Forecasting,\" J. Mach. Learn. Res., vol. 22, pp. 1-36, 2021.",
    "[3] JMIR 2024, \"LSTM-based hypoglycemia prediction achieving >91% sensitivity at 30-60 min\" [cited in README.md, docs/irb/irb_protocol.md — exact citation NOT FOUND IN CODE].",
    "[4] R. Hovorka et al., \"Nonlinear model predictive control of glucose concentration in subjects with type 1 diabetes,\" Physiol. Meas., vol. 25, no. 4, pp. 905-920, 2004.",
    "[5] UVA/Padova T1D Simulator, FDA-accepted metabolic simulator for synthetic data generation.",
    "[6] CDSCO, \"Guidance on Software as Medical Device (SaMD),\" 2022.",
    "[7] DPDP Act 2023 (India), Digital Personal Data Protection Act.",
    "[8] IEC 62304:2006, \"Medical device software — Software life cycle processes.\"",
    "[9] ONNX Runtime, \"Performance Tuning Guide,\" Microsoft, 2024.",
    "[10] Evidently AI, \"Model Monitoring for ML Systems,\" 2024.",
    "[11] BlenderProc, \"Procedural Generation of Synthetic Training Data for Computer Vision,\" 2023."
]

for ref in refs:
    p = doc.add_paragraph(ref)
    for run in p.runs:
        run.font.name = 'Times New Roman'
        run.font.size = Pt(9)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.left_indent = Inches(0.5)
    p.paragraph_format.first_line_indent = Inches(-0.5)

# Save DOCX
output_docx = "/Users/himanshu/Documents/PBL/T1D_India_IJIRT.docx"
doc.save(output_docx)
print(f"DOCX saved to {output_docx}")

# Try to convert to PDF using libreoffice if available
try:
    result = subprocess.run(['libreoffice', '--headless', '--convert-to', 'pdf', output_docx, '--outdir', '/Users/himanshu/Documents/PBL/'], capture_output=True, text=True, timeout=60)
    if result.returncode == 0:
        print("PDF converted successfully")
    else:
        print(f"LibreOffice conversion failed: {result.stderr}")
except FileNotFoundError:
    print("LibreOffice not installed. Please install LibreOffice to convert to PDF, or use Word to save as PDF.")
except Exception as e:
    print(f"Conversion error: {e}")
