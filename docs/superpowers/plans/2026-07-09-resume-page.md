# Resume Page and Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a native `/resume` page and a synchronized, privacy-safe PDF download that position Adam for senior Microsoft Intune consulting and consulting-leadership roles.

**Architecture:** `src/data/resume.json` is the only editable source of resume copy. Astro renders that data as semantic HTML, while a local Python generator reads the same JSON and writes a committed static PDF; focused Node and Python tests enforce content, routing, privacy, metadata, and page-count requirements.

**Tech Stack:** Astro 5, Tailwind CSS 4, JSON, Node.js built-in test runner, Python 3, ReportLab, PyPDF, Poppler, in-app browser verification

## Global Constraints

- Publish the native page at `/resume` and the download at `/resume/adam-gell-resume.pdf`.
- Treat `Resume_2024_v5.docx` only as factual source evidence; never copy either supplied source file into the repository.
- Publish only `me@adamgell.com`, `https://github.com/adamgell`, and `https://linkedin.com/in/adamgell` as contact details.
- Do not publish a phone number, residential address, credential identifier, original source filename, OneDrive path, or personal author/editor metadata.
- Do not invent customer names, project details, percentages, team sizes, savings, revenue, or unsupported metrics.
- Use current product names where historical meaning is unchanged: Microsoft Intune, Microsoft Entra ID, Windows Autopilot, Azure Virtual Desktop, and PowerShell.
- Keep the HTML page static and semantic with no client-side JavaScript and no embedded PDF viewer.
- Keep the PDF US Letter portrait, single-column, selectable, ATS-readable, and no longer than two pages.
- Preserve visible focus, logical headings, descriptive links, reduced-motion compatibility, and a usable layout at 320 CSS pixels.
- The generated PDF is never edited manually; change JSON, regenerate, and reverify.

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `src/data/resume.json` | Canonical public resume facts and copy |
| Create | `tests/resume-data.test.mjs` | Pin required content, role order, allowed contact fields, and privacy invariants |
| Create | `scripts/generate-resume-pdf.py` | Generate and metadata-scrub the PDF from canonical JSON |
| Create | `tests/test_resume_pdf.py` | Verify PDF page count, reading order, content, privacy, and metadata |
| Create | `public/resume/adam-gell-resume.pdf` | Stable downloadable artifact |
| Create | `src/pages/resume.astro` | Semantic, responsive native resume page |
| Create | `tests/resume-page.test.mjs` | Build and verify route, discovery links, semantics, privacy, and PDF publication |
| Modify | `src/layouts/BaseLayout.astro` | Add Resume to shared navigation and prevent narrow-screen page overflow |
| Modify | `src/pages/index.astro` | Add the homepage Resume entry point |

---

### Task 1: Canonical Resume Data and Privacy Contract

**Files:**
- Create: `tests/resume-data.test.mjs`
- Create: `src/data/resume.json`

**Interfaces:**
- Consumes: approved facts and narrative from `docs/superpowers/specs/2026-07-09-resume-page-design.md`
- Produces: a JSON object with `name`, `positioning`, `roleLabel`, `headline`, `summary`, `pdfFileName`, `contact`, `lifecycle`, `impactPillars`, `expertise`, `experience`, `education`, and `credentials`

- [ ] **Step 1: Write the failing canonical-data test**

