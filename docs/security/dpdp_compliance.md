# DPDP Act 2023 Compliance - T1D India Platform

**Version:** 1.0  
**Date:** November 2024  
**Data Protection Officer:** [Name/Contact]  
**Classification:** Confidential  

---

## 1. OVERVIEW

The Digital Personal Data Protection Act, 2023 (DPDP Act) is India's comprehensive data protection law. This document outlines how the T1D India platform achieves compliance.

**Applicability:** The platform processes digital personal data of Indian citizens (Data Principals) for healthcare purposes.

**Legal Basis:** Section 7 - Processing for medical purposes, public health, and legitimate interests.

---

## 2. DATA MAPPING

### 2.1 Personal Data Categories Processed

| Category | Data Fields | Purpose | Legal Basis | Retention |
|----------|-------------|---------|-------------|-----------|
| **Identity** | Name, email, phone, date of birth, gender | Account management, clinical care | Consent + Medical purpose | Account life + 3 years |
| **Health** | CGM readings, meals, insulin logs, HbA1c, diabetes type, regimen | Clinical care, hypo prediction, alerts | Medical purpose (Sec 7) | 7 years (clinical records) |
| **Device** | CGM serial, pump type, device IDs | Integration, sync | Legitimate interest | Device life + 1 year |
| **Location** | City, state, timezone | Regional meal database, timezone | Legitimate interest | Session only |
| **Technical** | IP, device fingerprint, app version | Security, analytics, debugging | Legitimate interest | 90 days |
| **Family** | Caregiver contacts, relationships | Shared alerts, escalation | Consent | Family group life |

### 2.2 Special Category Data (Health Data)
- **Explicit Consent:** Obtained at registration for health data processing
- **Medical Purpose:** Processing for preventive/occupational medicine, public health
- **Professional Secrecy:** Processed by healthcare professionals bound by secrecy

---

## 3. CONSENT MANAGEMENT

### 3.1 Consent Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    CONSENT LAYERS                             │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Essential (Account)                                │
│  ├── Email/phone verification                                │
│  ├── Security communications                                 │
│  └── Legal notices                                           │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Clinical Care (Explicit)                           │
│  ├── Health data processing                                  │
│  ├── CGM/meal/insulin logging                                │
│  ├── Hypoglycemia prediction                                 │
│  └── Insulin dose calculation                                │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Family Sharing (Granular)                          │
│  ├── Glucose data sharing                                    │
│  ├── Alert sharing                                           │
│  ├── Meal/insulin sharing                                    │
│  └── Emergency contact access                                │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Research & Analytics (Optional)                    │
│  ├── Anonymized research participation                       │
│  ├── Product improvement analytics                           │
│  └── Marketing communications                                │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Consent Records
| Consent ID | User | Purpose | Status | Timestamp | Withdrawal |
|------------|------|---------|--------|-----------|------------|
| C-001 | user_123 | Clinical care | ✅ Granted | 2024-01-15 | Available |
| C-002 | user_123 | Family sharing | ✅ Granted | 2024-01-15 | Available |
| C-003 | user_123 | Research | ❌ Denied | 2024-01-15 | N/A |
| C-004 | user_123 | Marketing | ❌ Denied | 2024-01-15 | N/A |

### 3.3 Consent Withdrawal
- **Mechanism:** One-click in Settings > Privacy
- **Effect:** Immediate cessation of processing for that purpose
- **Exceptions:** Legal obligations, vital interests, established legal claims
- **Timeline:** Processing stops within 24 hours
- **Confirmation:** Email/SMS confirmation sent

---

## 4. DATA PRINCIPAL RIGHTS

### 4.1 Rights Implementation

| Right | Implementation | SLA |
|-------|----------------|-----|
| **Access** | Self-service dashboard + API | 24 hours |
| **Correction** | Self-service profile edit | Immediate |
| **Erasure** | "Delete Account" in Settings | 30 days |
| **Portability** | JSON/CSV export in Settings | 24 hours |
| **Restriction** | Toggle processing in Settings | Immediate |
| **Objection** | Toggle per-purpose in Settings | Immediate |
| **Automated Decisions** | Human review on request | 72 hours |

### 4.2 Rights Fulfillment Process
```
1. Request received (UI/Email/API)
    ↓
2. Identity verification (OTP/Email)
    ↓
3. Request validation (scope, exceptions)
    ↓
4. Execution (automated where possible)
    ↓
4. Confirmation to Data Principal
    ↓
5. Audit log entry
```

