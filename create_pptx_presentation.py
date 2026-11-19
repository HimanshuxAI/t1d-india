# -*- coding: utf-8 -*-
"""T1D India project presentation - engaging, human, visual."""
import sys
sys.path.insert(0, '/Users/himanshu/Documents/PBL')
import zipfile
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.dml import MSO_LINE_DASH_STYLE
from pptx.oxml.ns import qn
from pptx.oxml import parse_xml

TPL = "/Users/himanshu/Downloads/Final_Project_Presentation_format.pptx"
OUT = "/Users/himanshu/Documents/PBL/T1D_India_Project_Presentation.pptx"

NAVY   = RGBColor(0x07,0x37,0x63)
NAVY_D = RGBColor(0x05,0x23,0x42)
RED    = RGBColor(0xC0,0x00,0x00)
TEAL   = RGBColor(0x0F,0x76,0x6E)
AMBER  = RGBColor(0xD9,0x77,0x06)
GREY   = RGBColor(0x55,0x5F,0x6D)
WHITE  = RGBColor(0xFF,0xFF,0xFF)
LIGHT  = RGBColor(0xF4,0xF7,0xFB)
NAVY_T = RGBColor(0xE8,0xEE,0xF5)
RED_T  = RGBColor(0xFB,0xE9,0xE9)
TEAL_T = RGBColor(0xE6,0xF4,0xF3)
AMBER_T= RGBColor(0xFD,0xF3,0xE5)
LEFT, TOP, W = 0.91, 0.45, 8.20
SCALE = 914400

p = Presentation(TPL)
sldLst = p.slides._sldIdLst
for sld in list(sldLst):
    rid = sld.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
    p.part.drop_rel(rid); sldLst.remove(sld)

BLANK = p.slide_layouts[3]
N = [0]
def new_slide():
    N[0] += 1
    return p.slides.add_slide(BLANK), N[0]

# ---------- helpers ----------
def footer(slide, num):
    tb = slide.shapes.add_textbox(Inches(1.51), Inches(6.68), Inches(8.08), Inches(0.74))
    tf = tb.text_frame; pp = tf.paragraphs[0]; pp.alignment = PP_ALIGN.CENTER
    r = pp.add_run(); r.text = "Department of Computer Science & Engineering, MITSoC, Loni Kalbhor"
    r.font.name="Times New Roman"; r.font.size=Pt(18); r.font.bold=True
    r.font.italic=True; r.font.color.rgb=RED
    sn = slide.shapes.add_textbox(Inches(7.20), Inches(6.98), Inches(2.30), Inches(0.38))
    pp = sn.text_frame.paragraphs[0]; pp.alignment = PP_ALIGN.RIGHT
    r = pp.add_run(); r.text = str(num)
    r.font.name="Times New Roman"; r.font.size=Pt(14); r.font.color.rgb=NAVY

def title(slide, text, size=26):
    tb = slide.shapes.add_textbox(Inches(LEFT), Inches(TOP), Inches(W), Inches(1.0))
    tf = tb.text_frame; tf.word_wrap=True; tf.auto_size=MSO_AUTO_SIZE.SHAPE_TO_FIT_TEXT
    pp = tf.paragraphs[0]
    r = pp.add_run(); r.text = text
    r.font.name="Times New Roman"; r.font.size=Pt(size); r.font.bold=True; r.font.color.rgb=NAVY
    return tb

def para(slide, x, y, w, text, size=14, bold=False, color=GREY, align=PP_ALIGN.LEFT,
         italic=False, h=0.3):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = tb.text_frame; tf.word_wrap=True; tf.auto_size=MSO_AUTO_SIZE.SHAPE_TO_FIT_TEXT
    pp = tf.paragraphs[0]; pp.alignment=align
    r = pp.add_run(); r.text=text
    r.font.name="Arial"; r.font.size=Pt(size); r.font.bold=bold
    r.font.italic=italic; r.font.color.rgb=color
    return tb

def bullets(slide, x, y, w, items, size=14, color=GREY, accent=NAVY, gap=5, indent=0.22):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(0.5))
    tf = tb.text_frame; tf.word_wrap=True; tf.auto_size=MSO_AUTO_SIZE.SHAPE_TO_FIT_TEXT
    first=True
    for it in items:
        pp = tf.paragraphs[0] if first else tf.add_paragraph()
        first=False
        pp.space_after=Pt(gap); pp.line_spacing=1.1
        pr = pp._p.get_or_add_pPr()
        pr.set('marL', str(int(Inches(indent)))); pr.set('indent', str(int(-Inches(indent))))
        r = pp.add_run(); r.text="•  "; r.font.name="Arial"; r.font.size=Pt(size)
        r.font.bold=True; r.font.color.rgb=accent
        if isinstance(it, str):
            r2 = pp.add_run(); r2.text=it; r2.font.name="Arial"; r2.font.size=Pt(size); r2.font.color.rgb=color
        else:
            lead, rest = it
            r2 = pp.add_run(); r2.text=lead; r2.font.name="Arial"; r2.font.size=Pt(size)
            r2.font.bold=True; r2.font.color.rgb=color
            r3 = pp.add_run(); r3.text=rest; r3.font.name="Arial"; r3.font.size=Pt(size); r3.font.color.rgb=color
    return tb

def card(slide, x, y, w, h, fill=WHITE, line=None, lw=0.7, rad=True):
    sh = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    sh.fill.solid(); sh.fill.fore_color.rgb=fill
    if line:
        sh.line.color.rgb=line; sh.line.width=Pt(lw)
    else:
        sh.line.fill.background()
    if rad:
        try: sh.adjustments[0]=0.08
        except Exception: pass
    return sh

def hero(slide, x, y, w, number, label, color=NAVY, bg=NAVY_T, numsize=40):
    card(slide, x, y, w, 1.5, fill=bg, line=color, lw=0.6)
    tb = slide.shapes.add_textbox(Inches(x), Inches(y+0.18), Inches(w), Inches(0.75))
    pp = tb.text_frame.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
    r = pp.add_run(); r.text=number
    r.font.name="Arial"; r.font.size=Pt(numsize); r.font.bold=True; r.font.color.rgb=color
    tb2 = slide.shapes.add_textbox(Inches(x), Inches(y+1.0), Inches(w), Inches(0.45))
    pp = tb2.text_frame.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
    r = pp.add_run(); r.text=label
    r.font.name="Arial"; r.font.size=Pt(10); r.font.color.rgb=GREY

