#!/usr/bin/env python3
"""Inject the official MIT-ADT PBL details into PROJECT_REPORT.md and create_docx_report.py."""

import io

# ---------- Details from the PBL Management System ----------
STUDENTS = [
    ("HIMANSHU SHARMA", "ADT24SOCB0462", "Team Leader"),
    ("CHETAN BHAPKAR", "ADT24SOCB0336", ""),
    ("YASH SURESH BHANDARI", "ADT24SOCB1437", ""),
]
GUIDE = "Dr. Mayuresh Gulame"
EXTERNAL_GUIDE = "Amol Balasaheb Pawar"
GROUP = "TYAIEC101"
YEAR = "2026-27"

OLD_TITLE = "T1D INDIA: AI-POWERED HYPOGLYCEMIA PREDICTION AND CARB-COUNTING TOOL FOR INDIAN TYPE 1 DIABETES DIETS"
NEW_TITLE = "AI-POWERED HYPOGLYCEMIA PREDICTION AND CARB-COUNTING TOOL FOR INDIAN T1D DIETS"

def update_markdown(path):
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    # Title (all occurrences)
    text = text.replace(OLD_TITLE, NEW_TITLE)

    # ---- Internal certificate "Submitted by" block ----
    text = text.replace(
        "**HIMANSHU**  \n**PRN/Enrollment No: MITU2026CSXXXX**  ",
        "**HIMANSHU SHARMA**  \n**PRN/Enrollment No: ADT24SOCB0462**  \n"
        "**CHETAN BHAPKAR**  \n**PRN/Enrollment No: ADT24SOCB0336**  \n"
        "**YASH SURESH BHANDARI**  \n**PRN/Enrollment No: ADT24SOCB1437**  "
    )

    # ---- Guide / HOD on certificate ----
    text = text.replace("under the supervision of **Prof. [Guide Name]**",
                        f"under the supervision of **{GUIDE}**")
    text = text.replace("**Prof. [Guide Name]**  \n**Guide**",
                        f"**{GUIDE}**  \n**Guide**")

    # ---- External certificate ----
    text = text.replace(
        "**HIMANSHU**  \n**Exam No: MITU2026CSXXXX**  ",
        "**HIMANSHU SHARMA**  \n**Exam No: ADT24SOCB0462**  "
    )
    text = text.replace("**Mr./Ms. [External Guide Name]** and has been completed successfully.",
                        f"**Mr. {EXTERNAL_GUIDE}** and has been completed successfully.")
    text = text.replace("**(Mr./Ms. [External Guide Name])**",
                        f"**(Mr. {EXTERNAL_GUIDE})**")

    # ---- Declaration members ----
    text = text.replace(
        "**Member 1: HIMANSHU** __________________  ",
        "**Member 1: HIMANSHU SHARMA (ADT24SOCB0462)** __________________  \n\n"
        "**Member 2: CHETAN BHAPKAR (ADT24SOCB0336)** __________________  \n\n"
        "**Member 3: YASH SURESH BHANDARI (ADT24SOCB1437)** __________________  "
    )

    # ---- Examiner's approval ----
    text = text.replace(
        "submitted by **HIMANSHU (MITU2026CSXXXX)** in partial fulfillment",
        "submitted by **HIMANSHU SHARMA (ADT24SOCB0462), CHETAN BHAPKAR (ADT24SOCB0336) "
        "and YASH SURESH BHANDARI (ADT24SOCB1437)** in partial fulfillment"
    )

    # ---- Acknowledgement guide name ----
    text = text.replace("my guide, **Prof. [Guide Name]**,", f"my guide, **{GUIDE}**,")

    # ---- Acknowledgement signature ----
    text = text.replace(
        "**HIMANSHU**  \n**PRN: MITU2026CSXXXX**  ",
        "**HIMANSHU SHARMA**  \n**PRN: ADT24SOCB0462**  "
    )

    # ---- Publications authorship ----
    text = text.replace("1. **Himanshu**, [Guide Name],", f"1. **Himanshu Sharma**, {GUIDE},")
    text = text.replace("2. **Himanshu**, [Guide Name],", f"2. **Himanshu Sharma**, {GUIDE},")
    text = text.replace("3. **Himanshu**, [Guide Name],", f"3. **Himanshu Sharma**, {GUIDE},")

    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    print(f"Updated {path}")

if __name__ == "__main__":
    update_markdown("/Users/himanshu/Documents/PBL/PROJECT_REPORT.md")
