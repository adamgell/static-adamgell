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