def hbar(slide, x, y, w, h, labels, values, color=NAVY, maxv=None, suffix="", valsize=9):
    maxv = maxv or (max(values)*1.18)
    n=len(labels); gap=0.10; bw=(w-gap*(n-1))/n; base=y+h
    bl = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(base), Inches(w), Inches(0.025))
    bl.fill.solid(); bl.fill.fore_color.rgb=GREY; bl.line.fill.background()
    for i,(lab,val) in enumerate(zip(labels,values)):
        bx=x+i*(bw+gap); bh=(val/maxv)*h
        bar=slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(bx), Inches(base-bh), Inches(bw), Inches(bh))
        bar.fill.solid(); bar.fill.fore_color.rgb=color; bar.line.fill.background()
        vt=slide.shapes.add_textbox(Inches(bx), Inches(base-bh-0.26), Inches(bw), Inches(0.24))
        pp=vt.text_frame.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
        r=pp.add_run(); r.text=f"{val}{suffix}"; r.font.name="Arial"; r.font.size=Pt(valsize)
        r.font.bold=True; r.font.color.rgb=color
        lt=slide.shapes.add_textbox(Inches(bx-0.04), Inches(base+0.04), Inches(bw+0.08), Inches(0.38))
        pp=lt.text_frame.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER; pp.word_wrap=True
        r=pp.add_run(); r.text=lab; r.font.name="Arial"; r.font.size=Pt(8); r.font.color.rgb=GREY

def table(slide, x, y, w, rows, colw=None, size=11, h=0.30):
    ncols=len(rows[0])
    if colw is None: colw=[w/ncols]*ncols
    tot=sum(colw); colw=[cw*w/tot for cw in colw]
    cy=y
    for ri,row in enumerate(rows):
        for ci,cell in enumerate(row):
            cx=x+sum(colw[:ci]); cw=colw[ci]
            sh=slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(cx), Inches(cy), Inches(cw), Inches(h))
            if ri==0:
                sh.fill.solid(); sh.fill.fore_color.rgb=NAVY
                sh.line.color.rgb=WHITE; sh.line.width=Pt(0.5)
                tc=WHITE; bold=True
            else:
                sh.fill.solid(); sh.fill.fore_color.rgb=WHITE if ri%2 else LIGHT
                sh.line.color.rgb=RGBColor(0xD0,0xD7,0xE2); sh.line.width=Pt(0.5)
                tc=GREY; bold=False
            tf=sh.text_frame; tf.word_wrap=True
            tf.margin_left=Pt(4); tf.margin_right=Pt(4); tf.margin_top=Pt(2); tf.margin_bottom=Pt(2)
            pp=tf.paragraphs[0]; pp.alignment=PP_ALIGN.LEFT
            r=pp.add_run(); r.text=str(cell); r.font.name="Arial"; r.font.size=Pt(size)
            r.font.bold=bold; r.font.color.rgb=tc
        cy+=h
    return cy

def polyline(slide, pts, color=NAVY, width=2.0, dash=None):
    ff=slide.shapes.build_freeform(pts[0][0], pts[0][1], SCALE)
    ff.add_line_segments(pts[1:], close=False)
    sh=ff.convert_to_shape(); sh.fill.background()
    sh.line.color.rgb=color; sh.line.width=Pt(width)
    if dash: sh.line.dash_style=dash
    return sh

def arrow(slide, x, y, text="\u2192", size=20, color=GREY):
    tb=slide.shapes.add_textbox(Inches(x), Inches(y), Inches(0.5), Inches(0.4))
    pp=tb.text_frame.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
    r=pp.add_run(); r.text=text; r.font.name="Arial"; r.font.size=Pt(size)
    r.font.bold=True; r.font.color.rgb=color
    return tb

def box(slide, x, y, w, h, text, fill=NAVY_T, color=NAVY, size=11, line=NAVY):
    card(slide, x, y, w, h, fill=fill, line=line, lw=0.6)
    tb=slide.shapes.add_textbox(Inches(x+0.08), Inches(y+0.05), Inches(w-0.16), Inches(h-0.10))
    tf=tb.text_frame; tf.word_wrap=True; tf.vertical_anchor=MSO_ANCHOR.MIDDLE
    pp=tf.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
    r=pp.add_run(); r.text=text; r.font.name="Arial"; r.font.size=Pt(size)
    r.font.bold=True; r.font.color.rgb=color
    return tb

# ============================================================
# SLIDES
# ============================================================

# 1. Cover
s,n = new_slide()
card(s, 3.0, 0.4, 4.0, 0.55, fill=NAVY, line=None)
tb=s.shapes.add_textbox(Inches(3.0), Inches(0.4), Inches(4.0), Inches(0.55))
tf=tb.text_frame; tf.vertical_anchor=MSO_ANCHOR.MIDDLE
pp=tf.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
r=pp.add_run(); r.text="Project Presentation"
r.font.name="Times New Roman"; r.font.size=Pt(19); r.font.bold=True; r.font.color.rgb=WHITE

title(s, "AI-Powered Hypoglycemia Prediction and Carb-Counting Tool for Indian T1D Diets", size=22)
# move title below banner
s.shapes[-1].top = Inches(1.05)
para(s, LEFT, 1.95, W, "Department of Computer Science & Engineering  \u2022  MIT School of Computing, MIT-ADT University",
     size=11, color=GREY, align=PP_ALIGN.CENTER, italic=True)

card(s, 1.5, 2.3, 7.0, 2.6, fill=WHITE, line=NAVY, lw=0.8)
tb=s.shapes.add_textbox(Inches(1.5), Inches(2.4), Inches(7.0), Inches(0.35))
pp=tb.text_frame.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
r=pp.add_run(); r.text="Team Doom  |  Group TYAIEC101  |  Domain: Healthcare & Medical"
r.font.name="Arial"; r.font.size=Pt(12.5); r.font.bold=True; r.font.color.rgb=NAVY
my=2.8
for nm,prn in [("HIMANSHU SHARMA","ADT24SOCB0462 (Team Leader)"),
               ("CHETAN BHAPKAR","ADT24SOCB0336"),
               ("YASH SURESH BHANDARI","ADT24SOCB1437")]:
    tb=s.shapes.add_textbox(Inches(1.7), Inches(my), Inches(6.6), Inches(0.3))
    pp=tb.text_frame.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
    r=pp.add_run(); r.text=f"{nm}   \u2014   {prn}"
    r.font.name="Arial"; r.font.size=Pt(12.5); r.font.bold=True; r.font.color.rgb=NAVY_D
    my+=0.32
