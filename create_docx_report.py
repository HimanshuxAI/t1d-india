#!/usr/bin/env python3
"""
Convert the PROJECT_REPORT.md to a properly formatted DOCX file
following the MIT School of Computing project report format guidelines.
"""

from docx import Document
from docx.shared import Pt, Inches, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.section import WD_ORIENT, WD_SECTION
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml
import re

def setup_document():
    """Create document with proper page setup and styles."""
    doc = Document()
    
    # Page setup: A4, margins as per guidelines
    for section in doc.sections:
        section.page_width = Cm(21.0)
        section.page_height = Cm(29.7)
        section.top_margin = Cm(2.54)    # 1 inch
        section.bottom_margin = Cm(2.54) # 1 inch
        section.left_margin = Cm(3.17)   # 1.25 inch
        section.right_margin = Cm(2.54)  # 1 inch
    
    # Define styles
    style = doc.styles['Normal']
    font = style.font
    font.name = 'Times New Roman'
    font.size = Pt(12)
    style.paragraph_format.line_spacing = 1.5
    style.paragraph_format.space_after = Pt(6)
    style.paragraph_format.space_before = Pt(0)
    style.paragraph_format.first_line_indent = Cm(1.0)  # Two-space indentation
    
    # Heading styles
    for level in range(1, 4):
        heading_style = doc.styles[f'Heading {level}']
        heading_style.font.name = 'Times New Roman'
        heading_style.font.color.rgb = RGBColor(0, 0, 0)
        if level == 1:
            heading_style.font.size = Pt(18)
            heading_style.font.bold = True
            heading_style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
            heading_style.paragraph_format.space_before = Pt(24)
            heading_style.paragraph_format.space_after = Pt(12)
        elif level == 2:
            heading_style.font.size = Pt(12)
            heading_style.font.bold = True
            heading_style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
            heading_style.paragraph_format.space_before = Pt(18)
            heading_style.paragraph_format.space_after = Pt(6)
        elif level == 3:
            heading_style.font.size = Pt(12)
            heading_style.font.bold = True
            heading_style.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.LEFT
            heading_style.paragraph_format.space_before = Pt(10)
            heading_style.paragraph_format.space_after = Pt(6)
    
    return doc

def set_section_footer(section, text="MITSOC, Department of Computer Engineering 2026"):
    """Set the footer text on one section (guideline: from Introduction page)."""
    footer = section.footer
    footer.is_linked_to_previous = False
    p = footer.paragraphs[0] if footer.paragraphs else footer.add_paragraph()
    # Clear any inherited runs
    for r in list(p.runs):
        r._element.getparent().remove(r._element)
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(128, 128, 128)

def add_blank_lines(doc, count=1):
    """Add blank paragraphs."""
    for _ in range(count):
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.0

