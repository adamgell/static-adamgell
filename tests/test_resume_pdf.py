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
    re.compile(
        r"""\bResume_[^"'<>/\\]+\.(?:docx?|pdf)\b|"""
        r"""(?:^|[\s"'(<])(?:"""
        r"""/(?:Users|home|Volumes)/[^/"'<>\\\s]+|"""
        r"""~[\\/][^/"'<>\\\s]+|"""
        r"""[A-Za-z]:[\\/][^/"'<>\\\s]+|"""
        r"""\\\\[^\\\s"'<>]+\\[^\\\s"'<>]+)""",
        re.IGNORECASE,
    ),
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
            "TECHNICAL DEPTH",
            "PROFESSIONAL EXPERIENCE",
            "SELECTED WORK",
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
        self.assertIn("$373K", self.text)
        self.assertIn("132% of annual plan", self.text)
        self.assertIn("Windows Autopilot device preparation", self.text)
        self.assertIn("WDS and PXE", self.text)
        self.assertIn("CMTrace Open", self.text)
        self.assertIn(
            "Microsoft 365 Certified: Endpoint Administrator Associate",
            self.text,
        )
        self.assertIn("Earned August 2025", self.text)
        self.assertNotRegex(self.text, r"\d+[★⭐]|GitHub stars?")

    def test_pdf_links_are_portable_outside_the_website(self) -> None:
        link_targets = []
        for page in self.reader.pages:
            for annotation_ref in page.get("/Annots", []):
                annotation = annotation_ref.get_object()
                action = annotation.get("/A")
                if action and action.get("/URI"):
                    link_targets.append(action["/URI"])

        self.assertCountEqual(
            link_targets,
            (
                "mailto:me@adamgell.com",
                "https://github.com/adamgell",
                "https://linkedin.com/in/adamgell",
                "https://adamgell.com/tools/cmtrace",
                "https://github.com/adamgell/cmtraceopen",
            ),
        )
        self.assertNotIn("/tools/cmtrace", link_targets)
        for target in link_targets:
            self.assertRegex(target, r"^(?:https://|mailto:)")

    def test_privacy_guard_distinguishes_local_artifacts_from_public_wording(
        self,
    ) -> None:
        path_guard = FORBIDDEN_PATTERNS[-1]
        for value in (
            "/Users/adam/Documents/Resume.docx",
            "/home/adam/Resume.docx",
            "/Volumes/Work/Resume.docx",
            "~/Documents/Resume.docx",
            r"C:\Users\Adam\Resume.docx",
            "C:/Documents/Resume.docx",
            r"\\fileserver\resumes\Resume.docx",
            "Resume_Adam_Gell_2025.docx",
        ):
            self.assertRegex(value, path_guard)

        for value in (
            "OneDrive administration",
            "https://example.com/home/about",
            "https://example.com/Volumes/guide",
            "/resume/adam-gell-resume.pdf",
            "adam-gell-resume.pdf",
        ):
            self.assertNotRegex(value, path_guard)

    def test_pdf_text_contains_no_private_identifiers(self) -> None:
        for pattern in FORBIDDEN_PATTERNS:
            self.assertIsNone(pattern.search(self.text), pattern.pattern)
        emails = sorted(
            set(
                re.findall(
                    r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}",
                    self.text,
                    re.IGNORECASE,
                )
            )
        )
        self.assertEqual(emails, ["me@adamgell.com"])

    def test_pdf_metadata_is_scrubbed(self) -> None:
        metadata = self.reader.metadata or {}
        self.assertEqual(metadata.get("/Title"), "Adam Gell Resume")
        self.assertFalse((metadata.get("/Author") or "").strip())
        metadata_text = " ".join(str(value) for value in metadata.values())
        for pattern in FORBIDDEN_PATTERNS:
            self.assertIsNone(pattern.search(metadata_text), pattern.pattern)


if __name__ == "__main__":
    unittest.main()