tb=s.shapes.add_textbox(Inches(1.5), Inches(3.85), Inches(7.0), Inches(0.3))
pp=tb.text_frame.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
r=pp.add_run(); r.text="Guide: Dr. Mayuresh Gulame     |     Industry Mentor: Amol Balasaheb Pawar"
r.font.name="Arial"; r.font.size=Pt(11.5); r.font.bold=True; r.font.color.rgb=GREY
tb=s.shapes.add_textbox(Inches(1.5), Inches(4.2), Inches(7.0), Inches(0.35))
pp=tb.text_frame.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
r=pp.add_run(); r.text="Academic Year 2026-27  \u2022  B.Tech. Computer Science & Engineering"
r.font.name="Arial"; r.font.size=Pt(10.5); r.font.italic=True; r.font.color.rgb=GREY
card(s, LEFT, 4.6, W, 0.05, fill=NAVY, line=None, rad=False)
para(s, LEFT, 4.75, W, "\u201cNone of them help a T1D kid count carbs in aloo paratha. None predict hypos 30 minutes before they happen.\u201d",
     size=11.5, italic=True, color=GREY, align=PP_ALIGN.CENTER)
footer(s,n)

# 2. The hook
s,n = new_slide()
title(s, "Why This Project Exists")
para(s, LEFT, 1.35, W, "My cousin\u2019s son is eight. He has Type 1 Diabetes. Every school morning his mother packs "
     "rajma-chawal for lunch and then does maths she was never taught: how many carbs is that, so how much "
     "insulin? She opens an app. The app thinks he is a Western adult eating a 50 g salad on rapid-acting "
     "insulin. He is an Indian child eating 85 g of carbs on Human Regular + NPH. The app is wrong \u2014 and "
     "being wrong at lunch means a hypo at 3 pm.", size=14, color=GREY)
card(s, LEFT, 3.6, W, 1.6, fill=RED_T, line=RED, lw=0.8)
tb=s.shapes.add_textbox(Inches(LEFT+0.25), Inches(3.75), Inches(W-0.5), Inches(1.3))
tf=tb.text_frame; tf.word_wrap=True; tf.vertical_anchor=MSO_ANCHOR.MIDDLE
pp=tf.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
r=pp.add_run(); r.text="\u201cNone of them help a T1D kid count carbs in aloo paratha. None predict hypos 30 minutes before they happen. None understand NPH + Regular. None speak Hinglish.\u201d"
r.font.name="Times New Roman"; r.font.size=Pt(15); r.font.italic=True; r.font.color.rgb=RED
para(s, LEFT, 5.35, W, "That gap is what T1D India closes.", size=13, bold=True, color=NAVY, align=PP_ALIGN.CENTER)
footer(s,n)

# 3. The numbers
s,n = new_slide()
title(s, "India\u2019s T1D Reality")
para(s, LEFT, 1.25, W, "India has the second-largest Type 1 Diabetes population in the world. Yet every mainstream "
     "app is built for a Western patient.", size=13, color=GREY)
stats=[("2nd", "largest T1D population\nglobally", NAVY),
       ("80\u2013120 g", "carbs in a typical\nIndian lunch", TEAL),
       ("70%+", "patients on Human\nRegular + NPH", AMBER),
       ("\u20b9300", "vs \u20b93,000+/month\nfor analogues", RED)]
cx=LEFT
for num,lab,col in stats:
    hero(s, cx, 1.75, 1.95, num, lab, color=col, bg=RGBColor(0xF4,0xF7,0xFB) if col==NAVY else (TEAL_T if col==TEAL else (AMBER_T if col==AMBER else RED_T)))
    cx+=2.05
para(s, LEFT, 3.1, W, "Western rapid-acting PK curves recommend too much insulin for a child on NPH + Regular \u2192 "
     "severe hypoglycaemia 4\u20136 hours after the meal. A food database without rajma, dosa or thali forces "
     "separate logging \u2192 30\u201350 g carb estimation error.", size=12.5, color=GREY)
footer(s,n)

# 4. Western vs Indian
s,n = new_slide()
title(s, "Western Apps vs. Indian Reality")
rows=[["Aspect","Western apps assume","Indian reality"],
      ["Insulin","Rapid-acting analogues (peak 60\u201390 min)","Human Regular + NPH (peak 2\u20136 h)"],
      ["Meal carbs","40\u201360 g / meal","80\u2013120 g typical lunch"],
      ["Absorption","Single exponential curve","Three-phase: rapid / intermediate / slow"],
      ["Meal timing","Lunch 12, dinner 6\u20137 pm","Lunch 12\u20131, dinner 9\u201310 pm + festivals"],
      ["Language","English only","Hindi / Hinglish voice input"],
      ["Connectivity","Always online","Intermittent \u2014 offline-first essential"]]
table(s, LEFT, 1.30, W, rows, colw=[1.3,3.4,3.5], size=11.5)
para(s, LEFT, 5.4, W, "No existing tool integrates Indian insulin PK, Indian meal absorption, Indian food "
     "composition and Indian UX into one clinically validated system.", size=12, italic=True, color=NAVY,
     align=PP_ALIGN.CENTER)
footer(s,n)

# 5. Why it's dangerous (before/after)
s,n = new_slide()
title(s, "Why the Mismatch Is Dangerous")
# two columns
card(s, LEFT, 1.35, 4.0, 3.6, fill=RED_T, line=RED, lw=0.7)
tb=s.shapes.add_textbox(Inches(LEFT+0.2), Inches(1.45), Inches(3.6), Inches(0.4))
pp=tb.text_frame.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
r=pp.add_run(); r.text="Before T1D India"; r.font.name="Arial"; r.font.size=Pt(13); r.font.bold=True; r.font.color.rgb=RED
bullets(s, LEFT+0.15, 1.95, 3.7, [
    "Mom guesses 60 g carbs for rajma-chawal (actual 85 g).",
    "Bolus calculator uses rapid-acting curve \u2192 over-doses.",
    "Child hypo at 3 pm, or high at 6 pm.",
    "English app \u2192 mom can\u2019t use voice input.",
    "No alert at 2:45 am \u2192 3 am emergency.",
], size=11.5, color=GREY, accent=RED, gap=6)
card(s, 5.1, 1.35, 4.0, 3.6, fill=TEAL_T, line=TEAL, lw=0.7)
tb=s.shapes.add_textbox(Inches(5.3), Inches(1.45), Inches(3.6), Inches(0.4))
pp=tb.text_frame.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
r=pp.add_run(); r.text="With T1D India"; r.font.name="Arial"; r.font.size=Pt(13); r.font.bold=True; r.font.color.rgb=TEAL
bullets(s, 5.25, 1.95, 3.7, [
    "Rajma-chawal logged as one entry: 85 g carbs.",
    "NPH-aware calculator \u2192 correct dose, safety caps.",
    "TFT predicts hypo at 2:45 pm \u2192 alert + snack prompt.",
    "Hinglish voice: \u201cek plate rajma chawal\u201d.",
    "3 am hypo alert wakes mom \u2192 glucose tablets.",
], size=11.5, color=GREY, accent=TEAL, gap=6)
footer(s,n)