def add_centered_text(doc, text, size=14, bold=False, upper=False, space_before=0, space_after=0):
    """Add centered text with formatting."""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.0
    run = p.add_run(text.upper() if upper else text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(size)
    run.font.bold = bold
    return p

def add_left_text(doc, text, size=12, bold=False, upper=False, space_before=0, space_after=0, indent=False):
    """Add left-aligned text with formatting."""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.5
    if indent:
        p.paragraph_format.first_line_indent = Cm(1.0)
    run = p.add_run(text.upper() if upper else text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(size)
    run.font.bold = bold
    return p

def add_signature_block(doc, lines, space_before=0):
    """Add a signature block with multiple lines."""
    for i, line in enumerate(lines):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_before = Pt(space_before if i == 0 else 0)
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.0
        run = p.add_run(line)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)
        if i == 0:
            run.font.bold = True

def add_inline_formatted_text(paragraph, text, base_size=12):
    """Add text to paragraph while handling **bold**, *italic*, and `code` inline markers."""
    # Tokenize on bold, italic, code markers
    pattern = re.compile(r'(\*\*.+?\*\*|\*[^*]+?\*|`[^`]+?`)')
    parts = pattern.split(text)
    for part in parts:
        if not part:
            continue
        if part.startswith('**') and part.endswith('**') and len(part) > 4:
            run = paragraph.add_run(part[2:-2])
            run.font.bold = True
        elif part.startswith('`') and part.endswith('`') and len(part) > 2:
            run = paragraph.add_run(part[1:-1])
            run.font.name = 'Courier New'
            run.font.size = Pt(base_size - 1)
            continue
        elif part.startswith('*') and part.endswith('*') and len(part) > 2:
            run = paragraph.add_run(part[1:-1])
            run.font.italic = True
        else:
            run = paragraph.add_run(part)
        run.font.name = 'Times New Roman'
        if not run.font.size:
            run.font.size = Pt(base_size)


def parse_markdown_table(table_text):
    """Parse markdown table into list of rows, skipping the separator row."""
    lines = table_text.strip().split('\n')
    rows = []
    for line in lines:
        if line.startswith('|') and line.endswith('|'):
            cells = [cell.strip() for cell in line.split('|')[1:-1]]
            # Skip the markdown separator row (e.g. |---|---| or |:--:|:--|)
            if all(re.fullmatch(r'[-: ]*', c) for c in cells):
                continue
            rows.append(cells)
    return rows

def add_table_from_markdown(doc, table_text):
    """Add a table from markdown format."""
    rows = parse_markdown_table(table_text)
    if not rows:
        return
    
    table = doc.add_table(rows=len(rows), cols=len(rows[0]))
    table.style = 'Table Grid'
    
    for i, row_data in enumerate(rows):
        for j, cell_text in enumerate(row_data):
            cell = table.cell(i, j)
            # Clear default paragraph and add inline-formatted text (strips ** markers)
            para = cell.paragraphs[0]
            para.paragraph_format.space_before = Pt(2)
            para.paragraph_format.space_after = Pt(2)
            para.paragraph_format.line_spacing = 1.0
            add_inline_formatted_text(para, cell_text, base_size=10)
            for run in para.runs:
                run.font.name = 'Times New Roman'
                if not run.font.size:
                    run.font.size = Pt(10)
                if i == 0:
                    run.font.bold = True
    
    return table

def process_markdown_file(doc, md_path):
    """Process the markdown file and add chapter content (skip front matter already created)."""
    with open(md_path, 'r', encoding='utf-8') as f:
        content = f.read()

    lines = content.split('\n')

    # Skip cover/certificates/declaration/abstract (built manually).
    # Start from CONTENTS so the real TOC / List of Figures / List of Tables tables are rendered.
    start_idx = 0
    for idx, ln in enumerate(lines):
        if ln.strip().upper() == '## CONTENTS':
            start_idx = idx
            break
    lines = lines[start_idx:]

    front_matter_headings = {'CONTENTS', 'LIST OF FIGURES', 'LIST OF TABLES'}

    i = 0
    in_table = False
    table_lines = []
    in_code_block = False
    code_lines = []
    first_block = True
    body_started = False

    while i < len(lines):
        line = lines[i]

        # Code blocks
        if line.startswith('```'):
            if in_code_block:
                p = doc.add_paragraph()
                p.paragraph_format.space_before = Pt(4)
                p.paragraph_format.space_after = Pt(4)
                p.paragraph_format.line_spacing = 1.0
                run = p.add_run('\n'.join(code_lines))
                run.font.name = 'Courier New'
                run.font.size = Pt(8)
                code_lines = []
                in_code_block = False
            else:
                in_code_block = True
            i += 1
            continue

        if in_code_block:
            code_lines.append(line)
            i += 1
            continue

        # Tables
        if line.startswith('|') and '|' in line[1:]:
            table_lines.append(line)
            in_table = True
            i += 1
            continue
        elif in_table and not line.startswith('|'):
            if table_lines:
                add_table_from_markdown(doc, '\n'.join(table_lines))
                table_lines = []
            in_table = False
            continue

        # Chapter heading
        if line.startswith('# '):
            text = line[2:].strip()
            is_chapter = text.upper().startswith('CHAPTER')
            if is_chapter and not body_started:
                # First chapter (Introduction): start body section so footer begins here
                new_section = doc.add_section(WD_SECTION.NEW_PAGE)
                try:
                    new_section.top_margin = Cm(2.54)
                    new_section.bottom_margin = Cm(2.54)
                    new_section.left_margin = Cm(3.17)
                    new_section.right_margin = Cm(2.54)
                except Exception:
                    pass
                set_section_footer(new_section)
                body_started = True
            elif not first_block:
                doc.add_page_break()
            first_block = False
            add_centered_text(doc, text, size=18, bold=True, upper=True, space_before=12, space_after=12)
        # Section heading
        elif line.startswith('## '):
            text = line[3:].strip()
            if text.upper() in front_matter_headings:
                # Front-matter heading: centered, 16pt, bold, uppercase, on its own page
                if not first_block:
                    doc.add_page_break()
                first_block = False
                add_centered_text(doc, text, size=16, bold=True, upper=True, space_before=12, space_after=12)
                add_blank_lines(doc, 2)
            else:
                add_left_text(doc, text, size=12, bold=True, upper=False, space_before=16, space_after=6)
        # Subsection heading
        elif line.startswith('### '):
            text = line[4:].strip()
            add_left_text(doc, text, size=12, bold=True, upper=False, space_before=10, space_after=6)
        elif line.startswith('#### '):
            text = line[5:].strip()
            add_left_text(doc, text, size=12, bold=True, upper=False, space_before=8, space_after=4)
        elif line.startswith('---'):
            pass  # skip separators (page breaks handled at chapters)
        elif line.strip().startswith('**Figure') or line.strip().startswith('Figure '):
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(4)
            add_inline_formatted_text(p, line.strip(), base_size=10)
            for run in p.runs:
                run.font.italic = True
        elif line.strip().startswith('**Table') or line.strip().startswith('Table '):
            p = doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(4)
            p.paragraph_format.space_after = Pt(4)
            add_inline_formatted_text(p, line.strip(), base_size=10)
            for run in p.runs:
                run.font.italic = True
        elif line.strip() == '':
            pass  # spacing handled by paragraph space_after
        elif line.startswith('- ') or line.startswith('* '):
            p = doc.add_paragraph(style='List Bullet')
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.5
            add_inline_formatted_text(p, line[2:].strip(), base_size=12)
        elif re.match(r'^\d+\.\s', line):
            p = doc.add_paragraph(style='List Number')
            p.paragraph_format.space_before = Pt(2)
            p.paragraph_format.space_after = Pt(2)
            p.paragraph_format.line_spacing = 1.5
            add_inline_formatted_text(p, re.sub(r'^\d+\.\s', '', line), base_size=12)
        else:
            if line.strip():
                p = doc.add_paragraph()
                p.paragraph_format.space_before = Pt(0)
                p.paragraph_format.space_after = Pt(6)
                p.paragraph_format.line_spacing = 1.5
                p.paragraph_format.first_line_indent = Cm(1.0)
                p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                add_inline_formatted_text(p, line.strip(), base_size=12)

        i += 1

    if table_lines:
        add_table_from_markdown(doc, '\n'.join(table_lines))

def add_centered_image(doc, image_path, width_inches):
    """Add a centered image to the document."""
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run()
    run.add_picture(image_path, width=Inches(width_inches))
    return p


def create_cover_page(doc):
    """Create the cover page as per format (with logos as in original template) - single page."""
    # University header
    add_centered_text(doc, "Department of Computer Science and Engineering / Information Technology", size=12, bold=True, upper=True, space_before=0, space_after=2)
    add_centered_text(doc, "MIT SCHOOL OF COMPUTING", size=15, bold=True, upper=True, space_before=0, space_after=2)
    add_centered_text(doc, "MIT ADT University, Loni Kalbhor, Pune", size=12, bold=False, upper=False, space_before=0, space_after=6)

    add_centered_text(doc, "A PROJECT REPORT ON", size=14, bold=True, upper=True, space_before=4, space_after=4)
    add_centered_text(doc, "AI-POWERED HYPOGLYCEMIA PREDICTION AND CARB-COUNTING TOOL FOR INDIAN T1D DIETS", size=18, bold=True, upper=True, space_before=0, space_after=8)
    add_centered_text(doc, "SUBMITTED TO", size=12, bold=False, upper=True, space_before=2, space_after=4)
    add_centered_text(doc, "MIT SCHOOL OF COMPUTING, LONI, PUNE IN PARTIAL FULFILLMENT OF THE REQUIREMENTS FOR THE AWARD OF THE DEGREE", size=12, bold=False, upper=True, space_before=0, space_after=8)
    add_centered_text(doc, "BACHELOR OF TECHNOLOGY", size=14, bold=True, upper=True, space_before=0, space_after=0)
    add_centered_text(doc, "(Computer Science & Engineering/ Information Technology)", size=12, bold=True, upper=True, space_before=0, space_after=8)
    add_centered_text(doc, "BY", size=14, bold=True, upper=True, space_before=2, space_after=6)

    # Student info (team members from PBL Management System)
    members = [
        ("HIMANSHU SHARMA", "ADT24SOCB0462"),
        ("CHETAN BHAPKAR", "ADT24SOCB0336"),
        ("YASH SURESH BHANDARI", "ADT24SOCB1437"),
    ]
    for idx, (name, prn) in enumerate(members):
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(2 if idx < len(members) - 1 else 6)
        p.paragraph_format.line_spacing = 1.0
        run = p.add_run(name + "   |   PRN/ Enrollment No: " + prn)
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)
        run.font.bold = True

    add_centered_text(doc, "Under the guidance of", size=14, bold=True, upper=True, space_before=2, space_after=2)
    add_centered_text(doc, "Dr. Mayuresh Gulame", size=14, bold=False, upper=False, space_before=0, space_after=2)

    # LOGO 1: MIT University circular seal (as in original template, after guide name)
    add_centered_image(doc, '/Users/himanshu/Documents/PBL/assets/images/image6.jpg', width_inches=0.95)

    add_centered_text(doc, "DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", size=12, bold=False, upper=True, space_before=0, space_after=0)
    add_centered_text(doc, "MIT School OF COMPUTING", size=12, bold=False, upper=True, space_before=0, space_after=0)
    add_centered_text(doc, "MIT Art, Design and Technology University", size=12, bold=False, upper=True, space_before=0, space_after=0)
    add_centered_text(doc, "Rajbaug Campus, Loni-Kalbhor, Pune 412201", size=12, bold=False, upper=True, space_before=0, space_after=2)
    add_centered_text(doc, "2026-2027", size=12, bold=False, upper=False, space_before=0, space_after=4)

    # LOGO 2: MIT-ADT University horizontal logo (end of cover page, as in original template)
    add_centered_image(doc, '/Users/himanshu/Documents/PBL/assets/images/image3.png', width_inches=2.0)

    doc.add_page_break()

