"""Generate curriculum PDFs into docs/files from src/curricula.json.

Usage: python3 scripts/make_pdfs.py   (requires: pip install reportlab)
The JSON is exported from src/data.mjs by `npm run build`.
"""
import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "files"
BRAND = colors.HexColor("#ff5a1f")
NAVY = colors.HexColor("#11163a")

styles = getSampleStyleSheet()
H1 = ParagraphStyle("h1", parent=styles["Title"], alignment=0, textColor=NAVY, fontSize=22, leading=26)
H2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=BRAND, spaceBefore=10)
BODY = ParagraphStyle("body", parent=styles["BodyText"], fontSize=10.5, leading=15)
SMALL = ParagraphStyle("small", parent=BODY, fontSize=9, textColor=colors.HexColor("#6b7189"))


def build(path, programme, major, facts, intro, years, first_year=1):
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=16 * mm,
                            title=f"{programme}: {major} — curriculum", author="IT Academy STEP Institute")
    story = [
        Paragraph("IT Academy STEP Institute · Phnom Penh", SMALL),
        Spacer(0, 4),
        Paragraph(f"{programme}<br/>{major}", H1),
        Paragraph(facts, SMALL),
        Spacer(0, 8),
        Paragraph(intro, BODY),
    ]
    for i, subjects in enumerate(years):
        story.append(Paragraph(f"Year {first_year + i}", H2))
        rows = [[str(n + 1), s] for n, s in enumerate(subjects)]
        table = Table(rows, colWidths=[10 * mm, None])
        table.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#6b7189")),
            ("LINEBELOW", (0, 0), (-1, -2), 0.4, colors.HexColor("#e4e6ef")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(table)
    story += [Spacer(0, 14), Paragraph(
        "This document summarises the curriculum. Subjects and their order may be updated; "
        "admissions will confirm the current study plan for your intake.", SMALL)]
    doc.build(story)
    print("  ✓", path.relative_to(ROOT))


def main():
    data = json.loads((ROOT / "src" / "curricula.json").read_text())
    OUT.mkdir(parents=True, exist_ok=True)
    for m in data["majors"]:
        slug = m["page"].replace("bachelor-", "").replace(".html", "")
        build(OUT / f"curriculum-bachelor-{slug}.pdf", "Bachelor of Computer Science", m["name"],
              f"4 years · 8 semesters · {m['credits']} credits · accredited by MoEYS", m["intro"], m["years"])
        build(OUT / f"curriculum-associate-{slug}.pdf", "Associate Degree", m["name"],
              "2 years · graduation project and final exams · accredited by MoEYS", m["intro"], m["years"][:2])
        build(OUT / f"curriculum-diploma-{m['slug']}.pdf", "International Professional Diploma", m["name"],
              "2 years · 3-month graduation project · issued by STEP IT Global", m["intro"], m["years"][:2])
    d = data["dbai"]
    build(OUT / f"curriculum-diploma-{d['slug']}.pdf", "International Professional Diploma", d["name"],
          "2 years · 3-month graduation project · issued by STEP IT Global",
          d["short"] + " The detailed subject list is available from our admissions team.", [])


if __name__ == "__main__":
    main()
