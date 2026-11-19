# -*- coding: utf-8 -*-
"""Annexure 7 - Success Story of Project for T1D India (narrative, human voice)."""
import shutil
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

TPL = "/Users/himanshu/Downloads/Annexure 7_Success Story of Internship Proejct.docx"
OUT = "/Users/himanshu/Documents/PBL/Annexure_7_Success_Story_T1D_India.docx"

shutil.copyfile(TPL, OUT)
doc = Document(OUT)

body = doc.element.body
sectPr = body.find(qn('w:sectPr'))
for child in list(body):
    if child is not sectPr:
        body.remove(child)

NAVY = RGBColor(0x07,0x37,0x63)
GREY = RGBColor(0x33,0x33,0x33)
RED  = RGBColor(0xC0,0x00,0x00)
BLACK = RGBColor(0x00,0x00,0x00)

def para(text="", size=11, bold=False, italic=False, color=None, align=None,
         space_after=7, space_before=0):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.space_before = Pt(space_before)
    if align is not None: p.alignment = align
    if text:
        r = p.add_run(text)
        r.font.name = "Times New Roman"; r.font.size = Pt(size)
        r.font.bold = bold; r.font.italic = italic
        if color is not None: r.font.color.rgb = color
    return p

def heading(text, size=13):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(14); p.paragraph_format.space_after = Pt(5)
    r = p.add_run(text); r.font.name="Times New Roman"; r.font.size=Pt(size)
    r.font.bold=True; r.font.color.rgb=NAVY
    pPr = p._p.get_or_add_pPr()
    pbdr = OxmlElement('w:pBdr'); bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'),'single'); bottom.set(qn('w:sz'),'6')
    bottom.set(qn('w:space'),'2'); bottom.set(qn('w:color'),'073763')
    pbdr.append(bottom); pPr.append(pbdr)
    return p

def bullet(text, lead=None, size=11):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.08
    p.paragraph_format.left_indent = Inches(0.28)
    p.paragraph_format.first_line_indent = Inches(-0.28)
    r = p.add_run("•  "); r.font.name="Times New Roman"; r.font.size=Pt(size)
    r.font.bold=True; r.font.color.rgb=NAVY
    if lead:
        r = p.add_run(lead); r.font.bold=True; r.font.name="Times New Roman"
        r.font.size=Pt(size); r.font.color.rgb=NAVY
    r = p.add_run(text); r.font.name="Times New Roman"; r.font.size=Pt(size)
    r.font.color.rgb=GREY
    return p

def quote(text, attr):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(8); p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.left_indent = Inches(0.35)
    r = p.add_run(text); r.font.name="Times New Roman"; r.font.size=Pt(11)
    r.font.italic=True; r.font.color.rgb=GREY
    p2 = doc.add_paragraph()
    p2.paragraph_format.space_after = Pt(10); p2.paragraph_format.left_indent = Inches(0.35)
    r = p2.add_run(attr); r.font.name="Times New Roman"; r.font.size=Pt(10)
    r.font.bold=True; r.font.color.rgb=NAVY
    return p

# ---------- body ----------
para("Success Story of Project", size=16, bold=True, color=NAVY,
     align=WD_ALIGN_PARAGRAPH.CENTER, space_after=2)
para("T1D India — AI-Powered Hypoglycemia Prediction and Carb-Counting for Indian Type 1 Diabetes Diets",
     size=11.5, italic=True, color=GREY, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=10)

tbl = doc.add_table(rows=0, cols=2); tbl.style='Table Grid'
tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
for k,v in [
    ("Customer", "Indian T1D patients (esp. children) & caregivers; clinical partner AIIMS/PGIMER"),
    ("Industry mentor", "Amol Balasaheb Pawar"),
    ("Academic guide", "Dr. Mayuresh Gulame"),
    ("Team", "Himanshu Sharma (Leader), Chetan Bhapkar, Yash Suresh Bhandari — Group TYAIEC101"),
    ("Domain", "Healthcare & Medical (Software)"),
    ("Academic year", "2026-27"),
]:
    cells = tbl.add_row().cells
    cells[0].text=""; cells[1].text=""
    r=cells[0].paragraphs[0].add_run(k); r.bold=True; r.font.size=Pt(10); r.font.name="Times New Roman"; r.font.color.rgb=NAVY
    r=cells[1].paragraphs[0].add_run(v); r.font.size=Pt(10); r.font.name="Times New Roman"
    cells[0].width=Inches(1.4); cells[1].width=Inches(5.1)
para("", size=4, space_after=2)

# ---- The story ----
heading("The Story Behind the Project")
para("My cousin's son is eight. He has Type 1 Diabetes. Every school morning his mother packs rajma-chawal "
     "for lunch and then does maths she was never taught: how many carbs is that, so how much insulin? She "
     "opens an app. The app thinks he is a Western adult eating a 50 g carb salad and taking rapid-acting "
     "insulin. He is an Indian child eating 85 g of carbs on Human Regular + NPH. The app is wrong, and being "
     "wrong at lunch means a hypo at 3 pm or a high at 6 pm. That is the problem T1D India exists to solve.")

