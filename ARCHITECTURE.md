# T1D India - Architecture Decision Records (ADRs)

## ADR-001: Monorepo Structure
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: Need to share types, utilities, and constants between API, ML service, and frontend.

**Decision**: Use npm workspaces with three packages:
- `apps/api` - Fastify backend
- `apps/ml-service` - Python FastAPI ML inference
- `packages/shared` - Shared TypeScript types, utils, constants
- `apps/web` - Next.js frontend

**Consequences**: Single `npm install`, shared types prevent drift, atomic commits across services.

---

## ADR-002: Fastify over Express
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: Need high-performance API with TypeScript support.

**Decision**: Use Fastify with `@fastify/*` plugins for auth, rate-limit, swagger, multipart.

**Consequences**: Better performance, built-in validation, plugin ecosystem. Slightly steeper learning curve than Express.

---

## ADR-003: Prisma ORM with PostgreSQL + TimescaleDB
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: Need type-safe database access with time-series support for CGM data.

**Decision**: Prisma for relational data, TimescaleDB hypertable for CGM readings.

**Consequences**: Type-safe queries, automatic migrations, TimescaleDB continuous aggregates for AGP reports. Migration complexity for hypertable features.

---

## ADR-004: ONNX Runtime for ML Inference
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: Need to serve PyTorch models in production with low latency.

**Decision**: Export models to ONNX, serve with ONNX Runtime (Python FastAPI).

**Consequences**: Hardware acceleration (CPU/GPU), language agnostic, model versioning. Requires ONNX export pipeline.

---

## ADR-005: Temporal Fusion Transformer for Hypo Prediction
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: Need >91% sensitivity at 30-min horizon for Indian T1D population.

**Decision**: TFT with quantile regression (P10/P50/P90), Indian-specific features:
- NPH/Regular insulin PK (two-compartment model)
- 3-phase carb absorption for Indian meals
- Regimen type embedding (basal-bolus, NPH+Regular, premixed, pump)

**Consequences**: State-of-the-art accuracy, explainable via attention weights. Higher compute than LSTM.

---

## ADR-006: Indian Food Database Design
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: Western apps lack Indian foods (dosa, rajma-chawal, thali).

**Decision**: 
- 500+ atomic foods from ICMR-NIN/USDA/FSSAI
- 100+ composite meals (rajma-chawal, dosa-sambar, etc.)
- JSONB components for flexible meal structures
- Regional names (Hindi, Tamil, Telugu, etc.)
- Reference objects (katori, chapati, ladle) for portion estimation

**Consequences**: Accurate carb counting for Indian meals. Requires nutritionist verification.

---

## ADR-007: Insulin PK Models for Indian Regimens
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: Most Indian T1D patients use NPH + Regular insulin, not rapid-acting analogues.

**Decision**: Two-compartment PK models with South Asian parameters:
- Rapid-acting: ka=0.018, ke=0.012, t_max=60min
- Regular human: ka=0.008, ke=0.006, t_max=120min  
- NPH: ka=0.003, ke=0.002, t_max=360min
- Premixed 30/70: biphasic model

**Consequences**: Accurate IOB calculation for Indian regimens. Bolus calculator adjusts for NPH peak (4-8h).

---

## ADR-008: Offline-First PWA Architecture
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: Schools/rural India have poor connectivity.

**Decision**: 
- Service Worker caches shell + API responses
- IndexedDB stores meals, CGM, insulin logs locally
- Background Sync API queues mutations
- Conflict resolution: last-write-wins with server timestamp

**Consequences**: Works offline, syncs when online. Requires careful conflict resolution for medical data.

---

## ADR-009: Next.js 14 App Router for Frontend
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: Need SEO, SSR, PWA, great DX for medical app.

**Decision**: Next.js 14 with App Router, React Server Components, Tailwind CSS.

**Consequences**: Excellent performance, built-in PWA support, great TypeScript integration. Server components reduce bundle size.

---

## ADR-010: Clerk for Authentication
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: Need HIPAA-compliant auth with MFA, SOC2.

**Decision**: Clerk for auth (email, phone, social), JWT tokens for API.

**Consequences**: Offloads auth complexity, HIPAA-ready, webhooks for user sync. Vendor dependency.