def create_certificate_page(doc):
    """Create certificate page."""
    add_centered_text(doc, "MIT SCHOOL OF COMPUTING", size=16, bold=True, upper=True, space_before=0, space_after=0)
    add_centered_text(doc, "DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING", size=16, bold=True, upper=True, space_before=0, space_after=0)
    add_centered_text(doc, "MIT ART, DESIGN AND TECHNOLOGY UNIVERSITY,", size=16, bold=True, upper=True, space_before=0, space_after=0)
    add_centered_text(doc, "RAJBAUG CAMPUS, LONI-KALBHOR, PUNE 412201", size=16, bold=True, upper=True, space_before=0, space_after=24)
    add_centered_text(doc, "CERTIFICATE", size=16, bold=True, upper=True, space_before=0, space_after=14)
    add_blank_lines(doc, 1)
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Cm(1.0)
    run = p.add_run('This is to certify that the project report entitled ')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    run = p.add_run('"AI-POWERED HYPOGLYCEMIA PREDICTION AND CARB-COUNTING TOOL FOR INDIAN T1D DIETS"')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    run.bold = True
    run = p.add_run(' ')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    
    add_blank_lines(doc, 2)
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Cm(1.0)
    run = p.add_run('Submitted by')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    
    add_blank_lines(doc, 1)
    
    for (nm, prn) in [("HIMANSHU SHARMA", "ADT24SOCB0462"),
                      ("CHETAN BHAPKAR", "ADT24SOCB0336"),
                      ("YASH SURESH BHANDARI", "ADT24SOCB1437")]:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.line_spacing = 1.0
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(f'{nm}\tPRN/ Enrollment No: {prn}')
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)
    
    add_blank_lines(doc, 1)
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Cm(1.0)
    run = p.add_run('is a bonafide work carried out by them under the supervision of Dr. Mayuresh Gulame and it is submitted towards the partial fulfillment of the requirement of MIT ADT university, Pune for the award of the degree of Bachelor of Technology (Computer Science and Engineering)')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    
    add_blank_lines(doc, 2)
    
    # Signature block
    add_signature_block(doc, [
        "Dr. Mayuresh Gulame\t\t\t\t\tDr. [HOD Name]",
        "Guide\t\t\t\t\t\t\tHead of Department",
        "",
        "Prof. Suresh Kapare\t\t\t\t\tDr. Ganesh Pathak",
        "Chief Coordinator-PBL\t\t\t\t\tDean",
        "",
        "Seal/Stamp of the College",
        "Place: PUNE",
        "Date: "
    ])
    
    doc.add_page_break()

