# IRB Protocol: AI-Powered Hypoglycemia Prediction for Indian T1D Population

**Protocol Version:** 1.0  
**Date:** November 2024  
**Principal Investigator:** [Name], MD, DM (Endocrinology)  
**Institution:** [AIIMS/PGIMER/Institute Name]  
**Sponsor:** [Institution/Grant Agency]  
**Protocol ID:** T1D-INDIA-HYPO-2024-001  

---

## 1. BACKGROUND AND RATIONALE

### 1.1 Problem Statement
Type 1 Diabetes (T1D) affects approximately 1.25 million people in India, with significant morbidity from hypoglycemia. Current diabetes apps in India (BeatO, Fitterfly, Sugar.fit) target Type 2 diabetes reversal and lifestyle coaching. **None offer insulin dose calculation, carb-counting for Indian meals, or hypoglycemia prediction for T1D users.**

A T1D child eating rajma-chawal at school lunch needs to know the carb content to calculate their insulin bolus — no Indian app provides this.

### 1.2 Current Evidence
- Published ML models achieve >91% sensitivity at 30-60 minute prediction horizons using CGM data (JMIR 2024)
- LSTM and Temporal Fusion Transformer models validated across T1D populations
- **Critical gap:** No models trained/validated on Indian dietary patterns, meal timings, or NPH+Regular insulin regimens (used by ~45% of Indian T1D patients)

### 1.3 Innovation
First AI system combining:
1. **Indian food database** (500+ foods, 100+ composite meals like rajma-chawal, dosa-sambar)
2. **NPH/Regular insulin pharmacokinetics** (peak 4-8h vs rapid-acting 1-2h)
3. **3-phase carb absorption** for Indian mixed meals (dal-rice-roti-sabzi)
4. **Real-time hypoglycemia prediction** with Indian-specific alerts (glucose tablets, sugar, jaggery)

---

## 2. STUDY OBJECTIVES

### 2.1 Primary Objective
Evaluate the efficacy of the AI-powered hypoglycemia prediction system in reducing time spent in hypoglycemia (<70 mg/dL) among Indian T1D patients using the T1D India app over 12 weeks.

### 2.2 Secondary Objectives
1. Reduction in severe hypoglycemia events (<54 mg/dL)
2. Change in HbA1c at 12 weeks
3. Time in Range (70-180 mg/dL) improvement
4. User satisfaction (System Usability Scale ≥80)
5. Hypoglycemia prediction accuracy (sensitivity ≥91% at 30 min)

### 2.3 Exploratory Objectives
1. Carb estimation accuracy for Indian meals (±15g)
2. Insulin dose calculator safety (zero severe adverse events)
3. Family/caregiver alert utilization

---

## 3. STUDY DESIGN

### 3.1 Design
Prospective, single-arm, open-label, multicenter interventional study

### 3.2 Duration
- **Screening:** 2 weeks
- **Run-in:** 2 weeks (CGM baseline)
- **Intervention:** 12 weeks
- **Follow-up:** 4 weeks
- **Total:** ~18 weeks per participant

### 3.3 Sample Size
- **Primary endpoint:** % time <70 mg/dL
- **Assumptions:** Baseline 8% time <70 mg/dL, SD 5%, expected 30% relative reduction
- **Power:** 80%, α=0.05 (one-sided), correlation 0.5
- **Calculated N:** 44 patients
- **With 15% dropout:** **Enroll 52 patients**

### 3.4 Sites
1. AIIMS New Delhi (Endocrinology)
2. PGIMER Chandigarh (Endocrinology)
3. [Additional sites as needed]

---

## 4. PARTICIPANTS

### 4.1 Inclusion Criteria
1. Age 5-65 years
2. Clinical diagnosis of T1D ≥1 year
3. Using CGM (Dexcom G6/G7, Libre 2/3, or Medtronic Guardian) for ≥3 months
4. On insulin therapy (any regimen: NPH+Regular, basal-bolus, premixed, or pump)
5. HbA1c ≤10% at screening
6. Willing to use smartphone app daily
7. Fluent in English, Hindi, or one supported regional language
8. Informed consent (assent for minors + parent consent)

### 4.2 Exclusion Criteria
1. Pregnancy or planning pregnancy
2. Severe hypoglycemia unawareness (Gold score ≥4)
3. End-stage renal disease (eGFR <15)
4. Active malignancy
5. Psychiatric condition impairing consent
6. Participation in another interventional trial
7. Inability to use smartphone/CGM

### 4.3 Withdrawal Criteria
- Withdrawal of consent
- Pregnancy
- Serious adverse event related to app
- Non-compliance (<50% app usage for 2 consecutive weeks)
- Physician decision

---

## 5. INTERVENTION