# 6. What we're building (one loop)
s,n = new_slide()
title(s, "What We\u2019re Building \u2014 One Closed Loop")
para(s, LEFT, 1.3, W, "Log the meal \u2192 predict the hypo \u2192 dose the insulin \u2192 learn from the outcome. "
     "Five modules, one system.", size=13, color=GREY, align=PP_ALIGN.CENTER)
flow=[("Log meal", "text / voice / photo", NAVY),
      ("Predict hypo", "30 / 60 min ahead", TEAL),
      ("Dose insulin", "regimen-aware calc", AMBER),
      ("Learn", "outcomes \u2192 retrain", RED)]
fx=0.95
for lab,sub,col in flow:
    box(s, fx, 2.0, 1.85, 1.25, lab+"\n"+sub, fill=WHITE, color=col, size=11, line=col)
    fx+=2.0
    if fx<7.8: arrow(s, fx-0.18, 2.45, "\u2192", size=20, color=GREY)
para(s, LEFT, 3.5, W, "Indian Food Intelligence  \u2022  Hypoglycemia Prediction  \u2022  Food-Vision Carb Estimation  \u2022  "
     "Regimen-Aware Insulin Calculator  \u2022  Offline-First PWA", size=11, color=GREY, align=PP_ALIGN.CENTER, italic=True)
footer(s,n)

# 7. Three pillars
s,n = new_slide()
title(s, "Three Pillars")
pillars=[("Indian Food Intelligence", TEAL, ["500+ ICMR-NIN foods","100+ composite meals","6 languages","Reference objects (katori, chapati)"]),
         ("Hypo Prediction (Indian PK)", NAVY, ["Temporal Fusion Transformer",">91% sensitivity @ 30 min","NPH / Regular / premixed PK","3-phase carb absorption"]),
         ("Regimen-Aware Dosing", AMBER, ["Basal-bolus, NPH+Regular","Premixed 30/70, 50/50, pump","Safety caps + IOB adjust","Predicted floor \u226570"])]
cx=LEFT
for head,col,items in pillars:
    card(s, cx, 1.4, 2.62, 3.5, fill=WHITE, line=col, lw=0.8)
    tb=s.shapes.add_textbox(Inches(cx+0.15), Inches(1.5), Inches(2.32), Inches(0.4))
    pp=tb.text_frame.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
    r=pp.add_run(); r.text=head; r.font.name="Arial"; r.font.size=Pt(12); r.font.bold=True; r.font.color.rgb=col
    bullets(s, cx+0.18, 1.95, 2.28, items, size=11, color=GREY, accent=col, indent=0.16, gap=4)
    cx+=2.78
footer(s,n)

# 8. Insulin PK
s,n = new_slide()
title(s, "Method 1 \u2014 Indian Insulin Pharmacokinetics")
para(s, LEFT, 1.25, W, "Two-compartment PK models parameterised for South Asian populations. NPH peaks at 4\u20136 h, "
     "Regular at 2 h \u2014 not the 60\u201390 min of rapid analogues.", size=12.5, color=GREY)
pts_reg=[(0.9,4.6),(1.3,4.0),(1.7,3.2),(2.1,2.6),(2.5,2.3),(2.9,2.2),(3.3,2.3),(3.7,2.6),(4.1,3.0),(4.5,3.3),(4.9,3.5),(5.3,3.6)]
pts_nph=[(0.9,4.6),(1.3,4.4),(1.7,4.0),(2.1,3.5),(2.5,2.9),(2.9,2.3),(3.3,1.9),(3.7,1.6),(4.1,1.5),(4.5,1.5),(4.9,1.7),(5.3,2.0)]
pts_rap=[(0.9,4.6),(1.1,3.6),(1.3,2.6),(1.5,2.0),(1.7,1.7),(1.9,1.5),(2.1,1.6),(2.3,1.9),(2.5,2.3),(2.7,2.7),(2.9,3.0),(3.1,3.2)]
polyline(s, pts_reg, color=NAVY, width=2.2)
polyline(s, pts_nph, color=TEAL, width=2.2)
polyline(s, pts_rap, color=AMBER, width=2.2, dash=MSO_LINE_DASH_STYLE.DASH)
lx=6.4
for col,lab in [(NAVY,"Regular (tmax 120 min)"),(TEAL,"NPH (tmax 360 min)"),(AMBER,"Rapid analogue (60\u201390 min)")]:
    off=0.0 if lab.startswith("Regular") else (0.4 if lab.startswith("NPH") else 0.8)
    card(s, lx, 1.4+off, 2.6, 0.3, fill=WHITE, line=col, lw=0.6)
    tb=s.shapes.add_textbox(Inches(lx+0.38), Inches(1.42+off), Inches(2.15), Inches(0.28))
    pp=tb.text_frame.paragraphs[0]
    r=pp.add_run(); r.text=lab; r.font.name="Arial"; r.font.size=Pt(9.5); r.font.color.rgb=GREY
para(s, 0.7, 4.75, 1.2, "IOB (U)", size=9.5, color=GREY, align=PP_ALIGN.CENTER)
para(s, 2.6, 4.95, 3.0, "Time after dose (hours)", size=9.5, color=GREY, align=PP_ALIGN.CENTER)
rows=[["Insulin","tmax","Duration","Used by"],
      ["Human Regular","120 min","6\u20138 h","70%+ Indian T1D"],
      ["NPH","360 min","12\u201318 h","Morning + evening"],
      ["Premixed 30/70","biphasic","12\u201316 h","Twice-daily"],
      ["Rapid analogue","60\u201390 min","3\u20135 h","Western standard"]]
table(s, LEFT, 5.1, 5.0, rows, colw=[1.5,1.0,1.0,1.5], size=10, h=0.28)
footer(s,n)

# 9. Carb absorption
s,n = new_slide()
title(s, "Method 2 \u2014 Three-Phase Carb Absorption")
para(s, LEFT, 1.25, W, "Indian mixed meals (dal + rice + roti + ghee) do not follow a single exponential. We model "
     "rapid (sugar), intermediate (rice/roti) and slow (dal/sabzi) phases with meal-type modifiers.", size=12.5, color=GREY)
