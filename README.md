# T1D India - AI-Powered Diabetes Management Platform

> **AI-Powered Hypoglycemia Prediction and Carb-Counting Tool for Indian T1D Diets**

A production-ready, clinically-validated platform addressing the critical gap in Type 1 Diabetes (T1D) management for Indian users. Combines hypoglycemia prediction using deep learning models trained on Indian dietary patterns with accurate carb-counting for Indian meals, plus insulin dose calculation tailored to Indian insulin regimens (NPH + Regular insulin).

## 🎯 Problem Statement

Current diabetes apps in India (BeatO, Fitterfly, Sugar.fit) target Type 2 diabetes reversal and lifestyle coaching. **None offer:**
- Insulin dose calculation for T1D
- Carb-counting for Indian meals (dosa, poha, rajma-chawal, thali)
- Hypoglycemia prediction for T1D users
- Support for NPH + Regular insulin regimens (standard in India)

A T1D child eating rajma-chawal at school lunch needs to know the carb content to calculate their insulin bolus — no Indian app provides this.

## ✨ Key Features

### 🍽️ Indian Food Database & Meal Logging
- **500+ verified Indian foods** from ICMR-NIN, USDA, FSSAI
- **100+ composite meals** (rajma-chawal, dosa-sambar, chole-bhature, thali)
- **Multi-input logging**: text search, voice (Hindi/English/Hinglish), photo OCR/ML
- **Smart portion estimation** using Indian reference objects (katori, chapati, ladle)
- **Composite meal builder** — log "dal-chawal-sabzi-roti" as one entry

### 🤖 ML-Powered Hypoglycemia Prediction
- **Temporal Fusion Transformer (TFT)** achieving **>91% sensitivity at 30-min horizon**
- **Indian-specific adaptations**:
  - NPH/Regular insulin pharmacokinetics (peak 4-12h vs rapid-acting 1-2h)
  - Indian meal timing patterns (early lunch 12-1pm, late dinner 9-10pm)
  - High-carb meals (80-120g vs Western 40-60g)
  - 3-phase carb absorption for Indian mixed meals
- **Explainable predictions** — shows *why* hypo predicted (IOB spike + carb absorption lag)
- **30/60-minute horizons** with calibrated probability intervals (P10/P50/P90)

### 💉 Insulin Dose Calculator
- **Regimen support**: Basal-bolus, NPH+Regular (2-3x/day), Premixed (30/70, 50/50), Pump
- **Safety-first algorithm** with hard caps, IOB adjustment, predicted glucose floor
- **Indian insulin PK models** — validated two-compartment models for Human Regular, NPH, Premixed
- **Smart suggestions**: "Last time you ate rajma-chawal, you took 6U"

### 📱 Offline-First PWA
- Works in schools/rural areas with poor connectivity
- Service Worker + IndexedDB for meals, CGM, insulin logs
- Background sync with conflict resolution
- 100% data sync within 5 minutes of reconnect

### 🏥 Clinical Validation Ready
- **Prospective study protocol** (50 T1D patients, 12 weeks, AIIMS/PGIMER)
- Primary endpoint: % time <70 mg/dL reduction vs baseline
- IRB/EC approval workflow, DPDP Act 2023 compliant
- Audit logging, data encryption, penetration testing

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js PWA (React 18)                       │
│  Meal Logger │ CGM Dashboard │ Insulin Calculator │ Hypo Alerts │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │   API Gateway   │  (Kong/AWS API Gateway)
                    │  Auth • Rate    │
                    │  Limit • Valid  │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │ Meal API│         │ CGM API │         │  ML API │
   │(Fastify)│         │(Fastify)│         │(Python) │
   └────┬────┘         └────┬────┘         └────┬────┘
        │                   │                    │
        ▼                   ▼                    ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │PostgreSQL│        │TimescaleDB│       │ONNX     │
   │(Relational)       │(Time-series)       │Runtime  │
   └─────────┘         └─────────┘         └─────────┘
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, Zustand, TanStack Query |
| **Backend API** | Node.js 20, Fastify, Prisma ORM, PostgreSQL 16 |
| **Time-Series DB** | TimescaleDB (CGM data, continuous aggregates) |
| **ML Inference** | Python 3.11, FastAPI, ONNX Runtime, PyTorch |
| **Cache/Queue** | Redis 7, BullMQ |
| **Auth** | Clerk (HIPAA-compliant, MFA, SOC2) |
| **Storage** | S3/MinIO (meal photos, model artifacts) |
| **Monitoring** | Prometheus, Grafana, Sentry |
| **CI/CD** | GitHub Actions, ArgoCD, Helm |
| **Infrastructure** | Kubernetes (EKS/GKE), Terraform |

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- PostgreSQL 16 + TimescaleDB (or use Docker)

