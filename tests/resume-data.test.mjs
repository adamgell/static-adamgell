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