### 5.1 T1D India App Features
1. **Meal Logging:** Text/voice/photo entry with Indian food database
2. **Carb Estimation:** ML vision + OCR for Indian meals
3. **Insulin Calculator:** Bolus + correction with NPH/Regular PK
4. **Hypo Prediction:** 30/60-min alerts with Indian carb options
5. **CGM Integration:** Dexcom, Libre, Medtronic via API/Bluetooth
6. **Family Mode:** Caregiver alerts with escalation
7. **Offline Mode:** Full functionality without internet

### 5.2 Alert Thresholds
| Alert Level | Glucose | Probability | Action |
|-------------|---------|-------------|--------|
| Warning | <70 mg/dL predicted | >50% | Prepare 15g carbs |
| Urgent | <70 mg/dL predicted | >70% | Eat 15g carbs NOW |
| Emergency | <54 mg/dL predicted | >30% | Eat 20g carbs + call emergency |

### 5.3 Indian Carb Options for Hypo Treatment
1. Glucose tablets (3-4 tabs = 12-16g)
2. Sugar/honey (1 tbsp = 12-17g)
3. Fruit juice (150-200ml = 15-20g)
4. Regular soda (150ml = 15g)
5. Banana (1 small = 18g)
6. Dates (2-3 = 15g)
7. Raisins (1 tbsp = 12g)

---

## 6. OUTCOMES

### 6.1 Primary Endpoint
**Change in % time glucose <70 mg/dL** from baseline (run-in) to week 12

### 6.2 Secondary Endpoints
1. % time <54 mg/dL (severe hypoglycemia)
2. % time 70-180 mg/dL (Time in Range)
3. HbA1c change at week 12
3. Number of hypoglycemia events (<70 mg/dL)
4. Number of severe hypoglycemia events (<54 mg/dL)
5. System Usability Scale (SUS) score
4. App engagement (≥80% days with ≥1 meal log)

### 6.3 Safety Endpoints
1. Severe adverse events (SAEs)
2. Device-related adverse events
3. Hypoglycemia-related injuries
5. Diabetic ketoacidosis (DKA) events

### 6.4 Technical Metrics
1. Hypo prediction sensitivity/specificity
2. Carb estimation MAE (±15g target)
3. App uptime (>99.5%)
5. Data sync success rate (>99%)

---

## 7. STATISTICAL ANALYSIS

### 7.1 Primary Analysis
- **Paired t-test** (or Wilcoxon signed-rank) comparing baseline vs week 12 % time <70 mg/dL
- **Significance:** p<0.05 (one-sided)
- **Effect size:** Cohen's d with 95% CI

### 7.2 Secondary Analyses
- Mixed-effects models for repeated measures
- Subgroup analyses: age groups, regimen types, baseline HbA1c
- Per-protocol and intention-to-treat analyses

### 7.3 Hypoglycemia Prediction Metrics
- Sensitivity/Specificity at 30/60 min
- ROC-AUC, Precision-Recall AUC
- Brier score, calibration plots
- Time-to-alert distribution

### 7.4 Missing Data
- Multiple imputation for missing CGM (>15% gap)
- Last observation carried forward for HbA1c
- Sensitivity analysis with complete cases only

### 7.5 Interim Analysis
- **Timing:** After 50% enrollment completes 12 weeks
- **Stopping rules:** Futility (conditional power <20%), safety (SAE rate >5%)
- **DSMB:** Independent Data Safety Monitoring Board

---

## 8. SAFETY MONITORING

### 8.1 Adverse Event Reporting
- **SAEs:** Report to IRB/EC within 24 hours
- **Device events:** Report to CDSCO within 7 days
- **Hypoglycemia events:** Tracked automatically via app

### 8.2 Safety Monitoring
- Weekly review of hypo alerts by study team
- Monthly DSMB review
- Real-time alert for severe hypo (<54 mg/dL) >30 min

### 8.3 Risk Mitigation
- **App disclaimer:** Not a medical device; confirm with glucose meter
- **Fallback:** Manual glucose entry if CGM fails
- **Emergency protocol:** In-app 108 (India emergency) dialing
- **Clinical support:** 24/7 study coordinator contact

---

## 9. DATA MANAGEMENT

### 9.1 Data Collection
- **Source:** App (CGM, meals, insulin, alerts), CGM cloud, HbA1c lab
- **Frequency:** Real-time CGM, daily meals/insulin, quarterly HbA1c

### 9.2 Data Storage
- **Server:** Encrypted AWS/GCP (India region)
- **Encryption:** AES-256 at rest, TLS 1.3 in transit
- **Backup:** Daily encrypted backups, 90-day retention

