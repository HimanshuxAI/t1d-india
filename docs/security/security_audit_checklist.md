# Security Audit Checklist - T1D India Platform

**Version:** 1.0  
**Date:** November 2024  
**Classification:** Confidential  
**Auditor:** [Name/Organization]  

---

## 1. APPLICATION SECURITY

### 1.1 Authentication & Authorization
| Check | Status | Evidence | Remarks |
|-------|--------|----------|---------|
| MFA enforced for all users | ☐ | | TOTP/SMS/WebAuthn |
| Password policy enforced | ☐ | | Min 12 chars, complexity, rotation |
| Account lockout after failed attempts | ☐ | | 5 attempts, 15-min lockout |
| Session management secure | ☐ | | HttpOnly, Secure, SameSite cookies |
| JWT tokens properly signed/validated | ☐ | | RS256, short expiry (15min) |
| Refresh token rotation | ☐ | | One-time use, revocation |
| Role-based access control (RBAC) | ☐ | | Patient/Caregiver/Clinician/Admin |
| Session timeout enforced | ☐ | | 30 min idle, absolute 8 hours |
| Concurrent session limit | ☐ | | Max 3 per user |

### 1.2 Input Validation & Output Encoding
| Check | Status | Evidence | Remarks |
|-------|--------|----------|---------|
| Server-side validation all inputs | ☐ | | Allow-list validation |
| SQL injection prevention | ☐ | | Parameterized queries/ORM |
| XSS prevention | ☐ | | CSP headers, output encoding |
| CSRF protection | ☐ | | Synchronizer tokens |
| File upload validation | ☐ | | Type, size, malware scan |
| API rate limiting | ☐ | | 100 req/min per user |
| Input sanitization for ML pipeline | ☐ | | Image/audio validation |

### 1.3 API Security
| Check | Status | Evidence | Remarks |
|-------|--------|----------|---------|
| Authentication required for all endpoints | ☐ | | JWT Bearer tokens |
| API versioning | ☐ | | URL versioning (/api/v1/) |
| Request/response schema validation | ☐ | | OpenAPI/Zod schemas |
| Sensitive data not in URLs/logs | ☐ | | Body params only |
| CORS properly configured | ☐ | | Specific origins only |
| API gateway/WAF deployed | ☐ | | Kong/AWS WAF |

---

## 2. DATA PROTECTION