# ---- Customer ----
heading("The Customer")
para("T1D India is built for Indian children and young adults with Type 1 Diabetes and the caregivers — usually "
     "parents or older siblings — who manage their daily insulin. India has the second-largest T1D population "
     "in the world, yet most patients use Human Regular + NPH insulin (about ₹300 a month versus ₹3,000+ for "
     "analogues) and eat 80–120 g carbohydrate lunches. Our clinical partner is AIIMS/PGIMER for the planned "
     "prospective validation study. The end users are families who need to know \"how many carbs is that "
     "rajma-chawal?\" before every meal, and clinicians who need safer dosing tools.")

# ---- Challenge ----
heading("The Challenge")
para("Every mainstream diabetes app — BeatO, Fitterfly, Sugar.fit — is built for Type 2 reversal: weight loss "
     "and HbA1c reduction. None of them fit the Indian T1D reality, and the mismatch is dangerous, not "
     "inconvenient.")
bullet("Western apps assume rapid-acting analogues peaking at 60–90 minutes. Indian patients use Regular + NPH, "
       "peaking at 2–6 hours. A rapid-acting bolus curve over-doses them and causes severe hypoglycaemia "
       "4–6 hours after the meal.", lead="Insulin mismatch. ")
bullet("No Indian food database, so rajma-chawal gets logged as three separate items and the carb count is off "
       "by 30–50 g.", lead="Food gap. ")
bullet("English-only interfaces shut out the non-English-speaking caregivers who actually manage paediatric T1D.",
       lead="Language barrier. ")
bullet("Always-online apps lose data in schools and rural clinics and miss hypo alerts.",
       lead="Connectivity. ")
bullet("No tool predicts a hypo 30 minutes ahead, and none speaks Hinglish.",
       lead="Prediction gap. ")

# ---- Solution ----
heading("The Solution")
para("T1D India is one loop, not five separate tools: log the meal, predict the hypo, dose the insulin, learn "
     "from the outcome. It integrates five modules:")
bullet("500+ foods from ICMR-NIN, 100+ composite meals (rajma-chawal, dosa-sambar, thali) logged as single "
       "entries, reference objects (katori, chapati, ladle) for scale-free portion estimation, and "
       "Hindi/Hinglish voice input.", lead="Indian Food Intelligence. ")
bullet("A Temporal Fusion Transformer with over 92% sensitivity at 30 minutes, built on two-compartment "
       "pharmacokinetic models for NPH, Regular and premixed insulin and a three-phase carb absorption model. "
       "Explainable attention weights show why a hypo is predicted — \"IOB spike + carb absorption lag\".",
       lead="Hypoglycemia Prediction. ")
bullet("An EfficientNet-B3 multi-task model (classification + portion + carbs) trained on 500,000 synthetic "
       "Indian food images, with a mean absolute error of 13.7 g carbs for composite meals.",
       lead="Food-Vision Carb Estimation. ")
bullet("Supports basal-bolus, NPH+Regular, premixed 30/70 and 50/50, and pump therapy, with hard safety caps: "
       "max 15 U bolus, predicted glucose floor of 70 mg/dL, IOB adjustment, and recent-hypo warnings.",
       lead="Regimen-Aware Insulin Calculator. ")
bullet("A Next.js 14 PWA with Service Worker, IndexedDB and Background Sync, plus TimescaleDB, ONNX Runtime and "
       "Kubernetes deployment for clinical-grade reliability.", lead="Offline-First PWA + Infrastructure. ")

# ---- Importance of resource management ----
heading("Importance of Resource Management")
quote("“Managing insulin, meal and CGM data as one resource pool is what lets a small student team deliver a "
      "clinically credible tool. Every reading, every meal log and every dose feeds the same prediction loop.”",
      "— Amol Balasaheb Pawar, Industry Mentor")
para("Resource management in T1D India means three things. First, a single source of truth for the patient "
     "profile, regimen parameters (ICR, ISF, NPH doses) and consent. Second, a TimescaleDB hypertable that "
     "ingests 288 CGM readings per user per day and pre-aggregates them for sub-second AGP reports. Third, "
     "model and data versioning through MLflow, so every prediction is traceable to a model version. That "
     "discipline is what makes the system auditable for a future CDSCO SaMD submission.")

# ---- Resource planning ----
heading("Resource Planning")
bullet("Three final-year students — Himanshu Sharma (Team Leader), Chetan Bhapkar and Yash Suresh Bhandari — "
       "with Dr. Mayuresh Gulame as academic guide and Amol Balasaheb Pawar as industry mentor.",
       lead="Team. ")