def create_external_certificate(doc):
    """Create external guide certificate page."""
    add_centered_text(doc, "CERTIFICATE", size=16, bold=True, upper=True, space_before=0, space_after=24)
    add_blank_lines(doc, 3)
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Cm(1.0)
    run = p.add_run('This is to certify that the Project report entitled ')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    run = p.add_run('"AI-POWERED HYPOGLYCEMIA PREDICTION AND CARB-COUNTING TOOL FOR INDIAN T1D DIETS"')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    run.bold = True
    
    add_blank_lines(doc, 2)
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Cm(1.0)
    run = p.add_run('Submitted by')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    
    add_blank_lines(doc, 1)
    
    for (nm, prn) in [("HIMANSHU SHARMA", "ADT24SOCB0462"),
                      ("CHETAN BHAPKAR", "ADT24SOCB0336"),
                      ("YASH SURESH BHANDARI", "ADT24SOCB1437")]:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.line_spacing = 1.5
        run = p.add_run(f'{nm}\tExam No: {prn}')
        run.font.name = 'Times New Roman'
        run.font.size = Pt(12)
    
    add_blank_lines(doc, 1)
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Cm(1.0)
    run = p.add_run('is a bonafide work carried out by them (with the Sponsorship from MIT ADT University) under the supervision of Mr. Amol Balasaheb Pawar and has been completed successfully.')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    
    add_blank_lines(doc, 4)
    
    add_signature_block(doc, [
        "(Mr. Amol Balasaheb Pawar)",
        "(Industry Mentor)",
        "External Guide",
        "",
        "Seal/Stamp of the Company/College",
        "Place:",
        "Date: "
    ])
    
    doc.add_page_break()