---

## ADR-011: TimescaleDB for CGM Time-Series
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: CGM generates 288 readings/day per user. Need fast aggregations for AGP reports.

**Decision**: TimescaleDB hypertable with:
- 1-day chunks
- Compression after 7 days
- Continuous aggregates for hourly stats
- Percentile approximations for AGP

**Consequences**: Sub-second AGP queries, automatic data lifecycle. TimescaleDB-specific features.

---

## ADR-012: Synthetic Data for ML Training
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: Clinical data access delayed; need to start ML training immediately.

**Decision**: 
- UVA/Padova T1D Simulator for CGM generation
- BlenderProc for 500k synthetic Indian food images
- Domain randomization (lighting, plates, clutter)
- Transfer learning from Food-101, Nutrition5k

**Consequences**: Start ML development Week 1. Domain gap requires real data fine-tuning.

---

## ADR-013: Clinical Validation Study Design
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: Medical device requires clinical evidence.

**Decision**: Prospective single-arm study:
- 50 T1D patients, 12 weeks
- Primary: % time <70 mg/dL reduction vs baseline
- Sites: AIIMS, PGIMER, or similar
- IRB/EC approval, DPDP Act 2023 compliant

**Consequences**: Regulatory pathway for SaMD classification. 6-month timeline to interim results.

---

## ADR-014: Security & Compliance
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: Health data requires DPDP Act 2023 (India) and HIPAA alignment.

**Decision**:
- Field-level encryption (AES-256-GCM) for PII/PHI
- Envelope encryption with KMS-managed KEK
- Structured audit logging for all PHI access
- Penetration testing (OWASP Top 10)
- Data retention/deletion policies

**Consequences**: Compliance from Day 1. Performance overhead for encryption.

---

## ADR-015: Kubernetes Deployment with Helm
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: Need scalable, observable production deployment.

**Decision**: 
- EKS/GKE with 3 node pools (general, ml-inference GPU, data-processing)
- Helm chart with values per environment
- HPA for API (CPU/memory) and ML (custom metrics)
- Prometheus/Grafana monitoring
- ArgoCD for GitOps

**Consequences**: Production-grade from start. Operational complexity.

---

## ADR-016: CI/CD with GitHub Actions
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: Need automated testing, building, deployment.

**Decision**: 
- Lint → TypeCheck → Unit Tests → Integration Tests → ML Tests
- Build multi-arch Docker images
- Deploy to staging on develop branch
- Deploy to production on main branch (manual approval)
- Smoke tests post-deployment

**Consequences**: Fast feedback, reliable deployments. Requires secrets management.

---

## ADR-017: Indian-Specific UX Decisions
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: Western UX patterns don't fit Indian users.

**Decision**:
- Hindi/Devanagari font (Noto Sans Devanagari)
- Hinglish voice input support
- Reference objects: katori (150g), chapati (30g), ladle (60g)
- Meal types: South Indian breakfast, North Indian lunch, etc.
- Festival/occasion tags for meals
- Family/caregiver mode for child T1D

**Consequences**: Culturally appropriate UX. Requires localization maintenance.

---

## ADR-018: ML Model Monitoring
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: Model drift in production affects patient safety.

**Decision**: Evidently AI for monitoring:
- Data drift detection (feature distributions)
- Target drift detection (prediction distributions)
- Performance monitoring (MAE, RMSE, calibration)
- Automated retraining pipeline trigger

**Consequences**: Proactive model health. Requires labeled production data.

---

## ADR-019: Federated Learning Roadmap
**Status**: Proposed  
**Date**: 2026-11-19

**Context**: Future: continuous learning without data leaving device.

**Decision**: Design for future federated learning:
- Local model updates on device
- Secure aggregation server
- Differential privacy for updates
- Model versioning with MLflow

**Consequences**: Architecture ready for Phase 2. Not in MVP.

---

## ADR-020: Open Science Commitment
**Status**: Accepted  
**Date**: 2026-11-19

**Context**: Build trust with medical community.

**Decision**: 
- Publish model cards (Google Model Card Toolkit)
- Publish datasheets for datasets
- Release synthetic data generation code
- Open-source non-clinical components

**Consequences**: Community trust, reproducibility. IP considerations for clinical components.