pts_r=[(0.9,4.6),(1.2,3.0),(1.5,2.0),(1.8,1.8),(2.1,1.9),(2.4,2.1),(2.7,2.4),(3.0,2.7),(3.3,3.0),(3.6,3.2),(3.9,3.4),(4.2,3.5)]
pts_i=[(0.9,4.6),(1.5,4.3),(1.9,3.6),(2.3,2.8),(2.7,2.2),(3.1,1.9),(3.5,1.9),(3.9,2.1),(4.2,2.4)]
pts_s=[(0.9,4.6),(1.8,4.5),(2.4,4.2),(3.0,3.7),(3.6,3.1),(4.2,2.6)]
polyline(s, pts_r, color=AMBER, width=2.2)
polyline(s, pts_i, color=NAVY, width=2.2)
polyline(s, pts_s, color=TEAL, width=2.2)
lx=6.6
for col,lab in [(AMBER,"Rapid (sugar, fruit)"),(NAVY,"Intermediate (rice, roti)"),(TEAL,"Slow (dal, sabzi)")]:
    off=0.0 if lab.startswith("Rapid") else (0.4 if lab.startswith("Inter") else 0.8)
    card(s, lx, 1.4+off, 2.5, 0.3, fill=WHITE, line=col, lw=0.6)
    tb=s.shapes.add_textbox(Inches(lx+0.35), Inches(1.42+off), Inches(2.1), Inches(0.28))
    pp=tb.text_frame.paragraphs[0]
    r=pp.add_run(); r.text=lab; r.font.name="Arial"; r.font.size=Pt(9.5); r.font.color.rgb=GREY
para(s, 0.7, 4.75, 1.2, "Absorption (g/min)", size=9.5, color=GREY, align=PP_ALIGN.CENTER)
para(s, 2.3, 4.95, 2.4, "Time after meal (min)", size=9.5, color=GREY, align=PP_ALIGN.CENTER)
bullets(s, 6.0, 2.6, 3.1, [("Modifiers: ","North/South Indian, Bengali, etc."),
                            ("Prep effects: ","fried +15% carbs."),
                            ("Output: ","3-phase profile fed to TFT.")], size=10.5, gap=4)
footer(s,n)

# 10. TFT
s,n = new_slide()
title(s, "Method 3 \u2014 Temporal Fusion Transformer")
para(s, LEFT, 1.25, W, "Multi-horizon quantile forecasting with interpretable attention. Inputs: CGM history, insulin "
     "IOB, carb absorption, time-of-day, regimen embedding.", size=12.5, color=GREY)
flow=[("CGM + insulin +\nmeals + static", NAVY_T, NAVY),
      ("Variable\nSelection", TEAL_T, TEAL),
      ("LSTM\nencoder/decoder", NAVY_T, NAVY),
      ("Multi-head\nattention", AMBER_T, AMBER),
      ("Quantiles\nP10/P50/P90", RED_T, RED)]
fx=0.95
for lab,fill,col in flow:
    box(s, fx, 2.0, 1.5, 1.15, lab, fill=fill, color=col, size=10.5)
    fx+=1.6
    if fx<7.5: arrow(s, fx-0.15, 2.45, "\u2192", size=18, color=GREY)
card(s, LEFT, 3.4, W, 1.55, fill=LIGHT, line=NAVY, lw=0.6)
tb=s.shapes.add_textbox(Inches(LEFT+0.2), Inches(3.5), Inches(W-0.4), Inches(1.35))
tf=tb.text_frame; tf.word_wrap=True
pp=tf.paragraphs[0]
r=pp.add_run(); r.text="Explainability \u2014 top-3 attention features match clinical expectation in 94% of high-risk predictions:"
r.font.name="Arial"; r.font.size=Pt(11.5); r.font.bold=True; r.font.color.rgb=NAVY
for t in ["1.  iob_rapid / iob_regular / iob_nph  (insulin effect)",
          "2.  carbs_absorbing / carbs_remaining  (meal absorption)",
          "3.  roc / glucose  (current trajectory)"]:
    pp=tf.add_paragraph(); pp.space_after=Pt(2)
    r=pp.add_run(); r.text=t; r.font.name="Arial"; r.font.size=Pt(11); r.font.color.rgb=GREY
para(s, LEFT, 5.1, W, "Why TFT over LSTM / XGBoost: variable selection + interpretable attention + quantile outputs "
     "for risk-aware decisions.", size=11, italic=True, color=GREY)
footer(s,n)

# 11. Food vision
s,n = new_slide()
title(s, "Method 4 \u2014 Multi-Task Food Vision")
para(s, LEFT, 1.25, W, "EfficientNet-B3 + spatial attention: simultaneous food classification, portion estimation "
     "(g) and carb regression. Trained on 500k synthetic Indian images (BlenderProc) + real photos.", size=12.5, color=GREY)
box(s, 0.95, 2.0, 1.6, 1.05, "Image\ninput", fill=NAVY_T, color=NAVY)
arrow(s, 2.6, 2.4)
box(s, 2.8, 1.8, 1.9, 1.45, "EfficientNet-B3\nbackbone", fill=TEAL_T, color=TEAL)
arrow(s, 4.75, 2.4)
for i,(lab,col,fill) in enumerate([("Class head\n(256 classes)",NAVY,NAVY_T),
                                   ("Portion head\n(grams)",TEAL,TEAL_T),
                                   ("Carb head\n(grams)",AMBER,AMBER_T)]):
    box(s, 4.95, 1.8+i*0.52, 1.8, 0.45, lab, fill=fill, color=col, size=10)
hero(s, 7.0, 1.85, 2.0, "13.7 g", "carb MAE\n(composite)", color=TEAL, bg=TEAL_T, numsize=30)
hero(s, 7.0, 3.5, 2.0, "78.4%", "top-1 acc\n(composite)", color=TEAL, bg=TEAL_T, numsize=30)
bullets(s, LEFT, 3.55, 6.0, [("Synthetic held-out: ","MAE 4.2 g, 96.3% top-1."),
                            ("Real Indian photos: ","MAE 14.3 g, 76.8% top-1."),
                            ("Failure modes: ","occlusion +8 g, mixed plates +6 g, unseen dishes +12 g.")],
       size=11, gap=4)
footer(s,n)

# 12. Bolus calculator
s,n = new_slide()
title(s, "Method 5 \u2014 Regimen-Aware Bolus Calculator")
card(s, LEFT, 1.3, W, 1.25, fill=NAVY_T, line=NAVY, lw=0.6)
tb=s.shapes.add_textbox(Inches(LEFT+0.25), Inches(1.35), Inches(W-0.5), Inches(1.15))
tf=tb.text_frame; tf.word_wrap=True; tf.vertical_anchor=MSO_ANCHOR.MIDDLE
pp=tf.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
r=pp.add_run(); r.text="bolus  =  carbs / ICR   +   (glucose \u2212 target) / ISF   \u2212   IOB"
r.font.name="Consolas"; r.font.size=Pt(17); r.font.bold=True; r.font.color.rgb=NAVY
pp=tf.add_paragraph(); pp.alignment=PP_ALIGN.CENTER
r=pp.add_run(); r.text="then regimen adjustments (NPH peaking \u221220%, premixed \u221215%)  \u2192  safety rails"
r.font.name="Arial"; r.font.size=Pt(11.5); r.font.italic=True; r.font.color.rgb=GREY
para(s, LEFT, 2.7, W, "Supported regimens: basal-bolus, NPH + Regular (2\u20133 inj/day), premixed 30/70 & 50/50, "
     "pump therapy.", size=12, color=GREY)