def create_declaration(doc):
    """Create declaration page."""
    add_centered_text(doc, "DECLARATION", size=16, bold=True, upper=True, space_before=0, space_after=24)
    add_blank_lines(doc, 3)
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Cm(1.0)
    run = p.add_run('We, the team members')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    
    add_blank_lines(doc, 3)
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Cm(1.0)
    run = p.add_run('Hereby declare that the project work incorporated in the present project entitled "AI-POWERED HYPOGLYCEMIA PREDICTION AND CARB-COUNTING TOOL FOR INDIAN T1D DIETS" is original work. This work (in part or in full) has not been submitted to any University for the award or a Degree or a Diploma. We have properly acknowledged the material collected from secondary sources wherever required. We solely own the responsibility for the originality of the entire content.')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    
    add_blank_lines(doc, 3)
    
    add_signature_block(doc, [
        "Date: 19/11/2026",
        "Name & Signature of the Team Members",
        "Member 1: HIMANSHU SHARMA (ADT24SOCB0462) __________________",
        "Member 2: CHETAN BHAPKAR (ADT24SOCB0336) __________________",
        "Member 3: YASH SURESH BHANDARI (ADT24SOCB1437) __________________",
        "",
        "Name and Signature of Guide",
        "",
        "Seal/Stamp of the College",
        "Place: Pune",
        "Date: 19/11/2026"
    ])
    
    add_blank_lines(doc, 2)
    
    # LOGO 3: MIT-ADT University logo (end of declaration page, as in original template)
    add_centered_image(doc, '/Users/himanshu/Documents/PBL/assets/images/image1.jpg', width_inches=2.5)
    
    doc.add_page_break()