### 4.3 Grievance Redressal
- **Grievance Officer:** [Name/Email/Phone]
- **Response Time:** 7 days (acknowledgment), 30 days (resolution)
- **Escalation:** Data Protection Board of India
- **Languages:** English, Hindi, 10 regional languages

---

## 5. DATA PROTECTION BY DESIGN

### 5.1 Privacy by Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Data Minimization** | Only collect: name, contact, health data needed for care |
| **Purpose Limitation** | Strict purpose binding per consent layer |
| **Storage Limitation** | Auto-deletion per retention schedule |
| **Accuracy** | User-editable profiles, clinical validation |
| **Integrity/Confidentiality** | AES-256, TLS 1.3, field-level encryption |
| **Accountability** | DPO oversight, audit logs, DPIAs |

### 5.2 Technical Measures

| Measure | Implementation |
|---------|----------------|
| **Pseudonymization** | Patient IDs hashed (SHA-256 + salt) in analytics |
| **Field-level Encryption** | Phone, device IDs, location (AES-256-GCM) |
| **Access Controls** | RBAC + ABAC, least privilege |
| **Audit Logging** | All PHI access logged (immutable) |
| **Data Loss Prevention** | DLP rules for PHI in logs/exports |

---

## 6. DATA PROTECTION IMPACT ASSESSMENT (DPIA)

### 6.1 DPIA Summary
- **High Risk Processing:** Yes (health data, vulnerable populations, automated decisions)
- **DPIA Completed:** Yes (Date: 2024-11)
- **Risk Level:** Medium-High (mitigated to Low)
- **Review Date:** Annual or on material change

### 6.2 Key Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation | Residual |
|------|------------|--------|------------|----------|
| Health data breach | Medium | Critical | Encryption, access controls, monitoring | Low |
| Automated hypo alerts error | Low | High | Clinical validation, human oversight | Low |
| Family data misuse | Low | High | Granular permissions, audit | Low |
| Cross-border transfer | Low | High | India-only hosting | Low |
| Re-identification | Low | High | K-anonymity, differential privacy | Low |

---

## 6. DATA PROCESSING AGREEMENTS

### 6.1 Sub-processors

| Sub-processor | Purpose | Location | Safeguards |
|---------------|---------|----------|------------|
| AWS/GCP | Cloud hosting | India (Mumbai) | DPA, SCC, encryption |
| Clerk | Authentication | US/EU | SCC, BCR |
| Dexcom/Libre/Medtronic | CGM data | US/EU | DPA, API contracts |
| SendGrid/Twilio | Notifications | US | SCC, DPF |
| Sentry | Error tracking | US | SCC |
| MLflow | Model tracking | Self-hosted | On-premise |

### 6.2 International Transfers
- **Primary:** All data stored/processed in India (Mumbai region)
- **Exceptions:** Clerk auth (US), CGM vendors (US/EU)
- **Safeguards:** Standard Contractual Clauses (SCCs), adequacy where available

---

## 7. DATA BREACH MANAGEMENT

### 7.1 Breach Response Plan

```
1. DETECT (0-1 hour)
   ├── Automated alerts (SIEM, DLP, anomaly detection)
   ├── User reports (support@, in-app)
   └── Third-party notifications

2. ASSESS (1-4 hours)
   ├── Severity classification (Critical/High/Medium/Low)
   ├── Data categories affected
   ├── Number of Data Principals
   └── Likely consequences

3. NOTIFY (4-72 hours)
   ├── DPDP Board: Within 72 hours (Critical/High)
   ├── Affected Data Principals: Without undue delay (High)
   ├── Regulatory (CDSCO for SaMD): As required
   └── Law enforcement: If criminal

4. CONTAIN & REMEDIATE (24-72 hours)
   ├── Isolate affected systems
   ├── Revoke compromised credentials
   ├── Patch vulnerabilities
   └── Restore from clean backups

5. RECOVER & REVIEW (1-30 days)
   ├── Restore normal operations
   ├── Post-incident review
   ├── Update controls
   └── Report to Board/Regulator
```

### 7.2 Notification Templates

**To Data Principals (Email/SMS/Push):**
> Subject: Important: Your T1D India Data Security
> 
> We detected a security incident affecting [data categories]. 
> Your [specific data] may have been accessed. 
> We have [actions taken]. 
> Recommended: [password reset, monitor accounts, etc.]
> Contact: privacy@t1d-india.example.com

**To DPDP Board:**
> Prescribed format per DPDP Rules 2024

---

## 8. RECORDS OF PROCESSING ACTIVITIES (ROPA)

### 8.1 Processing Activity Register