rails=["Max bolus 15 U","Max correction 5 U","Min glucose 90 mg/dL","Predicted floor \u226570",
       "IOB threshold 3 U","Recent hypo 120 min","Regimen adjustments"]
cx,cy=LEFT,3.15
for r_ in rails:
    w_=1.95
    if cx+w_>LEFT+W: cx=LEFT; cy+=0.48
    card(s, cx, cy, w_, 0.4, fill=RED_T, line=RED, lw=0.5)
    tb=s.shapes.add_textbox(Inches(cx), Inches(cy), Inches(w_), Inches(0.4))
    tf=tb.text_frame; tf.vertical_anchor=MSO_ANCHOR.MIDDLE
    pp=tf.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
    r=pp.add_run(); r.text=r_; r.font.name="Arial"; r.font.size=Pt(9.5); r.font.bold=True; r.font.color.rgb=RED
    cx+=w_+0.12
para(s, LEFT, 4.3, W, "Clinical review of 100 calculator outputs: 98% rated \u201cclinically appropriate\u201d; 2% edge "
     "cases need clinician override.", size=11, italic=True, color=GREY)
footer(s,n)

# 13. Architecture
s,n = new_slide()
title(s, "System Architecture")
layers=[("Client layer (PWA)","Next.js 14, React 18, Tailwind, Service Worker + IndexedDB", NAVY, NAVY_T),
        ("API gateway","Kong / AWS API GW \u2014 rate limit, JWT (Clerk), validation, routing", TEAL, TEAL_T),
        ("Services","Meal API  \u2022  CGM API  \u2022  ML Inference (FastAPI)  \u2022  User API  \u2022  Sync API", AMBER, AMBER_T),
        ("Data layer","PostgreSQL  \u2022  TimescaleDB  \u2022  Redis 7 + BullMQ  \u2022  MLflow / S3", GREY, LIGHT)]
ly=1.35
for head,body,col,fill in layers:
    card(s, LEFT, ly, W, 0.8, fill=fill, line=col, lw=0.7)
    tb=s.shapes.add_textbox(Inches(LEFT+0.18), Inches(ly+0.06), Inches(1.5), Inches(0.68))
    tf=tb.text_frame; tf.vertical_anchor=MSO_ANCHOR.MIDDLE
    pp=tf.paragraphs[0]
    r=pp.add_run(); r.text=head; r.font.name="Arial"; r.font.size=Pt(11.5); r.font.bold=True; r.font.color.rgb=col
    tb=s.shapes.add_textbox(Inches(LEFT+1.72), Inches(ly+0.08), Inches(W-1.92), Inches(0.64))
    tf=tb.text_frame; tf.word_wrap=True; tf.vertical_anchor=MSO_ANCHOR.MIDDLE
    pp=tf.paragraphs[0]
    r=pp.add_run(); r.text=body; r.font.name="Arial"; r.font.size=Pt(10.5); r.font.color.rgb=GREY
    ly+=0.9
arrow(s, 4.7, 2.12, "\u2192", size=20, color=GREY)
para(s, 4.4, 2.5, 1.2, "HTTPS / WSS", size=9, color=GREY, align=PP_ALIGN.CENTER)
para(s, LEFT, 5.05, W, "Offline-first: Service Worker caches assets; IndexedDB stores meals/CGM/insulin; Background "
     "Sync flushes on reconnect (100% sync in 2.3 min, 0.3% conflict rate).", size=11, italic=True, color=GREY)
footer(s,n)

# 14. Tech stack
s,n = new_slide()
title(s, "Technology Stack")
groups=[("Frontend",["Next.js 14","React 18","Tailwind","TypeScript","Zustand + TanStack Query"],NAVY,NAVY_T),
        ("API",["Fastify 4","Prisma 5","PostgreSQL 16","TimescaleDB 2.14","Redis 7","Clerk"],TEAL,TEAL_T),
        ("ML",["FastAPI","ONNX Runtime 1.18","MLflow","EfficientNet-B3","TFT"],AMBER,AMBER_T),
        ("Infra",["Docker","Kubernetes (EKS)","Helm","Prometheus/Grafana","ArgoCD","GitHub Actions"],GREY,LIGHT)]
gx=LEFT
for head,items,col,fill in groups:
    card(s, gx, 1.35, 1.95, 4.3, fill=WHITE, line=col, lw=0.6)
    tb=s.shapes.add_textbox(Inches(gx+0.1), Inches(1.45), Inches(1.75), Inches(0.32))
    pp=tb.text_frame.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
    r=pp.add_run(); r.text=head; r.font.name="Arial"; r.font.size=Pt(12.5); r.font.bold=True; r.font.color.rgb=col
    cy=1.85
    for it in items:
        card(s, gx+0.12, cy, 1.7, 0.32, fill=fill, line=col, lw=0.4)
        tb=s.shapes.add_textbox(Inches(gx+0.12), Inches(cy), Inches(1.7), Inches(0.32))
        tf=tb.text_frame; tf.vertical_anchor=MSO_ANCHOR.MIDDLE
        pp=tf.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
        r=pp.add_run(); r.text=it; r.font.name="Arial"; r.font.size=Pt(9.5); r.font.bold=True; r.font.color.rgb=col
        cy+=0.40
    gx+=2.1
footer(s,n)

# 15. Offline-first
s,n = new_slide()
title(s, "Offline-First PWA")
flow=[("Log offline","Meals / CGM / insulin",NAVY),
      ("IndexedDB","Local store (idb)",TEAL),
      ("Background Sync","Flush on reconnect",AMBER),
      ("Conflict resolve","0.3% conflict rate",RED)]
fx=0.95
for lab,sub,col in flow:
    box(s, fx, 2.0, 1.85, 1.2, lab+"\n"+sub, fill=WHITE, color=col, size=10.5, line=col)
    fx+=2.0
    if fx<7.6: arrow(s, fx-0.18, 2.45, "\u2192", size=18, color=GREY)
hero(s, 1.0, 3.5, 2.35, "2.3 min", "sync on reconnect", color=TEAL, bg=TEAL_T, numsize=28)
hero(s, 3.55, 3.5, 2.35, "100%", "core features offline", color=TEAL, bg=TEAL_T, numsize=28)
hero(s, 6.1, 3.5, 2.35, "0.3%", "conflict rate", color=TEAL, bg=TEAL_T, numsize=28)
bullets(s, LEFT, 5.15, W, ["Service Worker (Workbox) caches app shell + API responses.",
                            "IndexedDB stores mutations; Background Sync flushes when online.",
                            "Conflict resolution by (user, entity, updated_at)."], size=11, gap=3)