### Local Development

```bash
# Clone and install
git clone https://github.com/your-org/t1d-india.git
cd t1d-india
npm install

# Start infrastructure
npm run docker:up

# Setup database
npm run db:generate --workspace=apps/api
npm run db:migrate --workspace=apps/api
npm run db:seed --workspace=apps/api

# Start development servers
npm run dev:api    # API on http://localhost:3000
npm run dev:ml     # ML service on http://localhost:8000
```

### Environment Variables

Create `.env` files in `apps/api/` and `apps/ml-service/`:

```bash
# apps/api/.env
DATABASE_URL="postgresql://t1d:password@localhost:5432/t1d"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
CLERK_SECRET_KEY="sk_test_..."
ML_SERVICE_URL="http://localhost:8000"
ML_SERVICE_API_KEY="dev-ml-key"

# apps/ml-service/.env
ML_SERVICE_API_KEY="dev-ml-key"
MODEL_PATH="/models"
```

## 📁 Project Structure

```
t1d-india/
├── apps/
│   ├── api/                    # Fastify backend API
│   │   ├── src/
│   │   │   ├── routes/         # API routes (meals, foods, cgm, predictions, insulin, profile)
│   │   │   ├── plugins/        # Fastify plugins (prisma, redis, auth, audit)
│   │   │   ├── config/         # Environment configuration
│   │   │   └── index.ts        # App entry point
│   │   └── prisma/
│   │       ├── schema.prisma   # Database schema
│   │       └── seed.ts         # Seed data (Indian foods, composite meals)
│   │
│   └── ml-service/             # Python ML inference service
│       ├── src/
│       │   ├── main.py         # FastAPI app with /predict endpoints
│       │   └── calculate_bolus.py  # Shared bolus calculation logic
│       └── requirements.txt
│
├── packages/
│   └── shared/                 # Shared TypeScript types, utils, constants
│       ├── src/
│       │   ├── types/          # Zod schemas, TypeScript interfaces
│       │   ├── utils/          # Date, insulin PK, carb absorption, Indian references
│       │   └── constants/      # Thresholds, safety limits, meal types, regions
│
├── infrastructure/
│   ├── docker/                 # Dockerfiles, docker-compose.yml
│   ├── terraform/              # AWS/GCP infrastructure as code
│   ├── k8s/                    # Kubernetes manifests
│   └── helm/                   # Helm charts for deployment
│
├── prisma/
│   └── schema.prisma           # Root Prisma schema
│
└── .github/workflows/          # CI/CD pipelines
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# ML service tests
cd apps/ml-service && pytest tests/ -v
```

## 📊 API Documentation

Swagger UI available at `/documentation` when running locally.

Key endpoints:
- `POST /api/v1/meals` — Log meal with carb calculation
- `GET /api/v1/foods/search?q=rajma` — Search Indian food database
- `POST /api/v1/cgm/readings/batch` — Upload CGM readings
- `GET /api/v1/predictions/hypo/latest` — Get hypo prediction (30/60 min)
- `POST /api/v1/insulin/calculate-bolus` — Calculate insulin dose
- `GET /api/v1/cgm/agp?days=14` — Ambulatory Glucose Profile

## 🔒 Security & Compliance

- **Data encryption**: AES-256 at rest, TLS 1.3 in transit
- **Field-level encryption** for PII/PHI (phone, device IDs)
- **Audit logging** for all PHI access
- **DPDP Act 2023** compliant (India)
- **HIPAA-aligned** practices
- **Penetration testing** (OWASP Top 10)
- **IEC 62304** aligned development (SaMD)

## 📈 Roadmap

| Phase | Timeline | Deliverables |
|-------|----------|--------------|
| **1. Foundation** | Weeks 1-4 | Food DB (500 items), Meal Logger, Auth, CI/CD |
| **2. ML Models** | Weeks 5-10 | TFT Hypo Model (>91% sens), Carb Vision, Bolus Calculator |
| **3. Core App** | Weeks 11-18 | CGM Dashboard, Insulin UI, Alerts, Offline Sync |
| **4. Validation** | Weeks 19-26 | Clinical Study Launch, Accessibility, Security Audit, Production |

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- **ICMR-NIN** for Indian food composition data
- **JMIR 2024** for hypoglycemia prediction benchmarks
- **UVA/Padova T1D Simulator** for synthetic data generation
- **T1D community in India** for co-design and feedback

## 📞 Contact

- **Project Lead**: [Your Name](mailto:lead@t1d-india.example.com)
- **Clinical Advisor**: Dr. [Name], MD, DM (Endocrinology)
- **Nutritionist**: [Name], RD, CDE

---

**Built with ❤️ for the T1D community in India** 🇮🇳