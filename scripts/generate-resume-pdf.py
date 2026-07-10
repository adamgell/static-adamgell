#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from html import escape
from pathlib import Path

try:
    from pypdf import PdfReader, PdfWriter
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from reportlab.lib.pagesizes import LETTER
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.pdfgen import canvas
    from reportlab.platypus import (
        CondPageBreak,
        HRFlowable,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
    )
except ModuleNotFoundError as exc:
    raise SystemExit(
        "ReportLab and PyPDF are required. Use the Codex bundled workspace Python."
    ) from exc


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DATA = ROOT / "src" / "data" / "resume.json"
DEFAULT_OUTPUT = ROOT / "public" / "resume" / "adam-gell-resume.pdf"

NAVY = colors.HexColor("#162033")
ACCENT = colors.HexColor("#28506E")
MUTED = colors.HexColor("#526170")
RULE = colors.HexColor("#CBD5E1")


class ResumeCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.setTitle("Adam Gell Resume")
        self.setAuthor("")
        self.setSubject("")
        self.setKeywords("")
        self.setCreator("")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate the public Adam Gell resume PDF."
    )
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    return parser.parse_args()


def build_styles() -> dict[str, ParagraphStyle]:
    return {
        "name": ParagraphStyle(
            "Name",
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=24,
            textColor=NAVY,
            spaceAfter=2,
        ),
        "positioning": ParagraphStyle(
            "Positioning",
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=10,
            textColor=ACCENT,
            spaceAfter=5,
        ),
        "contact": ParagraphStyle(
            "Contact",
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=MUTED,
            spaceAfter=5,
        ),
        "section": ParagraphStyle(
            "Section",
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=ACCENT,
            spaceBefore=7,
            spaceAfter=3,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "Body",
            fontName="Helvetica",
            fontSize=9,
            leading=11.5,
            textColor=NAVY,
            spaceAfter=3,
        ),
        "role": ParagraphStyle(
            "Role",
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=12,
            textColor=NAVY,
            spaceBefore=3,
            spaceAfter=1,
            keepWithNext=True,
        ),
        "role_meta": ParagraphStyle(
            "RoleMeta",
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=MUTED,
            spaceAfter=2,
            keepWithNext=True,
        ),
        "bullet": ParagraphStyle(
            "Bullet",
            fontName="Helvetica",
            fontSize=8.6,
            leading=11,
            textColor=NAVY,
            leftIndent=11,
            firstLineIndent=-8,
            spaceAfter=1,
        ),
        "footer": ParagraphStyle(
            "Footer",
            fontName="Helvetica",
            fontSize=7,
            leading=8,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
        "left": ParagraphStyle(
            "Left",
            fontName="Helvetica",
            fontSize=8.6,
            leading=11,
            textColor=NAVY,
            alignment=TA_LEFT,
            spaceAfter=2,
        ),
    }


def link(url: str, label: str) -> str:
    return (
        f'<link href="{escape(url)}" color="#28506E">'
        f"{escape(label)}</link>"
    )


def contact_markup(data: dict) -> str:
    contact = data["contact"]
    return " | ".join(
        (
            link(f'mailto:{contact["email"]}', contact["email"]),
            link(contact["github"]["url"], contact["github"]["label"]),
            link(contact["linkedin"]["url"], contact["linkedin"]["label"]),
        )
    )


def section(title: str, styles: dict[str, ParagraphStyle]) -> Paragraph:
    return Paragraph(escape(title.upper()), styles["section"])


def draw_page_number(pdf_canvas: canvas.Canvas, document: SimpleDocTemplate) -> None:
    pdf_canvas.saveState()
    pdf_canvas.setFont("Helvetica", 7)
    pdf_canvas.setFillColor(MUTED)
    pdf_canvas.drawRightString(
        LETTER[0] - document.rightMargin,
        0.32 * inch,
        str(document.page),
    )
    pdf_canvas.restoreState()


def build_story(data: dict, styles: dict[str, ParagraphStyle]) -> list:
    story = [
        Paragraph(escape(data["name"]), styles["name"]),
        Paragraph(escape(data["positioning"]), styles["positioning"]),
        Paragraph(contact_markup(data), styles["contact"]),
        HRFlowable(
            width="100%",
            thickness=1.2,
            color=ACCENT,
            spaceBefore=2,
            spaceAfter=3,
        ),
        section("Professional summary", styles),
        Paragraph(escape(data["summary"]), styles["body"]),
        section("Consulting impact", styles),
    ]

    for pillar in data["impactPillars"]:
        story.append(
            Paragraph(
                f'<b>{escape(pillar["title"])}</b> - '
                f'{escape(pillar["description"])}',
                styles["left"],
            )
        )

    story.append(section("Core expertise", styles))
    for group in data["expertise"]:
        items = ", ".join(escape(item) for item in group["items"])
        story.append(
            Paragraph(
                f'<b>{escape(group["title"])}</b>: {items}',
                styles["left"],
            )
        )

    story.append(section("Professional experience", styles))
    for role in data["experience"]:
        story.append(CondPageBreak(0.8 * inch))
        story.append(
            Paragraph(
                f'{escape(role["title"])} | {escape(role["company"])}',
                styles["role"],
            )
        )
        story.append(
            Paragraph(
                f'{escape(role["location"])} | {escape(role["dateLabel"])}',
                styles["role_meta"],
            )
        )
        for achievement in role["achievements"]:
            story.append(
                Paragraph(f'- {escape(achievement)}', styles["bullet"])
            )

    story.append(section("Education", styles))
    for item in data["education"]:
        story.append(
            Paragraph(
                f'<b>{escape(item["degree"])}</b> | '
                f'{escape(item["institution"])} | {escape(item["year"])}',
                styles["left"],
            )
        )

    story.append(section("Selected credentials", styles))
    for credential in data["credentials"]:
        story.append(
            Paragraph(
                f'- {escape(credential["name"])} | '
                f'{escape(credential["year"])}',
                styles["bullet"],
            )
        )

    return story


def scrub_metadata(output_path: Path) -> None:
    reader = PdfReader(output_path)
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.add_metadata({"/Title": "Adam Gell Resume"})

    temporary_path = output_path.with_suffix(".tmp.pdf")
    with temporary_path.open("wb") as handle:
        writer.write(handle)
    temporary_path.replace(output_path)


def generate(data_path: Path, output_path: Path) -> None:
    data = json.loads(data_path.read_text(encoding="utf-8"))
    output_path.parent.mkdir(parents=True, exist_ok=True)
    styles = build_styles()
    document = SimpleDocTemplate(
        str(output_path),
        pagesize=LETTER,
        leftMargin=0.62 * inch,
        rightMargin=0.62 * inch,
        topMargin=0.42 * inch,
        bottomMargin=0.42 * inch,
        title="Adam Gell Resume",
        author="",
        allowSplitting=True,
    )
    document.build(
        build_story(data, styles),
        onFirstPage=draw_page_number,
        onLaterPages=draw_page_number,
        canvasmaker=ResumeCanvas,
    )
    scrub_metadata(output_path)


def main() -> None:
    args = parse_args()
    generate(args.data, args.output)
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