def create_examiner_certificate(doc):
    """Create examiner's approval certificate."""
    add_centered_text(doc, "DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING", size=14, bold=True, upper=True, space_before=0, space_after=0)
    add_centered_text(doc, "MIT SCHOOL OF COMPUTING,", size=14, bold=True, upper=True, space_before=0, space_after=0)
    add_centered_text(doc, "RAJBAUG, LONI KALBHOR,", size=14, bold=True, upper=True, space_before=0, space_after=0)
    add_centered_text(doc, "PUNE – 412201", size=14, bold=True, upper=True, space_before=0, space_after=24)
    add_blank_lines(doc, 3)
    add_centered_text(doc, "EXAMINER'S APPROVAL CERTIFICATE", size=16, bold=True, upper=True, space_before=0, space_after=24)
    add_blank_lines(doc, 3)
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Cm(1.0)
    run = p.add_run('The project report entitled "AI-POWERED HYPOGLYCEMIA PREDICTION AND CARB-COUNTING TOOL FOR INDIAN T1D DIETS" submitted by HIMANSHU SHARMA (ADT24SOCB0462), CHETAN BHAPKAR (ADT24SOCB0336) and YASH SURESH BHANDARI (ADT24SOCB1437) in partial fulfillment for the award of the degree of Bachelor of Technology (Computer Science & Engineering) during the academic year 2026-27, of MIT-ADT University, MIT School OF COMPUTING, Pune, is hereby approved.')
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    
    add_blank_lines(doc, 3)
    
    add_signature_block(doc, [
        "Examiners:",
        "",
        "1. ___________________________",
        "",
        "2. ___________________________"
    ])
    
    doc.add_page_break()

def create_acknowledgement(doc):
    """Create acknowledgement page."""
    add_centered_text(doc, "ACKNOWLEDGEMENT", size=16, bold=True, upper=True, space_before=0, space_after=24)
    add_blank_lines(doc, 3)
    
    text = """I would like to express my deepest gratitude to MIT School of Computing, MIT ADT University, for providing me the opportunity to undertake this project. My sincere thanks to my guide, Dr. Mayuresh Gulame, for the invaluable guidance, constant encouragement, and constructive feedback throughout the project duration.

I am profoundly grateful to Dr. [HOD Name], Head of Department, Computer Science and Engineering, for the support and facilities provided. Special thanks to Prof. Suresh Kapare, Chief Coordinator-PBL, and Dr. Ganesh Pathak, Dean, MIT School of Computing, for their leadership and vision.

I extend my appreciation to the clinical advisors, nutritionists, and T1D community members in India who shared their insights and experiences, shaping the Indian-first design of this application. The ICMR-NIN "Nutritive Value of Indian Foods" and the JMIR 2024 hypoglycemia prediction benchmark provided critical references for this work.

Finally, I thank my family and peers for their unwavering support and patience during this journey."""
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Cm(1.0)
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    
    add_blank_lines(doc, 4)
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = p.add_run("HIMANSHU SHARMA\nPRN: ADT24SOCB0462")
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    
    doc.add_page_break()

