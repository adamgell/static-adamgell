import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { before, test } from "node:test";

const root = fileURLToPath(new URL("..", import.meta.url));
let resumePage;
let resumeMain;
let homePage;
let publishedPdf;

const approvedHeadline =
  "Microsoft endpoint strategy, from assessment to adoption.";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function elementContent(html, tagName) {
  const match = html.match(
    new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"),
  );
  assert.ok(match, `expected built HTML to contain <${tagName}>`);
  return match[1];
}

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
  resumeMain = elementContent(resumePage, "main");
  homePage = readFileSync(path.join(root, "dist", "index.html"), "utf8");
  publishedPdf = path.join(
    root,
    "dist",
    "resume",
    "adam-gell-resume.pdf",
  );
});

test("renders the approved h1 and labelled h2 section structure", () => {
  assert.equal((resumeMain.match(/<h1\b/gi) ?? []).length, 1);
  assert.match(
    resumeMain,
    new RegExp(
      `<h1\\b[^>]*>\\s*${escapeRegex(approvedHeadline)}\\s*<\\/h1>`,
      "i",
    ),
  );

  for (const [id, heading] of [
    ["impact-heading", "Consulting impact"],
    ["technical-depth-heading", "Technical depth"],
    ["experience-heading", "Experience"],
    ["selected-work-heading", "Selected work"],
    ["education-heading", "Education &amp; credentials"],
    ["contact-heading", "Contact"],
  ]) {
    assert.match(
      resumeMain,
      new RegExp(
        `<section\\b(?=[^>]*\\baria-labelledby="${id}")[^>]*>\\s*` +
          `<h2\\b(?=[^>]*\\bid="${id}")[^>]*>\\s*` +
          `${escapeRegex(heading)}\\s*<\\/h2>`,
        "i",
      ),
      `${id} must label its section through an h2`,
    );
  }
});

test("renders the approved consulting metric and technical-depth groups", () => {
  assert.match(resumeMain, /\$373K/);
  assert.match(resumeMain, /consulting revenue delivered in 2025/i);
  assert.match(resumeMain, /132% of annual plan/i);
  for (const heading of [
    "Modern management and identity",
    "Autopilot and OS deployment",
    "Automation, analytics, and troubleshooting",
    "Patching and content delivery",
  ]) {
    assert.match(resumeMain, new RegExp(`>\\s*${escapeRegex(heading)}\\s*<`, "i"));
  }
  assert.match(resumeMain, /Windows Autopilot device preparation/);
  assert.match(resumeMain, /WDS and PXE/);
  assert.match(resumeMain, /Microsoft Graph/);
});

test("renders CMTrace Open and the 2025 credential with stable links", () => {
  assert.match(resumeMain, /CMTrace Open/);
  assert.match(resumeMain, /href="\/tools\/cmtrace"/);
  assert.match(resumeMain, /href="https:\/\/github\.com\/adamgell\/cmtraceopen"/);
  assert.match(resumeMain, /Microsoft 365 Certified: Endpoint Administrator Associate/);
  assert.match(resumeMain, /Earned August 2025/);
  assert.doesNotMatch(resumeMain, /\d+[★⭐]|GitHub stars?/i);
});

test("renders the canonical identity before the approved headline", () => {
  const name = /<p\b[^>]*>\s*Adam Gell\s*<\/p>/i.exec(resumeMain);
  const positioning =
    /<p\b[^>]*>\s*Senior Microsoft Intune Consultant \| Consulting Leader\s*<\/p>/i.exec(
      resumeMain,
    );
  const headline = new RegExp(
    `<h1\\b[^>]*>\\s*${escapeRegex(approvedHeadline)}\\s*<\\/h1>`,
    "i",
  ).exec(resumeMain);

  assert.ok(name, "expected canonical name in a visible identity line");
  assert.ok(positioning, "expected canonical positioning in a supporting line");
  assert.ok(headline, "expected the approved headline in the h1");
  assert.ok(
    name.index < positioning.index && positioning.index < headline.index,
    "expected name and positioning before the approved headline",
  );
  assert.doesNotMatch(
    resumeMain,
    /Managing Consultant Engineer \| Microsoft Intune/i,
  );
});

test("uses no low-contrast slate-500 copy inside main", () => {
  assert.doesNotMatch(resumeMain, /\btext-slate-500\b/);
});

test("publishes descriptive contact and PDF actions without an embed", () => {
  assert.match(resumePage, /href="\/resume\/adam-gell-resume\.pdf"/);
  assert.match(resumePage, /Download resume \(PDF\)/);
  assert.match(resumePage, /mailto:(?:me@adamgell\.com|me%40adamgell\.com)/);
  assert.match(resumePage, /https:\/\/github\.com\/adamgell/);
  assert.match(resumePage, /https:\/\/linkedin\.com\/in\/adamgell/);
  assert.doesNotMatch(resumePage, /<(?:iframe|object)\b/i);
});

test("publishes no executable scripts or Astro hydration markup", () => {
  assert.doesNotMatch(resumePage, /<script\b/i);
  assert.doesNotMatch(
    resumePage,
    /<astro-(?:island|slot|static-slot)\b|\b(?:component-url|renderer-url|client:(?:load|idle|visible|media|only))=/i,
  );
});

test("links to the resume from shared navigation and the homepage card", () => {
  assert.match(resumePage, /href="\/resume"[^>]*>\s*Resume\s*</i);
  assert.match(
    homePage,
    /<a\b[^>]*href="\/resume"[^>]*>(?:(?!<\/a>)[\s\S])*Microsoft Intune consulting, endpoint strategy, and technical leadership experience\.(?:(?!<\/a>)[\s\S])*<\/a>/i,
  );
});

test("copies the non-empty PDF into the built stable URL", () => {
  assert.ok(statSync(publishedPdf).size > 0);
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
