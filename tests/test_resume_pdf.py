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
PUBLIC_PDF = ROOT / "public" / "resume" / "adam-gell-resume.pdf"

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
        self.assertGreater(self.output.stat().st_size, 0)
        self.assertGreaterEqual(len(self.reader.pages), 1)
        self.assertLessEqual(len(self.reader.pages), 2)

    def test_pdf_does_not_create_a_sparse_trailing_page(self) -> None:
        if len(self.reader.pages) == 1:
            return

        page_word_counts = [
            len((page.extract_text() or "").split())
            for page in self.reader.pages
        ]
        trailing_page_share = page_word_counts[-1] / sum(page_word_counts)
        self.assertGreaterEqual(
            trailing_page_share,
            0.25,
            f"trailing page contains only {trailing_page_share:.1%} of the PDF text",
        )

    def test_public_pdf_matches_fresh_deterministic_generation(self) -> None:
        self.assertTrue(PUBLIC_PDF.is_file())
        self.assertEqual(PUBLIC_PDF.read_bytes(), self.output.read_bytes())

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