def create_abstract(doc):
    """Create abstract page."""
    add_centered_text(doc, "ABSTRACT", size=16, bold=True, upper=True, space_before=0, space_after=24)
    add_blank_lines(doc, 3)
    
    text = """India has the second-largest population of Type 1 Diabetes (T1D) patients globally, yet existing diabetes management tools are predominantly designed for Western populations—assuming rapid-acting insulin analogues, low-carb meals (40-60g), and English-only interfaces. This mismatch creates dangerous gaps: Indian children primarily use Human Regular + NPH insulin (peaking at 2-6 hours vs. 1-2 hours for analogues), consume high-carb meals (80-120g carbs typical lunch), and communicate in Hinglish.

T1D India addresses this critical gap through three integrated innovations:

1. Indian Food Intelligence: A database of 500+ foods from ICMR-NIN with 100+ composite meals (rajma-chawal, dosa-sambar, thali) logged as single entries, reference objects (katori, chapati, ladle) for portion estimation without scales, and Hindi/Hinglish voice input.

2. Hypoglycemia Prediction with Indian Pharmacokinetics: A Temporal Fusion Transformer (TFT) achieving >91% sensitivity at 30-minute horizon, incorporating two-compartment PK models for NPH/Regular/premixed insulin, three-phase carb absorption curves for Indian mixed meals (rapid/intermediate/slow), and explainable attention weights showing why a hypo is predicted (e.g., "IOB spike + carb absorption lag").

3. Regimen-Aware Insulin Calculator: Supports basal-bolus, NPH+Regular (2-3 injections/day), premixed 30/70/50/50, and pump therapy with safety constraints (max bolus 15U, IOB adjustment, predicted glucose floor ≥70 mg/dL, recent hypo warnings).

The system employs an offline-first PWA architecture (Service Worker + IndexedDB) for school/rural connectivity, TimescaleDB hypertable for 288 CGM readings/day/user with continuous aggregates for AGP reports, and ONNX Runtime for CPU/GPU model inference. Clinical validation is designed as a prospective 12-week study (50 T1D patients, AIIMS/PGIMER) with primary endpoint: ≥30% reduction in time <70 mg/dL vs. baseline, fully compliant with DPDP Act 2023 and IRB/EC requirements.

Keywords: Type 1 Diabetes, Hypoglycemia Prediction, Carb Counting, Indian Diet, NPH Insulin, Temporal Fusion Transformer, TimescaleDB, Offline-First PWA."""
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    p.paragraph_format.line_spacing = 1.5
    p.paragraph_format.first_line_indent = Cm(1.0)
    run = p.add_run(text)
    run.font.name = 'Times New Roman'
    run.font.size = Pt(12)
    
    doc.add_page_break()

def main():
    """Main function to create the DOCX report."""
    print("Creating DOCX report...")
    
    doc = setup_document()
    # NOTE: footer is intentionally NOT added to section 1 (front matter, per guideline
    # "footer ... from Introduction page"). It is added to the body section when
    # Chapter 1 (Introduction) starts inside process_markdown_file().

    # Cover page
    create_cover_page(doc)
    
    # Certificate pages
    create_certificate_page(doc)
    create_external_certificate(doc)
    create_declaration(doc)
    create_examiner_certificate(doc)
    create_acknowledgement(doc)
    create_abstract(doc)  # ends with a page break

    # Process CONTENTS, List of Figures, List of Tables, chapters, bibliography and annexures
    process_markdown_file(doc, '/Users/himanshu/Documents/PBL/PROJECT_REPORT.md')
    
    # Save
    output_path = '/Users/himanshu/Documents/PBL/T1D_India_Project_Report.docx'
    doc.save(output_path)
    print(f"Report saved to: {output_path}")

if __name__ == '__main__':
    main()