Create `tests/resume-data.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const resumeUrl = new URL("../src/data/resume.json", import.meta.url);
const resume = JSON.parse(await readFile(resumeUrl, "utf8"));
const serialized = JSON.stringify(resume);

const forbiddenPatterns = [
  {
    label: "phone number",
    pattern:
      /\b(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]\d{3}[ .-]\d{4}\b/,
  },
  {
    label: "street address",
    pattern:
      /\b\d{1,5}\s+[A-Za-z][A-Za-z .'-]+\s(?:Avenue|Ave|Street|St|Road|Rd|Lane|Ln|Drive|Dr)\b/i,
  },
  { label: "credential identifier", pattern: /\bF\d{3}-\d{4}\b/i },
  {
    label: "local path or source filename",
    pattern: /OneDrive-Personal|Resume_202[24]_v\d|\/Users\//i,
  },
];

test("contains the approved positioning and current role", () => {
  assert.equal(resume.name, "Adam Gell");
  assert.equal(
    resume.headline,
    "Microsoft endpoint strategy, from assessment to adoption.",
  );
  assert.equal(resume.pdfFileName, "adam-gell-resume.pdf");
  assert.deepEqual(
    resume.experience.map(({ company, title, dateLabel }) => ({
      company,
      title,
      dateLabel,
    })),
    [
      {
        company: "CDW",
        title: "Managing Consultant Engineer",
        dateLabel: "June 2022 - Present",
      },
      {
        company: "Applied Microsystems",
        title: "Senior Systems Engineer",
        dateLabel: "January 2022 - April 2022",
      },
      {
        company: "NextStep Technology Advisors",
        title: "IT Consultant",
        dateLabel: "October 2013 - December 2021",
      },
    ],
  );
});

test("publishes only approved contact channels", () => {
  assert.deepEqual(Object.keys(resume.contact).sort(), [
    "email",
    "github",
    "linkedin",
  ]);
  assert.equal(resume.contact.email, "me@adamgell.com");
  assert.equal(resume.contact.github.url, "https://github.com/adamgell");
  assert.equal(
    resume.contact.linkedin.url,
    "https://linkedin.com/in/adamgell",
  );
});

test("pins supported consulting scale and content groups", () => {
  assert.equal(resume.lifecycle.length, 4);
  assert.equal(resume.impactPillars.length, 3);
  assert.equal(resume.expertise.length, 3);
  assert.match(serialized, /40\+ client environments/);
  assert.match(serialized, /four Microsoft Azure migrations/);
  assert.match(serialized, /more than 15 transitions/);
});

test("contains no private or source-only identifiers", () => {
  for (const { label, pattern } of forbiddenPatterns) {
    assert.doesNotMatch(serialized, pattern, `unexpected ${label}`);
  }
});
```

- [ ] **Step 2: Run the data test and verify it fails**

Run:

```bash
node --test tests/resume-data.test.mjs
```

Expected: FAIL with `ENOENT` for `src/data/resume.json`.

- [ ] **Step 3: Add the canonical resume data**

Create `src/data/resume.json`:

```json
{
  "name": "Adam Gell",
  "positioning": "Senior Microsoft Intune Consultant | Consulting Leader",
  "roleLabel": "Managing Consultant Engineer | Microsoft Intune",
  "headline": "Microsoft endpoint strategy, from assessment to adoption.",
  "summary": "Senior Microsoft Intune consultant with 15 years of experience translating complex endpoint requirements into secure, supportable programs. Combines hands-on engineering across Microsoft Intune, Windows Autopilot, Microsoft Entra ID, Windows 365, and PowerShell with client advisory, pre-sales discovery, and delivery leadership.",
  "pdfFileName": "adam-gell-resume.pdf",
  "contact": {
    "email": "me@adamgell.com",
    "github": {
      "label": "github.com/adamgell",
      "url": "https://github.com/adamgell"
    },
    "linkedin": {
      "label": "linkedin.com/in/adamgell",
      "url": "https://linkedin.com/in/adamgell"
    }
  },
  "lifecycle": [
    {
      "name": "Assess",
      "description": "Current state and priorities"
    },
    {
      "name": "Design",
      "description": "Architecture and roadmap"
    },
    {
      "name": "Deliver",
      "description": "Configuration and automation"
    },
    {
      "name": "Adopt",
      "description": "Enablement and outcomes"
    }
  ],
  "impactPillars": [
    {
      "title": "Cross-platform delivery",
      "description": "Designs and implements endpoint solutions across Windows, iOS/iPadOS, Android, macOS, Linux, and Windows 365."
    },
    {
      "title": "Trusted client advisor",
      "description": "Leads assessments, turns findings into practical recommendations, and aligns technical decisions with customer priorities."
    },
    {
      "title": "Practice contribution",
      "description": "Supports pre-sales engagements and creates reusable PowerShell automation to improve delivery."
    }
  ],
  "expertise": [
    {
      "title": "Endpoint strategy",
      "items": [
        "Assessments",
        "Target-state design",
        "Implementation roadmaps",
        "Client recommendations"
      ]
    },
    {
      "title": "Intune engineering",
      "items": [
        "Microsoft Intune",
        "Windows Autopilot",
        "Microsoft Entra ID",
        "Windows 365",
        "Endpoint Privilege Management",
        "Endpoint Analytics",
        "Remote Help"
      ]
    },
    {
      "title": "Consulting leadership",
      "items": [
        "Discovery and pre-sales",
        "Stakeholder alignment",
        "Endpoint security",
        "PowerShell automation",
        "Change management",
        "Technical guidance"
      ]
    }
  ],
  "experience": [
    {
      "id": "cdw",
      "company": "CDW",
      "location": "Remote",
      "title": "Managing Consultant Engineer",
      "start": "2022-06",
      "end": null,
      "dateLabel": "June 2022 - Present",
      "achievements": [
        "Leads comprehensive Microsoft Intune assessments, translating current-state findings into target-state recommendations and practical implementation roadmaps.",
        "Designs and implements Microsoft Intune and Microsoft Entra ID solutions, including Windows Autopilot for Microsoft Entra joined and hybrid Microsoft Entra joined devices.",
        "Delivers cross-platform endpoint management for Windows, iOS/iPadOS, Android, macOS, Linux, and Windows 365 environments.",
        "Deploys Intune Suite capabilities including Endpoint Privilege Management, Endpoint Analytics, and Remote Help.",
        "Shapes solutions during pre-sales engagements and develops PowerShell automation to improve recurring device-management work."
      ]
    },
    {
      "id": "applied-microsystems",
      "company": "Applied Microsystems",
      "location": "Remote | Anchorage, Alaska",
      "title": "Senior Systems Engineer",
      "start": "2022-01",
      "end": "2022-04",
      "dateLabel": "January 2022 - April 2022",
      "achievements": [
        "Led a Qualys Vulnerability Management, Detection and Response program and strengthened patch-cycle auditing, reporting, and reboot enforcement across the MSP client base.",
        "Served as the primary escalation point for infrastructure security investigations and remediation across customer environments.",
        "Reviewed Mimecast policies and introduced CIPP-based tenant audits to surface Microsoft 365 security and baseline gaps.",
        "Improved authentication processes and documentation practices to strengthen change management and operational consistency."
      ]
    },
    {
      "id": "nextstep",
      "company": "NextStep Technology Advisors",
      "location": "Lancaster, Pennsylvania",
      "title": "IT Consultant",
      "start": "2013-10",
      "end": "2021-12",
      "dateLabel": "October 2013 - December 2021",
      "achievements": [
        "Delivered consulting and technical support across 40+ client environments, advising leaders on goals, budgets, business processes, and technology transitions.",
        "Led four Microsoft Azure migrations and more than 15 transitions from on-premises systems to modern management with Microsoft 365, Microsoft Intune, and Azure.",
        "Designed solutions around SLAs, security, uptime, patch management, preventive maintenance, backup and disaster recovery, and remote monitoring.",
        "Applied Microsoft security capabilities, including Microsoft Defender for Endpoint, and established metrics to identify vulnerabilities and improve security practices.",
        "Implemented Citrix and Microsoft virtual desktop solutions, including Azure Virtual Desktop and Windows 365."
      ]
    }
  ],
  "education": [
    {
      "degree": "AAS, Information Systems Administration",
      "institution": "ITT Technical School Online",
      "year": "2011"
    }
  ],
  "credentials": [
    {
      "name": "Microsoft 365 Identity and Services (MS-100)",
      "year": "2021"
    },
    {
      "name": "Microsoft Certified Professional",
      "year": "2014"
    },
    {
      "name": "Datto Certified Advanced Technician",
      "year": "2014"
    }
  ]
}
```

- [ ] **Step 4: Run the data test and verify it passes**

Run:

```bash
node --test tests/resume-data.test.mjs
```

Expected: 4 tests pass and 0 fail.

- [ ] **Step 5: Commit the canonical data contract**

```bash
git add src/data/resume.json tests/resume-data.test.mjs
git commit -m "feat: add privacy-safe resume data"
```

---

### Task 2: ATS-Friendly PDF Generator and Artifact

**Files:**
- Create: `tests/test_resume_pdf.py`
- Create: `scripts/generate-resume-pdf.py`
- Create: `public/resume/adam-gell-resume.pdf`

**Interfaces:**
- Consumes: `src/data/resume.json`
- Produces: `generate(data_path: Path, output_path: Path) -> None` and the static PDF at `public/resume/adam-gell-resume.pdf`

- [ ] **Step 1: Write the failing PDF-generation test**

Create `tests/test_resume_pdf.py`:

```python
from __future__ import annotations

import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from pypdf import PdfReader


ROOT = Path(__file__).resolve().parents[1]
GENERATOR = ROOT / "scripts" / "generate-resume-pdf.py"
DATA = ROOT / "src" / "data" / "resume.json"

FORBIDDEN_PATTERNS = (
    re.compile(
        r"\b(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]\d{3}[ .-]\d{4}\b"
    ),
    re.compile(
        r"\b\d{1,5}\s+[A-Za-z][A-Za-z .'-]+\s"
        r"(?:Avenue|Ave|Street|St|Road|Rd|Lane|Ln|Drive|Dr)\b",
        re.IGNORECASE,
    ),
    re.compile(r"\bF\d{3}-\d{4}\b", re.IGNORECASE),
    re.compile(r"OneDrive-Personal|Resume_202[24]_v\d|/Users/", re.IGNORECASE),
)


class ResumePdfTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.output = Path(cls.temp_dir.name) / "adam-gell-resume.pdf"
        subprocess.run(
            [
                sys.executable,
                str(GENERATOR),
                "--data",
                str(DATA),
                "--output",
                str(cls.output),
            ],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        cls.reader = PdfReader(cls.output)
        cls.text = "\n".join(
            page.extract_text() or "" for page in cls.reader.pages
        )

    @classmethod
    def tearDownClass(cls) -> None:
        cls.temp_dir.cleanup()

    def test_pdf_is_readable_and_no_longer_than_two_pages(self) -> None:
        self.assertGreater(self.output.stat().st_size, 5_000)
        self.assertGreaterEqual(len(self.reader.pages), 1)
        self.assertLessEqual(len(self.reader.pages), 2)

    def test_pdf_has_expected_ats_reading_order(self) -> None:
        sections = (
            "PROFESSIONAL SUMMARY",
            "CONSULTING IMPACT",
            "CORE EXPERTISE",
            "PROFESSIONAL EXPERIENCE",
            "EDUCATION",
            "SELECTED CREDENTIALS",
        )
        positions = [self.text.index(section) for section in sections]
        self.assertEqual(positions, sorted(positions))
        self.assertIn("Managing Consultant Engineer", self.text)
        self.assertIn("40+ client environments", self.text)
        self.assertIn("me@adamgell.com", self.text)
        self.assertIn("github.com/adamgell", self.text)
        self.assertIn("linkedin.com/in/adamgell", self.text)

    def test_pdf_text_contains_no_private_identifiers(self) -> None:
        for pattern in FORBIDDEN_PATTERNS:
            self.assertIsNone(pattern.search(self.text), pattern.pattern)

    def test_pdf_metadata_is_scrubbed(self) -> None:
        metadata = self.reader.metadata or {}
        self.assertEqual(metadata.get("/Title"), "Adam Gell Resume")
        self.assertFalse((metadata.get("/Author") or "").strip())
        metadata_text = " ".join(str(value) for value in metadata.values())
        for pattern in FORBIDDEN_PATTERNS:
            self.assertIsNone(pattern.search(metadata_text), pattern.pattern)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run the PDF test and verify it fails**

Run with the bundled workspace Python:

```bash
export CODEX_PYTHON="/Users/Adam.Gell/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
"$CODEX_PYTHON" -m unittest tests/test_resume_pdf.py -v
```

Expected: ERROR because `scripts/generate-resume-pdf.py` does not exist.

- [ ] **Step 3: Implement the PDF generator**

Create `scripts/generate-resume-pdf.py`:

```python
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
            spaceBefore=9,
            spaceAfter=4,
            keepWithNext=True,
        ),
        "body": ParagraphStyle(
            "Body",
            fontName="Helvetica",
            fontSize=9,
            leading=11.5,
            textColor=NAVY,
            spaceAfter=4,
        ),
        "role": ParagraphStyle(
            "Role",
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=12,
            textColor=NAVY,
            spaceBefore=4,
            spaceAfter=1,
            keepWithNext=True,
        ),
        "role_meta": ParagraphStyle(
            "RoleMeta",
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=MUTED,
            spaceAfter=3,
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
            spaceAfter=2,
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
            spaceAfter=3,
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
                f'<b>{escape(group["title"])}:</b> {items}',
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
        topMargin=0.52 * inch,
        bottomMargin=0.52 * inch,
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
```

- [ ] **Step 4: Run the PDF test and verify it passes**

Run:

```bash
"$CODEX_PYTHON" -m unittest tests/test_resume_pdf.py -v
```

Expected: 4 tests pass and 0 fail. If the generated document exceeds two pages, adjust only the explicit typography and spacing tokens in `build_styles()` until it satisfies the two-page contract; do not remove approved content.

- [ ] **Step 5: Generate the stable public PDF**

Run:

```bash
"$CODEX_PYTHON" scripts/generate-resume-pdf.py
```

Expected: `Wrote .../public/resume/adam-gell-resume.pdf`; the file is non-empty.

- [ ] **Step 6: Commit the generator, tests, and generated artifact**

```bash
git add scripts/generate-resume-pdf.py tests/test_resume_pdf.py public/resume/adam-gell-resume.pdf
git commit -m "feat: generate ATS-friendly resume PDF"
```

---

### Task 3: Native Resume Page, Navigation, and Homepage Discovery

**Files:**
- Create: `tests/resume-page.test.mjs`
- Create: `src/pages/resume.astro`
- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: the canonical JSON shape from Task 1 and `public/resume/adam-gell-resume.pdf` from Task 2
- Produces: the static `/resume` route plus shared-navigation and homepage links to it

- [ ] **Step 1: Write the failing built-page test**

Create `tests/resume-page.test.mjs`:

```javascript
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { before, test } from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
let resumePage;
let homePage;
let publishedPdf;

before(() => {
  execFileSync("npm", ["run", "build"], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
  resumePage = readFileSync(
    path.join(root, "dist", "resume", "index.html"),
    "utf8",
  );
  homePage = readFileSync(path.join(root, "dist", "index.html"), "utf8");
  publishedPdf = path.join(
    root,
    "dist",
    "resume",
    "adam-gell-resume.pdf",
  );
});

test("renders one semantic resume heading and the approved sections", () => {
  assert.equal((resumePage.match(/<h1\b/gi) ?? []).length, 1);
  assert.match(
    resumePage,
    /Microsoft endpoint strategy, from assessment to adoption\./,
  );
  for (const heading of [
    "Core expertise",
    "Experience",
    "Education &amp; credentials",
    "Contact",
  ]) {
    assert.match(resumePage, new RegExp(heading, "i"));
  }
});

test("publishes descriptive contact and PDF actions without an embed", () => {
  assert.match(resumePage, /href="\/resume\/adam-gell-resume\.pdf"/);
  assert.match(resumePage, /Download resume \(PDF\)/);
  assert.match(resumePage, /mailto:(?:me@adamgell\.com|me%40adamgell\.com)/);
  assert.match(resumePage, /https:\/\/github\.com\/adamgell/);
  assert.match(resumePage, /https:\/\/linkedin\.com\/in\/adamgell/);
  assert.doesNotMatch(resumePage, /<(?:iframe|object)\b/i);
});

test("links to the resume from shared navigation and the homepage", () => {
  assert.match(resumePage, /href="\/resume"[^>]*>\s*Resume\s*</i);
  assert.match(homePage, /href="\/resume"/i);
  assert.match(homePage, />\s*Resume\s*</i);
});

test("copies the non-empty PDF into the built stable URL", () => {
  assert.ok(statSync(publishedPdf).size > 5_000);
});

test("publishes no private identifiers in the resume HTML", () => {
  const forbiddenPatterns = [
    /\b(?:\+?1[ .-]?)?(?:\(\d{3}\)|\d{3})[ .-]\d{3}[ .-]\d{4}\b/,
    /\b\d{1,5}\s+[A-Za-z][A-Za-z .'-]+\s(?:Avenue|Ave|Street|St|Road|Rd|Lane|Ln|Drive|Dr)\b/i,
    /\bF\d{3}-\d{4}\b/i,
    /OneDrive-Personal|Resume_202[24]_v\d|\/Users\//i,
  ];
  for (const pattern of forbiddenPatterns) {
    assert.doesNotMatch(resumePage, pattern, pattern.source);
  }
});
```

- [ ] **Step 2: Run the built-page test and verify it fails**

Run:

```bash
node --test tests/resume-page.test.mjs
```

Expected: FAIL because `dist/resume/index.html` does not exist.

- [ ] **Step 3: Implement the semantic resume page**

Create `src/pages/resume.astro`:

```astro
---
import BaseLayout from "../layouts/BaseLayout.astro";
import resume from "../data/resume.json";

const pdfHref = `/resume/${resume.pdfFileName}`;
const mailtoHref = `mailto:${resume.contact.email}`;
---

<BaseLayout
  title="Resume — Adam Gell"
  description="Adam Gell is a senior Microsoft Intune consultant and consulting leader focused on endpoint strategy, delivery, and adoption."
  keywords={[
    "Adam Gell",
    "Microsoft Intune consultant",
    "endpoint management",
    "Windows Autopilot",
    "Microsoft Entra ID",
    "Windows 365",
  ]}
>
  <article class="max-w-5xl mx-auto px-6 py-12 sm:py-16">
    <header class="grid gap-10 lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-16">
      <div>
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
          {resume.roleLabel}
        </p>
        <h1 class="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
          {resume.headline}
        </h1>
        <p class="mt-6 max-w-2xl text-lg leading-8 text-slate-400">
          {resume.summary}
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a
            href={pdfHref}
            download={resume.pdfFileName}
            class="inline-flex items-center rounded-md bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
          >
            Download resume (PDF)
          </a>
          <a
            href={mailtoHref}
            class="inline-flex items-center rounded-md border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300"
          >
            Email Adam
          </a>
        </div>
      </div>

      <ol
        aria-label="Consulting lifecycle"
        class="relative space-y-6 border-l border-slate-700 pl-6"
      >
        {resume.lifecycle.map((stage) => (
          <li class="relative">
            <span
              aria-hidden="true"
              class="absolute -left-[1.78rem] top-1 h-2.5 w-2.5 rounded-full bg-sky-400 ring-4 ring-sky-400/10"
            ></span>
            <h2 class="text-sm font-semibold text-slate-100">{stage.name}</h2>
            <p class="mt-1 text-sm leading-6 text-slate-500">
              {stage.description}
            </p>
          </li>
        ))}
      </ol>
    </header>

    <section aria-labelledby="impact-heading" class="mt-14 border-y border-slate-800">
      <h2 id="impact-heading" class="sr-only">Consulting impact</h2>
      <div class="grid divide-y divide-slate-800 md:grid-cols-3 md:divide-x md:divide-y-0">
        {resume.impactPillars.map((pillar) => (
          <div class="py-6 md:px-6 md:first:pl-0 md:last:pr-0">
            <h3 class="font-semibold text-slate-100">{pillar.title}</h3>
            <p class="mt-2 text-sm leading-6 text-slate-500">
              {pillar.description}
            </p>
          </div>
        ))}
      </div>
    </section>

    <section aria-labelledby="expertise-heading" class="mt-16">
      <h2 id="expertise-heading" class="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
        Core expertise
      </h2>
      <div class="mt-6 grid gap-5 md:grid-cols-3">
        {resume.expertise.map((group) => (
          <article class="rounded-lg border border-slate-800 bg-slate-900/30 p-5">
            <h3 class="font-semibold text-white">{group.title}</h3>
            <ul class="mt-3 space-y-1.5 text-sm leading-6 text-slate-400">
              {group.items.map((item) => <li>{item}</li>)}
            </ul>
          </article>
        ))}
      </div>
    </section>

    <section aria-labelledby="experience-heading" class="mt-20 grid gap-8 md:grid-cols-[10rem_minmax(0,1fr)]">
      <h2 id="experience-heading" class="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
        Experience
      </h2>
      <div class="space-y-10">
        {resume.experience.map((role) => (
          <article
            aria-labelledby={`role-${role.id}`}
            class="border-b border-slate-800 pb-10 last:border-0 last:pb-0"
          >
            <p class="text-sm text-slate-500">{role.dateLabel}</p>
            <h3 id={`role-${role.id}`} class="mt-1 text-xl font-semibold text-white">
              {role.title}
            </h3>
            <p class="mt-1 text-sm font-medium text-sky-300">
              {role.company} · {role.location}
            </p>
            <ul class="mt-5 space-y-3 text-sm leading-7 text-slate-400">
              {role.achievements.map((achievement) => (
                <li class="relative pl-5 before:absolute before:left-0 before:text-slate-600 before:content-['—']">
                  {achievement}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>

    <section aria-labelledby="education-heading" class="mt-20 grid gap-8 md:grid-cols-[10rem_minmax(0,1fr)]">
      <h2 id="education-heading" class="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
        Education &amp; credentials
      </h2>
      <div class="grid gap-8 sm:grid-cols-2">
        <div>
          <h3 class="font-semibold text-white">Education</h3>
          {resume.education.map((item) => (
            <p class="mt-3 text-sm leading-6 text-slate-400">
              <span class="text-slate-200">{item.degree}</span><br />
              {item.institution} · {item.year}
            </p>
          ))}
        </div>
        <div>
          <h3 class="font-semibold text-white">Selected credentials</h3>
          <ul class="mt-3 space-y-2 text-sm leading-6 text-slate-400">
            {resume.credentials.map((credential) => (
              <li>{credential.name} · {credential.year}</li>
            ))}
          </ul>
        </div>
      </div>
    </section>

    <section aria-labelledby="contact-heading" class="mt-20 rounded-lg border border-slate-800 p-6 sm:p-8">
      <h2 id="contact-heading" class="text-xl font-semibold text-white">Contact</h2>
      <p class="mt-2 text-sm leading-6 text-slate-400">
        Connect by email or view more of Adam's work and professional history.
      </p>
      <div class="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm">
        <a class="text-sky-300 hover:text-sky-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300" href={mailtoHref}>
          {resume.contact.email}
        </a>
        <a class="text-sky-300 hover:text-sky-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300" href={resume.contact.github.url} target="_blank" rel="noopener noreferrer">
          GitHub profile
        </a>
        <a class="text-sky-300 hover:text-sky-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300" href={resume.contact.linkedin.url} target="_blank" rel="noopener noreferrer">
          LinkedIn profile
        </a>
      </div>
    </section>
  </article>
</BaseLayout>
```

- [ ] **Step 4: Add shared navigation and homepage discovery**

Apply this focused diff to `src/layouts/BaseLayout.astro`:

```diff
-    <nav
+    <nav
+      aria-label="Primary navigation"
       class="sticky top-0 z-50 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md"
     >
       <div
-        class="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between"
+        class="max-w-5xl mx-auto px-3 sm:px-6 py-3 sm:py-4"
       >
-        <div class="flex items-center gap-1 text-sm">
+        <div class="flex flex-wrap items-center gap-1 text-sm">
@@
           <a
             href="/blog"
             class="px-3 py-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
             >Blog</a
           >
+          <a
+            href="/resume"
+            class="px-3 py-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
+            >Resume</a
+          >
```

In `src/pages/index.astro`, change the card-grid classes and add the Resume card immediately after Blog:

```diff
-    <div class="grid gap-6 sm:grid-cols-2 max-w-2xl">
+    <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl">
@@
       <a
         href="/blog"
         class="group block border border-slate-800 rounded-lg p-6 hover:border-slate-600 transition-colors"
       >
         <h2 class="text-lg font-semibold mb-2 group-hover:text-white transition-colors">
           Blog
         </h2>
         <p class="text-sm text-slate-400">
           Posts on Intune, Autopilot, and modern device management.
         </p>
       </a>
+
+      <a
+        href="/resume"
+        class="group block border border-slate-800 rounded-lg p-6 hover:border-slate-600 transition-colors"
+      >
+        <h2 class="text-lg font-semibold mb-2 group-hover:text-white transition-colors">
+          Resume
+        </h2>
+        <p class="text-sm text-slate-400">
+          Microsoft Intune consulting, endpoint strategy, and technical leadership experience.
+        </p>
+      </a>
```

- [ ] **Step 5: Run the web test and verify it passes**

Run:

```bash
node --test tests/resume-page.test.mjs
```

Expected: 5 tests pass and 0 fail; `npm run build` succeeds inside the test setup.

- [ ] **Step 6: Run all focused automated checks**

Run:

```bash
node --test tests/resume-data.test.mjs tests/resume-page.test.mjs
"$CODEX_PYTHON" -m unittest tests/test_resume_pdf.py -v
```

Expected: 13 tests pass and 0 fail across the Node and Python commands.

- [ ] **Step 7: Commit the native page and discovery links**

```bash
git add src/pages/resume.astro src/layouts/BaseLayout.astro src/pages/index.astro tests/resume-page.test.mjs
git commit -m "feat: add native resume page"
```

---

### Task 4: Integrated Privacy, Browser, and PDF Verification

**Files:**
- Verify: `src/data/resume.json`
- Verify: `src/pages/resume.astro`
- Verify: `src/layouts/BaseLayout.astro`
- Verify: `src/pages/index.astro`
- Verify: `public/resume/adam-gell-resume.pdf`
- Verify: `dist/resume/index.html`

**Interfaces:**
- Consumes: all artifacts produced by Tasks 1-3
- Produces: evidence that the production build, responsive page, keyboard flow, links, privacy contract, PDF layout, text order, and metadata meet the acceptance criteria

- [ ] **Step 1: Regenerate the production PDF and run the complete automated suite**

Run:

```bash
export CODEX_PYTHON="/Users/Adam.Gell/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
"$CODEX_PYTHON" scripts/generate-resume-pdf.py
node --test tests/resume-data.test.mjs tests/resume-page.test.mjs
"$CODEX_PYTHON" -m unittest tests/test_resume_pdf.py -v
npm run build
```

Expected: 13 focused tests pass, 0 fail, and Astro completes a production build containing `/resume/index.html` and `/resume/adam-gell-resume.pdf`.

- [ ] **Step 2: Start the production preview and verify the route responds**

Run in a persistent terminal session:

```bash
npm run preview -- --host 127.0.0.1
```

Expected: Astro prints a local preview URL, normally `http://127.0.0.1:4321/`.

Open `http://127.0.0.1:4321/resume` with the `browser:control-in-app-browser` skill. Expected: the page loads without console errors and the PDF request returns HTTP 200 with a non-zero body.

- [ ] **Step 3: Inspect the page at desktop and mobile widths**

At 1440 by 900 CSS pixels, verify:

- The hero, lifecycle, impact pillars, expertise, experience, education, credentials, and contact hierarchy match the approved consultant-plus-practice-lead direction.
- Sky blue is reserved for labels, links, and the lifecycle markers.
- The main actions are visible without obscuring content.
- No text overlaps, clips, or produces horizontal page overflow.

At 320 by 800 CSS pixels, verify:

- Shared navigation wraps without horizontal page overflow.
- The hero remains readable and actions wrap onto separate lines when needed.
- The lifecycle stays in logical order.
- Three-column sections collapse to a single column.
- Experience dates, titles, employers, and bullets remain legible.

Expected: both viewports pass. Capture screenshots for internal QA only; do not commit them.

- [ ] **Step 4: Verify keyboard and accessible structure**

From the browser address bar, press Tab through the page. Expected order:

1. Shared navigation links, including Resume.
2. Download resume (PDF).
3. Email Adam.
4. Contact email, GitHub profile, and LinkedIn profile.

Verify every focused control has a visible outline, the page has one `h1`, section headings follow logically, and the lifecycle and achievement lists are announced as lists. Confirm no essential motion occurs when reduced motion is enabled.

- [ ] **Step 5: Render and inspect every PDF page**

Run with bundled Poppler:

```bash
export CODEX_BIN="/Users/Adam.Gell/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin"
mkdir -p tmp/pdfs/resume
"$CODEX_BIN/pdfinfo" public/resume/adam-gell-resume.pdf
"$CODEX_BIN/pdftoppm" -png -r 144 public/resume/adam-gell-resume.pdf tmp/pdfs/resume/page
```

Expected: PDF information reports US Letter pages and a page count no greater than 2. One PNG is produced for each page.

Open every generated PNG at 100 percent zoom. Verify:

- No clipped, overlapping, or missing text.
- No broken bullets or glyph substitutions.
- Role headings stay with the following metadata and first achievement.
- Page breaks do not leave an orphaned heading or a large unexplained gap.
- Type remains comfortably readable and the design stays single-column.

If any visual defect appears, adjust only the explicit generator styles, regenerate the PDF, and rerun the Python tests before inspecting every page again.

- [ ] **Step 6: Run the final privacy and source-artifact audit**

Run:

```bash
rg --pcre2 -n '(?:\+?1[ .-]?)?(?:\([0-9]{3}\)|[0-9]{3})[ .-][0-9]{3}[ .-][0-9]{4}|F[0-9]{3}-[0-9]{4}|OneDrive-Personal|Resume_202[24]_v[0-9]|/Users/' src/data/resume.json dist/resume/index.html
git ls-files | rg 'Resume_202[24]|\.docx$' || true
"$CODEX_PYTHON" -m unittest tests/test_resume_pdf.py -v
```

Expected: the first two searches return no matches; all four PDF tests pass.

- [ ] **Step 7: Run final repository checks**

Run:

```bash
npm run build
git diff --check
git status --short
```

Expected: the build passes, `git diff --check` reports no whitespace errors, and the worktree contains no unintended files. If visual QA required fixes, commit only those focused files:

```bash
git add src/data/resume.json src/pages/resume.astro src/layouts/BaseLayout.astro src/pages/index.astro scripts/generate-resume-pdf.py public/resume/adam-gell-resume.pdf tests/resume-data.test.mjs tests/resume-page.test.mjs tests/test_resume_pdf.py
git commit -m "fix: polish resume publication"
```

Skip the final fix commit when there are no post-review changes.

---

## Execution Notes

- Create an isolated worktree at execution time with `superpowers:using-git-worktrees` unless the environment is already an isolated worktree.
- Execute Tasks 1-4 in order because the JSON shape is the shared interface used by both rendering paths.
- Use the `documents` and `pdf` skills for the generation/render gates and `browser:control-in-app-browser` for live responsive verification.
- Keep internal PNGs and temporary browser screenshots under `tmp/`; never stage them.
- After all verification passes, use `superpowers:requesting-code-review`, then `superpowers:verification-before-completion`, and finally `superpowers:finishing-a-development-branch` for integration choices.
