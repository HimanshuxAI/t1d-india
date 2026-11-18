# AI-Powered T1D Management for Indian Diets
## Presentation Deck for Guide Review

---

### Slide 1: The Problem
**No Indian app solves the T1D child's lunch problem: rajma-chawal → carb count → insulin dose → hypo prevention.**

---

### Slide 2: The Gap
**BeatO, Fitterfly, Sugar.fit target T2D reversal — zero support for T1D insulin dosing, Indian carb counting, or hypo prediction.**

---

### Slide 3: Our Solution
**One app: Indian food database + ML hypo prediction (30/60 min) + insulin calculator for NPH/Regular regimens + offline-first PWA.**

---

### Slide 4: Technical Differentiator #1
**First hypoglycemia model trained on Indian meal patterns (high-carb, late dinner) + NPH/Regular insulin pharmacokinetics — not Western rapid-acting analogues.**

---

### Slide 5: Technical Differentiator #2
**Composite meal intelligence: "dal-chawal-sabzi-roti" logged as one entry, not four — portion estimation via reference objects (katori, chapati) + vision ML.**

---

### Slide 6: Technical Differentiator #3
**Offline-first architecture: CGM + meals + insulin sync when connectivity returns — critical for school/rural India.**

---

### Slide 7: Clinical Validation Plan
**Prospective 12-week study (50 T1D patients, AIIMS/PGIMER): primary endpoint = % time <70 mg/dL reduction vs baseline.**

---

### Slide 8: 6-Month Roadmap
| Month | Deliverable |
|-------|-------------|
| 1 | Food DB (500 items) + Meal Logger |
| 2-3 | Hypo Model (>91% sens @ 30min) + Carb Vision |
| 4-5 | Full App (CGM, Insulin Calc, Alerts, Offline) |
| 6 | Clinical Study Launch + Production Release |

---

### Slide 9: Team & Budget
**8-person team (3 ML, 3 Full-stack, 1 UX, 1 DevOps) + clinical advisors — ₹3.1-4.2Cr over 6 months (phased MVP at ₹1.5-2Cr).**

---

### Slide 10: Why This Wins
**Only T1D tool built for how Indians actually eat, inject, and live — clinically validated from Day 1, not as an afterthought.**

---

## Appendix Slides (if deeper dive requested)

### A1: Model Architecture
**Temporal Fusion Transformer with NPH/Regular PK curves + Indian carb absorption profiles — quantile regression for calibrated 30/60-min predictions.**

### A2: Food Database Strategy
**ICMR-NIN + USDA + FSSAI cross-referenced; 200 verified at launch, crowdsourced expansion; nutritionist-reviewed top 100.**

### A3: Safety & Compliance
**IEC 62304-aligned dev; CDSCO SaMD consultation; DPDP Act 2023 compliant; audit logs; penetration testing pre-launch.**

### A4: Synthetic Data Pipeline
**UVA/Padova T1D Simulator + Indian meal/insulin parameters → 1000 virtual patients → pre-training before real data arrives.**

### A5: Monetization & Sustainability
**B2B: hospital/clinic licenses; B2C: freemium (core free, advanced insights paid); CSR/grant funding for underserved populations.**