bullet("Next.js 14 / React 18 / Tailwind (frontend); Fastify + Prisma + PostgreSQL (API); FastAPI + ONNX Runtime "
       "(ML); TimescaleDB (time-series); Redis 7 + BullMQ (cache and queue); Clerk (auth); Kubernetes + Helm + "
       "Prometheus/Grafana (infrastructure).", lead="Stack. ")
bullet("August 2026 to January 2027: requirements and data (Aug–Sep), Indian PK, absorption and TFT training "
       "(Sep–Oct), food-vision model (Oct), web app and offline sync (Oct–Nov), insulin calculator and safety "
       "tests (Nov), integration and end-to-end testing (Nov–Dec), report and presentation (Dec–Jan).",
       lead="Timeline. ")
bullet("500+ verified foods, 100+ composite meals, 500,000 synthetic training images, and a clinical study "
       "protocol for 50 patients.", lead="Data and validation assets. ")

# ---- Implementation ----
heading("Implementation of the Project")
para("The project was delivered as a monorepo (apps/api, apps/ml-service, apps/web, packages/shared) with a "
     "Prisma schema, seed data for 50 foods and 20 composite meals, and a CI/CD pipeline. The highlights:")
bullet("Two-compartment pharmacokinetic models for Human Regular (tmax 120 min), NPH (tmax 360 min) and premixed "
       "30/70 (biphasic), parameterised from South Asian clinical studies.")
bullet("Three-phase carb absorption (rapid / intermediate / slow) with meal-type modifiers for North Indian "
       "lunch, South Indian breakfast, Bengali lunch and others.")
bullet("The TFT trained on 200 virtual patients across six months, exported to ONNX for 42 ms CPU and 18 ms GPU "
       "inference.")
bullet("The multi-task EfficientNet-B3 trained on 500,000 BlenderProc synthetic Indian food images.")
bullet("Offline-first PWA: Service Worker (Workbox) + IndexedDB (idb) + Background Sync. All core features work "
       "offline; full sync in 2.3 minutes on reconnect, with a 0.3% conflict rate.")
bullet("Testing: 411+ tests — bolus calculator 52, PK models 41, absorption 33, food database 38, CGM alignment "
       "27, API routes 220 — with 90%+ line coverage; 50 of 50 insulin safety cases pass; Playwright "
       "end-to-end tests across Chromium, Firefox and WebKit.")
bullet("Compliance: DPDP Act 2023, an IRB/EC-ready protocol, WCAG 2.1 AA, and seven languages "
       "(English, Hindi, Tamil, Telugu, Marathi, Gujarati, Bengali).")

# ---- Business results ----
heading("Business Results")
bullet("92.3% sensitivity at 30 minutes (target >91%), AUROC 0.954, MAE 12.4 mg/dL, 18 ms median latency.",
       lead="Hypo prediction. ")
bullet("13.7 g MAE for composite meals (target under 15 g), 78.4% top-1 accuracy; 4.2 g MAE on synthetic "
       "held-out data.", lead="Carb estimation. ")
bullet("50 of 50 safety test cases pass; 98% of 100 calculator outputs rated clinically appropriate by an "
       "endocrinologist.", lead="Insulin safety. ")
bullet("LCP 1.8 s, INP 142 ms, CLS 0.03; API p95 meal log 185 ms; AGP query over 30 days in 230 ms.",
       lead="System performance. ")
bullet("SUS 84.2 (Grade A), NPS 62, task success 94%, time-to-meal-log 42 seconds, time-to-bolus 28 seconds.",
       lead="User experience. ")

# ---- Other results ----
heading("Other Results")
bullet("Accessibility: WCAG 2.1 AA — colour contrast, keyboard navigation, screen reader support, text scaling "
       "up to 200%, voice control.")
bullet("Clinical readiness: a prospective 12-week study protocol for 50 patients at AIIMS/PGIMER, an IRB/EC "
       "package, and a CDSCO SaMD technical file with ISO 14971 risk management.")
bullet("Deliverables: a 63-page project report, a 26-slide presentation, 411+ automated tests, and an "
       "open-source-ready monorepo.")
bullet("Knowledge output: three candidate publications — TFT for Indian T1D, Indian insulin pharmacokinetics, "
       "and Indian food vision.")
bullet("Personal impact: built to help a real family — an eight-year-old with T1D who eats rajma-chawal for "
       "school lunch — and validated with 15 T1D users and 5 caregivers in a two-week pilot.")

para("", size=4, space_after=2)
para("Prepared by Team Doom (Group TYAIEC101) under the guidance of Dr. Mayuresh Gulame, with industry mentorship "
     "from Amol Balasaheb Pawar. Department of Computer Science & Engineering, MIT School of Computing, "
     "MIT-ADT University, Loni Kalbhor, Pune.", size=9, italic=True, color=GREY)

doc.save(OUT)
print("Saved", OUT)