### 2.1 Encryption
| Check | Status | Evidence | Remarks |
|-------|--------|----------|---------|
| TLS 1.3 enforced everywhere | ☐ | | TLS 1.2 minimum |
| Data at rest encrypted (AES-256) | ☐ | | Database, S3, backups |
| Field-level encryption for PHI | ☐ | | Phone, device IDs, location |
| Key management (KMS/HSM) | ☐ | | AWS KMS / HashiCorp Vault |
| Key rotation policy | ☐ | | Annual rotation |
| Certificate management | ☐ | | Automated renewal (Let's Encrypt) |

### 2.2 Data Minimization & Retention
| Check | Status | Evidence | Remarks |
|-------|--------|----------|---------|
| Data collection minimized | ☐ | | Only necessary fields |
| Retention policy defined | ☐ | | CGM: 1yr, Meals: 3yr, Insulin: 3yr |
| Automated deletion implemented | ☐ | | Cron jobs for expiry |
| Right to erasure (DPDP/GDPR) | ☐ | | <30 days fulfillment |
| Data portability | ☐ | | JSON export API |

### 2.3 Database Security
| Check | Status | Evidence | Remarks |
|-------|--------|----------|---------|
| Database not publicly accessible | ☐ | | Private subnet, security groups |
| Least privilege DB users | ☐ | | App user: read/write only |
| Audit logging enabled | ☐ | | All DML/DDL logged |
| Row-level security (RLS) | ☐ | | Patient data isolation |
| Automated backups encrypted | ☐ | | Daily, 30-day retention |
| Point-in-time recovery tested | ☐ | | Monthly drill |

---

## 3. INFRASTRUCTURE SECURITY

### 3.1 Network Security
| Check | Status | Evidence | Remarks |
|-------|--------|----------|---------|
| VPC with public/private subnets | ☐ | | Multi-AZ |
| NAT Gateway for egress | ☐ | | No direct internet from private |
| Security groups least privilege | ☐ | | Port 443/80 only where needed |
| WAF rules configured | ☐ | | OWASP Top 10 rules |
| DDoS protection enabled | ☐ | | AWS Shield / Cloudflare |
| VPC Flow Logs enabled | ☐ | | Sent to CloudWatch/S3 |

### 3.2 Container/Kubernetes Security
| Check | Status | Evidence | Remarks |
|-------|--------|----------|---------|
| Non-root containers | ☐ | | USER 1000 in Dockerfile |
| Read-only root filesystem | ☐ | | `readOnlyRootFilesystem: true` |
| Resource limits/requests set | ☐ | | CPU/Memory limits |
| Network policies enforced | ☐ | | Namespace isolation |
| Pod Security Standards | ☐ | | Restricted profile |
| Image vulnerability scanning | ☐ | | Trivy/Snyk in CI/CD |
| Image signing/verification | ☐ | | Cosign/Notary |

### 3.3 Secrets Management
| Check | Status | Evidence | Remarks |
|-------|--------|----------|---------|
| No secrets in code/config | ☐ | | GitLeaks/TruffleHog in CI |
| External secrets operator | ☐ | | AWS Secrets Manager / Vault |
| Rotation automated | ☐ | | Annual for DB, 90-day for API keys |
| Audit trail for secret access | ☐ | | CloudTrail / Vault audit log |

---

## 4. MONITORING & INCIDENT RESPONSE

### 4.1 Logging & Monitoring
| Check | Status | Evidence | Remarks |
|-------|--------|----------|---------|
| Centralized logging (ELK/Loki) | ☐ | | Structured JSON logs |
| Log retention ≥1 year | ☐ | | Compliance requirement |
| PII not in logs | ☐ | | Structured logging with redaction |
| Real-time alerting | ☐ | | PagerDuty/Slack/Email |
| SLO/SLI defined | ☐ | | Latency, error rate, availability |

### 4.2 Vulnerability Management
| Check | Status | Evidence | Remarks |
|-------|--------|----------|---------|
| SAST in CI/CD | ☐ | | SonarQube/CodeQL |
| DAST in staging | ☐ | | OWASP ZAP |
| Dependency scanning | ☐ | | Dependabot/Snyk |
| Container scanning | ☐ | | Trivy in CI/CD |
| Penetration testing (annual) | ☐ | | Third-party |
| Bug bounty program | ☐ | | HackerOne/Intigriti |

### 4.3 Incident Response
| Check | Status | Evidence | Remarks |
|-------|--------|----------|---------|
| IR plan documented | ☐ | | Runbooks for top 10 scenarios |
| IR team defined | ☐ | | Roles: Commander, Comms, Tech |
| Tabletop exercises quarterly | ☐ | | Scenario-based |
| Communication plan | ☐ | | Internal + external (users, regulators) |
| Forensic readiness | ☐ | | Disk images, memory dumps |

---

## 5. COMPLIANCE

### 5.1 DPDP Act 2023 (India)
| Check | Status | Evidence | Remarks |
|-------|--------|----------|---------|
| Data Protection Impact Assessment | ☐ | | For high-risk processing |
| Data Protection Officer appointed | ☐ | | Contact published |
| Consent management | ☐ | | Granular, revocable |
| Data breach notification (72 hrs) | ☐ | | Process documented |
| Data processor agreements | ☐ | | With all subprocessors |
| Cross-border transfer safeguards | ☐ | | SCC/adequacy decision |

### 5.2 HIPAA Alignment (for future US)
| Check | Status | Evidence | Remarks |
|-------|--------|----------|---------|
| BAA with cloud providers | ☐ | | AWS/GCP BAA signed |
| Minimum necessary access | ☐ | | Role-based |
| Audit controls | ☐ | | Access logs |
| Integrity controls | ☐ | | Checksums, signatures |

### 5.3 IEC 62304 (Medical Device Software)
| Check | Status | Evidence | Remarks |
|-------|--------|----------|---------|
| Software safety classification | ☐ | | Class B (CDS) |
| Software development plan | ☐ | | SDLC documented |
| Risk management (ISO 14971) | ☐ | | Risk register maintained |
| Verification & validation | ☐ | | Test plans/reports |
| Configuration management | ☐ | | Git, semantic versioning |
| Problem resolution process | ☐ | | Jira/GitHub Issues |

---

## 6. THIRD-PARTY RISK

### 6.1 Vendor Assessment
| Vendor | Service | Risk Level | Assessment Date | Contract |
|--------|---------|------------|-----------------|----------|
| AWS/GCP | Cloud | High | | |
| Clerk | Auth | High | | |
| Dexcom/Libre/Medtronic | CGM API | High | | |
| Sentry | Error tracking | Medium | | |
| SendGrid/Twilio | Notifications | Medium | | |

### 6.2 Supply Chain
| Check | Status | Evidence | Remarks |
|-------|--------|----------|---------|
| SBOM generated | ☐ | | Syft/CycloneDX |
| License compliance | ☐ | | FOSSA/FOSSology |
| Malware scanning | ☐ | | In CI/CD |

---

## 7. PHYSICAL & ENVIRONMENTAL

| Check | Status | Evidence | Remarks |
|-------|--------|----------|---------|
| Cloud provider SOC 2 Type II | ☐ | | AWS/GCP |
| Data center in India | ☐ | | Data residency |
| Environmental controls | ☐ | | Provider responsibility |

---

## 8. TRAINING & AWARENESS

| Check | Status | Evidence | Remarks |
|-------|--------|----------|---------|
| Annual security training | ☐ | | All staff |
| Secure coding training | ☐ | | Developers |
| Phishing simulations | ☐ | | Quarterly |
| Incident response drills | ☐ | | Quarterly tabletop |

---

## 9. AUDIT FINDINGS SUMMARY

| Severity | Count | Description |
|----------|-------|-------------|
| Critical | 0 | Immediate risk to PHI/system |
| High | 0 | Significant vulnerability |
| Medium | 0 | Moderate risk |
| Low | 0 | Minor improvement |
| Info | 0 | Best practice |

### Remediation Tracker
| Finding ID | Severity | Description | Owner | Target Date | Status |
|------------|----------|-------------|-------|-------------|--------|
| | | | | | |

---

## 10. SIGN-OFF

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Security Lead | | | |
| CTO | | | |
| DPO | | | |
| CISO | | | |

---

**Next Audit Due:** [Date + 1 Year]  
**Document Classification:** CONFIDENTIAL  
**Distribution:** Security Team, CTO, DPO, Auditors