footer(s,n)

# 16. Results hypo
s,n = new_slide()
title(s, "Results \u2014 Hypoglycemia Prediction")
hero(s, 0.95, 1.3, 1.9, "92.3%", "sensitivity @ 30 min", color=NAVY, numsize=30)
hero(s, 2.95, 1.3, 1.9, "0.954", "AUROC @ 30 min", color=TEAL, numsize=30)
hero(s, 4.95, 1.3, 1.9, "12.4", "mg/dL MAE @ 30 min", color=AMBER, numsize=30)
hero(s, 6.95, 1.3, 1.9, "18 ms", "median latency (CPU)", color=GREY, numsize=30)
para(s, LEFT, 2.95, W, "Sensitivity by subgroup (30-min horizon)", size=11.5, bold=True, color=NAVY)
labels=["NPH+Regular","Premixed 30/70","Pediatric","High-carb","Nocturnal","Post-exercise"]
vals=[91.8,90.2,93.1,89.7,94.2,88.5]
hbar(s, LEFT, 3.25, W, 1.4, labels, vals, color=NAVY, maxv=96, suffix="%", valsize=9)
para(s, LEFT, 5.15, W, "Explainability: top-3 attention features match clinical expectation in 94% of high-risk "
     "predictions (IOB spike + carb absorption lag).", size=10.5, italic=True, color=GREY)
footer(s,n)

# 17. Results carb + safety
s,n = new_slide()
title(s, "Results \u2014 Carb Estimation & Insulin Safety")
para(s, LEFT, 1.25, 4.0, "Carb estimation MAE by data source", size=11.5, bold=True, color=NAVY)
labels=["Synthetic","Nutrition5k","Real Indian","Composite (target)"]
vals=[4.2,11.8,14.3,13.7]
hbar(s, LEFT, 1.55, 4.0, 1.6, labels, vals, color=TEAL, maxv=16, suffix=" g", valsize=9)
hero(s, 4.2, 1.3, 1.75, "13.7 g", "composite MAE (target <15 g)", color=TEAL, bg=TEAL_T, numsize=26)
hero(s, 4.2, 2.95, 1.75, "78.4%", "top-1 accuracy (composite)", color=TEAL, bg=TEAL_T, numsize=26)
hero(s, 6.1, 1.3, 1.75, "50/50", "safety tests passed", color=RED, bg=RED_T, numsize=26)
hero(s, 6.1, 2.95, 1.75, "98%", "clinician-approved outputs", color=RED, bg=RED_T, numsize=26)
bullets(s, 4.2, 4.7, 4.9, ["Failure modes: occlusion +8 g, mixed plates +6 g, unseen dishes +12 g.",
                            "Clinical review: 2% edge cases (extreme insulin resistance, renal impairment) "
                            "need override."], size=10.5, gap=3)
footer(s,n)

# 18. System perf + UX
s,n = new_slide()
title(s, "Results \u2014 System Performance & UX")
kpis=[("1.8 s","LCP (target <2.5 s)",NAVY),("142 ms","INP (target <200 ms)",NAVY),
      ("185 ms","meal log p95 (target <300)",TEAL),("42 ms","TFT inference CPU",TEAL),
      ("230 ms","AGP query 30 d",AMBER),("2.3 min","offline sync",AMBER),
      ("84.2","SUS score (Grade A)",RED),("94%","task success rate",RED)]
cx,cy=LEFT,1.35
for num,lab,col in kpis:
    hero(s, cx, cy, 1.95, num, lab, color=col, numsize=24)
    cx+=2.05
    if cx>LEFT+W-1: cx=LEFT; cy+=1.22
para(s, LEFT, 4.0, W, "Pilot: 15 T1D users + 5 caregivers, 2 weeks. NPS 62 (promoters 73%), time-to-meal-log "
     "42 s, time-to-bolus 28 s, offline task completion 100%. WCAG 2.1 AA compliant.", size=10.5, italic=True, color=GREY)
footer(s,n)

# 19. Testing
s,n = new_slide()
title(s, "Software Testing")
rows=[["Module","Coverage (lines)","Tests"],
      ["Bolus Calculator","98%","52"],
      ["Indian PK models","96%","41"],
      ["Carb absorption","93%","33"],
      ["Food DB utils","94%","38"],
      ["CGM alignment","91%","27"],
      ["API routes (agg.)","92%","220"],
      ["Total","\u226590% (target)","411+"]]
table(s, LEFT, 1.30, 5.6, rows, colw=[2.6,1.6,1.4], size=11, h=0.32)
bullets(s, 6.6, 1.3, 2.5, [("Integration: ","Testcontainers (PG+TimescaleDB, Redis, MinIO) \u2014 6 suites."),
                            ("E2E: ","Playwright (Chromium/Firefox/WebKit + mobile)."),
                            ("Safety: ","50/50 insulin safety cases pass."),
                            ("Targets: ","\u226590% lines, \u226585% branches.")], size=10, gap=4)
footer(s,n)

# 20. User voices
s,n = new_slide()
title(s, "What Users Said")
quotes=[("\u201cFinally, an app that understands rajma-chawal as ONE meal, not three.\u201d","Parent of 10yo T1D"),
        ("\u201cThe hypo alert woke me up at 3 AM. Ate glucose tablets. Saved me.\u201d","Adult T1D, 15 years"),
        ("\u201cVoice input in Hindi is a game-changer for my mother.\u201d","Caregiver"),
        ("\u201cNPH peaking warning on the calculator \u2014 nobody else has this.\u201d","Endocrinologist reviewer")]
cy=1.35
for q,attr in quotes:
    card(s, LEFT, cy, W, 0.95, fill=LIGHT, line=NAVY, lw=0.5)
    tb=s.shapes.add_textbox(Inches(LEFT+0.25), Inches(cy+0.12), Inches(W-0.5), Inches(0.55))
    tf=tb.text_frame; tf.word_wrap=True
    pp=tf.paragraphs[0]
    r=pp.add_run(); r.text=q; r.font.name="Times New Roman"; r.font.size=Pt(13)
    r.font.italic=True; r.font.color.rgb=NAVY_D
    tb2=s.shapes.add_textbox(Inches(LEFT+0.25), Inches(cy+0.68), Inches(W-0.5), Inches(0.25))
    pp=tb2.text_frame.paragraphs[0]
    r=pp.add_run(); r.text="\u2014 "+attr; r.font.name="Arial"; r.font.size=Pt(10); r.font.bold=True; r.font.color.rgb=GREY
    cy+=1.05
footer(s,n)