### 9.3 Privacy & Compliance
- **DPDP Act 2023** (India) compliant
- **De-identification:** Patient IDs hashed, no PHI in analytics
- **Consent:** Granular (clinical, research, marketing)
- **Right to deletion:** 30-day fulfillment

### 9.4 Data Sharing
- **De-identified aggregate:** Research publications
- **Individual data:** Only with explicit consent
- **Data use agreement:** Required for external collaborators

---

## 10. ETHICAL CONSIDERATIONS

### 10.1 Vulnerable Populations
- **Minors (5-17 years):** Parental consent + child assent (≥7 years)
- **Low literacy:** Voice/Hindi interface, family support
- **Economic diversity:** Free app, no data charges (offline mode)

### 10.2 Informed Consent
- **Process:** Electronic + paper, bilingual (English + local language)
- **Elements:** Purpose, procedures, risks, benefits, alternatives, withdrawal rights
- **Re-consent:** At major protocol amendments

### 10.3 Equitable Access
- **Free app** during and after study
- **Multi-language:** English, Hindi, Tamil, Telugu, Marathi, Gujarati, Bengali
- **Offline-first:** Works in rural areas with poor connectivity

---

## 11. REGULATORY

### 10.1 Approvals Required
1. **IRB/EC Approval:** AIIMS/PGIMER Ethics Committee
2. **CTRI Registration:** Clinical Trials Registry - India (before enrollment)
3. **CDSCO:** Software as Medical Device (SaMD) consultation
4. **DPDP Act 2023:** Data Protection Impact Assessment

### 10.2 Regulatory Classification
- **CDSCO SaMD Guidance 2022:** Clinical Decision Support Software
- **Risk Class:** Class B (Clinical decision support, non-diagnostic)
- **IEC 62304:** Medical device software lifecycle processes

### 10.3 Post-Market Surveillance
- **PMS Plan:** Annual safety reports to CDSCO
- **Adverse Event Reporting:** Per MDR 2017
- **Software Updates:** Change control per IEC 62304

---

## 11. TIMELINE

| Phase | Duration | Milestone |
|-------|----------|-----------|
| **Preparation** | Months 1-3 | IRB approval, CTRI registration, site initiation |
| **Enrollment** | Months 4-10 | 52 patients across 3 sites |
| **Intervention** | Months 4-22 | 12 weeks per patient |
| **Follow-up** | Months 10-24 | 4-week post-intervention |
| **Analysis** | Months 22-24 | Statistical analysis, manuscript prep |
| **Dissemination** | Months 24-27 | Publications, regulatory submissions |

---

## 12. BUDGET (INR)

| Category | Amount (INR) |
|----------|--------------|
| Personnel (PI, coordinators, statisticians) | 45,00,000 |
| CGM sensors (Dexcom G7/Libre 3 × 52 × 16 weeks) | 35,00,000 |
| Smartphone/data for participants | 8,00,000 |
| HbA1c lab tests (4 × 52) | 6,00,000 |
| Travel/accommodation (multi-site) | 5,00,000 |
| IRB/CTRI/CDSCO fees | 3,00,000 |
| Data management/cloud | 4,00,000 |
| Statistical analysis | 3,00,000 |
| Publications/open access | 2,00,000 |
| **Contingency (10%)** | **11,10,000** |
| **TOTAL** | **1,22,10,000** |

---

## 13. REFERENCES

1. JMIR 2024: "LSTM-based hypoglycemia prediction achieving >91% sensitivity at 30-60 min"
2. BMC Med Inform Decis Mak 2023: "Temporal Fusion Transformers for glucose forecasting"
3. Indian J Endocrinol Metab 2022: "NPH + Regular insulin usage patterns in Indian T1D"
4. Diabetes Ther 2021: "Pharmacokinetics of human insulin vs analogues in South Asians"
5. ICMR-NIN 2017: "Nutritive Value of Indian Foods" (Longvah et al.)
5. CDSCO 2022: "Guidance on Software as Medical Device (SaMD)"
6. DPDP Act 2023: Digital Personal Data Protection Act (India)
7. IEC 62304: Medical device software lifecycle processes

---

## 14. APPENDICES

### Appendix A: Informed Consent Form (English/Hindi)
### Appendix B: Assent Form for Minors (7-17 years)
### Appendix C: Case Report Forms (CRFs)
### Appendix C: Data Collection Schedule
### Appendix D: Adverse Event Reporting Form
### Appendix E: System Usability Scale (SUS) Questionnaire
### Appendix F: Emergency Protocol Card
### Appendix G: Patient Quick-Start Guide (Multilingual)

---

**Signature Page**

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Principal Investigator | | | |
| Co-Investigator | | | |
| IRB Chair | | | |
| Study Coordinator | | | |
| Statistician | | | |

---

*Protocol Version 1.0 | Date: November 2024 | Confidential*