| Activity | Purpose | Legal Basis | Categories | Recipients | Retention | Safeguards |
|----------|---------|-------------|------------|------------|-----------|------------|
| User registration | Account mgmt | Consent | Identity, contact | Internal | Account life + 3y | Encryption, MFA |
| Clinical data processing | Care, hypo prediction | Medical purpose (Sec 7) | Health, CGM, meals, insulin | Clinicians, family (consent) | 7 years | Encryption, RBAC, audit |
| CGM integration | Real-time monitoring | Legitimate interest | CGM readings | CGM vendor API | 1 year | Encrypted transit/storage |
| Family sharing | Caregiver alerts | Consent | Glucose, alerts, meals | Family members | Family group life | Granular consent, audit |
| Insulin calculator | Dose recommendation | Medical purpose | Glucose, carbs, IOB | Internal | 3 years | Validation, safety checks |
| Analytics/ML | Model improvement | Consent/Anonymized | Aggregated health | Internal data science | 3 years | Anonymization, DP |
| Security monitoring | Threat detection | Legitimate interest | Logs, IP, device | Security team | 90 days | Encryption, access control |

---

## 9. DATA PROTECTION OFFICER (DPO)

### 9.1 DPO Details
- **Name:** [Name]
- **Contact:** dpo@t1d-india.example.com / +91-XX-XXXX-XXXX
- **Qualifications:** CIPP/E, CIPM, Healthcare privacy certification
- **Independence:** Reports to Board, independent of operations
- **Resources:** Dedicated budget, legal counsel access, training budget

### 9.2 DPO Responsibilities
- Monitor DPDP compliance
- Advise on DPIAs
- Cooperate with Data Protection Board
- Handle Data Principal requests
- Staff training & awareness
- Breach notification coordination
- Annual compliance report to Board

---

## 10. TRAINING & AWARENESS

### 10.1 Training Program

| Audience | Frequency | Topics |
|----------|-----------|--------|
| All Staff | Annual | DPDP basics, breach reporting, phishing |
| Developers | Quarterly | Secure coding, privacy by design |
| Clinical Staff | Bi-annual | Health data handling, consent |
| Support Team | Quarterly | Data subject requests, escalation |
| New Hires | Onboarding | Privacy fundamentals, incident reporting |

### 9.2 Awareness Campaigns
- **Data Privacy Week** (January): User education, tips
- **Cybersecurity Month** (October): Phishing, device security
- **Regular Updates:** Monthly security newsletter

---

## 10. AUDIT & MONITORING

### 10.1 Internal Audits
| Audit | Frequency | Scope | Owner |
|-------|-----------|-------|-------|
| DPDP Compliance | Quarterly | All processing | DPO |
| Technical Controls | Monthly | Encryption, access, logs | Security Lead |
| Vendor Compliance | Semi-annual | Sub-processors | DPO |
| Breach Readiness | Quarterly | IR plan, drills | Security Lead |

### 10.2 Key Metrics
| KPI | Target | Current |
|-----|--------|---------|
| Consent capture rate | 100% | |
| Request fulfillment (24h) | 100% | |
| Breach notification (72h) | 100% | |
| Data minimization ratio | >90% | |
| Encryption coverage | 100% | |
| Staff training completion | 100% | |

---

## 11. CHILDREN'S DATA (MINORS)

### 11.1 Special Protections
- **Age Verification:** Date of birth at registration
- **Parental Consent:** Required for <18 years (digital signature)
- **Enhanced Minimization:** No marketing, no profiling
- **Guardian Access:** Full visibility/control for <13 years
- **Age-Appropriate Design:** Simplified UI, voice-first, larger fonts

### 11.2 Age Verification Process
1. DOB at registration → calculates age
2. If <18 → Parental consent flow triggered
3. Parent verifies via OTP/Email → Consent recorded
4. Annual re-verification until 18

---

## 12. CONTINUOUS IMPROVEMENT

### 12.1 Feedback Loops
- **Monthly:** DPO reviews metrics, incidents
- **Quarterly:** Board privacy review
- **Annual:** External audit, policy update
- **Ad-hoc:** Regulatory changes, incidents

### 12.2 Version Control
| Version | Date | Changes | Approved By |
|---------|------|---------|-------------|
| 1.0 | Nov 2024 | Initial | DPO, CTO, Legal |
| | | | |

---

**Document Control**
- **Owner:** Data Protection Officer
- **Review Cycle:** Annual or on material change
- **Classification:** CONFIDENTIAL
- **Distribution:** Board, DPO, Legal, Security, Engineering Leads

---

*End of DPDP Compliance Document*