# 21. Conclusion
s,n = new_slide()
title(s, "Conclusion")
para(s, LEFT, 1.25, W, "T1D India is the first AI-powered hypoglycemia prediction and carb-counting tool designed "
     "specifically for the Indian Type 1 Diabetes context.", size=13, bold=True, color=NAVY)
contribs=["Indian Food Intelligence \u2014 500+ foods, 112 composite meals, 6 languages, reference objects.",
          "Indian Insulin PK \u2014 two-compartment models for Regular/NPH/premixed, accurate IOB for 70%+ patients.",
          "Three-Phase Carb Absorption \u2014 rapid/intermediate/slow with meal-type modifiers.",
          "TFT Hypo Prediction \u2014 >92% sensitivity @ 30 min with explainable attention weights.",
          "Multi-Task Food Vision \u2014 EfficientNet-B3, MAE <15 g carbs for composite meals.",
          "Regimen-Aware Bolus Calculator \u2014 4 regimens, hard safety caps, 98% clinician-approved.",
          "Offline-First PWA + Clinical Infra \u2014 TimescaleDB, ONNX, Kubernetes, DPDP Act 2023."]
bullets(s, LEFT, 1.7, W, contribs, size=12, gap=4, accent=TEAL)
footer(s,n)

# 22. Roadmap
s,n = new_slide()
title(s, "Future Work")
phases=[("Phase 1 (0\u20136 mo)",NAVY,["Clinical study (50 pts, AIIMS/PGIMER)","Retrain on Indian clinical data",
                                       "CGM vendor partnerships","CDSCO SaMD submission"]),
        ("Phase 2 (6\u201318 mo)",TEAL,["Extend to T2D on insulin","Pregnancy module","Telemedicine integration",
                                        "Wearable integration"]),
        ("Phase 3 (18\u201336 mo)",AMBER,["Voice assistant (Alexa)","Predictive meal planning",
                                          "Community + AI nutritionist","Global South expansion"])]
cx=LEFT
for head,col,items in phases:
    card(s, cx, 1.35, 2.62, 4.2, fill=WHITE, line=col, lw=0.8)
    tb=s.shapes.add_textbox(Inches(cx+0.15), Inches(1.45), Inches(2.32), Inches(0.4))
    pp=tb.text_frame.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
    r=pp.add_run(); r.text=head; r.font.name="Arial"; r.font.size=Pt(12.5); r.font.bold=True; r.font.color.rgb=col
    bullets(s, cx+0.18, 1.9, 2.28, items, size=10.5, color=GREY, accent=col, indent=0.16, gap=4)
    cx+=2.78
footer(s,n)

# 23. References
s,n = new_slide()
title(s, "References")
refs=["[1] JMIR Publications, LSTM-based hypoglycemia prediction, J Med Internet Res, 2024.",
      "[2] Lim B et al., Temporal Fusion Transformers, Int J Forecast, 2021.",
      "[5] Kovatchev BP et al., UVA/Padova T1D Simulator, J Diabetes Sci Technol, 2020.",
      "[7] Sharma SK et al., NPH+Regular usage in Indian T1D, Indian J Endocrinol Metab, 2022.",
      "[8] Gupta A et al., PK of human insulin in South Asians, Diabetes Ther, 2021.",
      "[11] Longvah T et al., Nutritive Value of Indian Foods, ICMR-NIN, 2017.",
      "[15] Shokri A et al., Nutrition5k, CVPR, 2021.",
      "[16] Tan M, Le Q, EfficientNet, ICML, 2019.",
      "[18] Vaswani A et al., Attention Is All You Need, NeurIPS, 2017.",
      "[20] TimescaleDB, Timescale Inc., 2024.",
      "[22] Digital Personal Data Protection Act, 2023, Govt. of India.",
      "[29] ISPAD Clinical Practice Consensus Guidelines 2022."]
bullets(s, LEFT, 1.30, W, refs, size=10.5, gap=2, accent=NAVY)
footer(s,n)

# 24. Thank you
s,n = new_slide()
card(s, 1.6, 1.2, 6.8, 4.0, fill=NAVY_T, line=NAVY, lw=0.8)
tb=s.shapes.add_textbox(Inches(1.6), Inches(1.55), Inches(6.8), Inches(0.9))
tf=tb.text_frame; tf.vertical_anchor=MSO_ANCHOR.MIDDLE
pp=tf.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
r=pp.add_run(); r.text="Thank You"
r.font.name="Times New Roman"; r.font.size=Pt(46); r.font.bold=True; r.font.color.rgb=NAVY
tb=s.shapes.add_textbox(Inches(1.6), Inches(2.55), Inches(6.8), Inches(0.5))
pp=tb.text_frame.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
r=pp.add_run(); r.text="Questions & Discussion"
r.font.name="Arial"; r.font.size=Pt(17); r.font.color.rgb=GREY
tb=s.shapes.add_textbox(Inches(1.6), Inches(3.2), Inches(6.8), Inches(1.5))
tf=tb.text_frame; tf.word_wrap=True
pp=tf.paragraphs[0]; pp.alignment=PP_ALIGN.CENTER
r=pp.add_run(); r.text="T1D India \u2014 AI-Powered Hypoglycemia Prediction and Carb-Counting Tool for Indian T1D Diets"
r.font.name="Arial"; r.font.size=Pt(12); r.font.bold=True; r.font.color.rgb=NAVY_D
pp=tf.add_paragraph(); pp.alignment=PP_ALIGN.CENTER; pp.space_before=Pt(8)
r=pp.add_run(); r.text="Team Doom (TYAIEC101)  \u2022  Guide: Dr. Mayuresh Gulame\nHimanshu Sharma (ADT24SOCB0462)  \u2022  Chetan Bhapkar (ADT24SOCB0336)  \u2022  Yash Suresh Bhandari (ADT24SOCB1437)"
r.font.name="Arial"; r.font.size=Pt(10.5); r.font.color.rgb=GREY
footer(s,n)

# ---------- save + patch master logo ----------
p.save(OUT)
def patch_master_logo(path):
    zin=zipfile.ZipFile(path); items={n:zin.read(n) for n in zin.namelist()}; zin.close()
    xml=items['ppt/slideMasters/_rels/slideMaster1.xml.rels'].decode('utf-8')
    xml=xml.replace('Target="../media/image1.jpg"','Target="../media/image3.png"')
    items['ppt/slideMasters/_rels/slideMaster1.xml.rels']=xml.encode('utf-8')
    zout=zipfile.ZipFile(path,'w',zipfile.ZIP_DEFLATED)
    for n,d in items.items(): zout.writestr(n,d)
    zout.close()
patch_master_logo(OUT)
print("Saved", OUT, "slides:", len(p.slides))
