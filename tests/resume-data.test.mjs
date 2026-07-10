import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { localPathOrSourcePattern } from "./resume-privacy-patterns.mjs";

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
    pattern: localPathOrSourcePattern,
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

test("pins the approved consulting metric and technical-depth groups", () => {
  assert.deepEqual(resume.consultingImpact, {
    value: "$373K",
    label: "consulting revenue delivered in 2025",
    context: "132% of annual plan",
    roleId: "cdw",
  });
  assert.deepEqual(
    resume.technicalDepth.map(({ title, description }) => ({ title, description })),
    [
      {
        title: "Modern management and identity",
        description: "Cloud-native endpoint, access, and security policy across diverse platforms.",
      },
      {
        title: "Autopilot and OS deployment",
        description: "Provisioning strategy across cloud-native and traditional deployment workflows.",
      },
      {
        title: "Automation, analytics, and troubleshooting",
        description: "Repeatable administration, security insight, and evidence-led diagnosis.",
      },
      {
        title: "Patching and content delivery",
        description: "Update compliance and bandwidth-aware software delivery at scale.",
      },
    ],
  );
});

test("pins the approved source-supported expansion without private detail", () => {
  const cdw = resume.experience.find(({ id }) => id === "cdw");
  const nextstep = resume.experience.find(({ id }) => id === "nextstep");

  assert.deepEqual(cdw.achievements, [
    "Leads end-to-end Microsoft Intune and Windows Autopilot engagements for enterprise and mid-market clients, spanning assessment, architecture, implementation, Tier 3 escalation, and knowledge transfer.",
    "Architects provisioning for Microsoft Entra joined and hybrid Microsoft Entra joined devices, advises on Windows Autopilot device preparation, and guides migrations from traditional deployment workflows.",
    "Designs and automates an endpoint-health assessment and reporting service with PowerShell and Microsoft Graph, reducing manual data collection and improving consistency across engagements.",
    "Delivers Intune Suite and security capabilities including Endpoint Privilege Management, Endpoint Analytics, Remote Help, Conditional Access, compliance policy, and configuration profiles.",
    "Supports pre-sales and bid assurance through discovery, scope review, and solution design while mentoring peers, contributing knowledge-base guidance, and participating in service development.",
  ]);
  assert.deepEqual(nextstep.achievements, [
    "Delivered consulting and managed IT services across 40+ client environments, serving as the primary technical resource and advising leaders on roadmaps, budgets, business processes, and technology transitions.",
    "Built and maintained Windows deployment workflows with MDT, WDS/PXE, Windows imaging, OEM driver integration, and language-pack provisioning across diverse hardware fleets.",
    "Managed WSUS and third-party patch distribution, audited deployment failures and compliance, and remediated vulnerabilities across the client base.",
    "Led four Microsoft Azure migrations and more than 15 transitions from on-premises systems to Microsoft 365, Microsoft Intune, and Azure, including moves from traditional imaging to Windows Autopilot.",
    "Integrated remote monitoring and management tooling with Microsoft Intune and Windows Autopilot to automate device lifecycle work.",
    "Deployed Microsoft Defender for Endpoint and implemented Citrix, Azure Virtual Desktop, and Windows 365 solutions.",
  ]);
  assert.deepEqual(resume.selectedWork.map(({ id, title }) => ({ id, title })), [
    { id: "cmtrace-open", title: "CMTrace Open" },
  ]);
  assert.deepEqual(resume.credentials[0], {
    name: "Microsoft 365 Certified: Endpoint Administrator Associate",
    year: "Earned August 2025",
  });

  const emails = [...new Set(serialized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [])];
  assert.deepEqual(emails, ["me@adamgell.com"]);
  assert.doesNotMatch(serialized, /"(?:clientNames|performanceRating|internalInitiative)"/i);
});

test("pins supported consulting scale and content groups", () => {
  assert.equal(resume.lifecycle.length, 4);
  assert.equal(resume.impactPillars.length, 3);
  assert.equal(resume.technicalDepth.length, 4);
  assert.match(serialized, /40\+ client environments/);
  assert.match(serialized, /four Microsoft Azure migrations/);
  assert.match(serialized, /more than 15 transitions/);
});

test("contains no private or source-only identifiers", () => {
  for (const { label, pattern } of forbiddenPatterns) {
    assert.doesNotMatch(serialized, pattern, `unexpected ${label}`);
  }
});

test("privacy guard distinguishes local artifacts from public wording", () => {
  const pathGuard = forbiddenPatterns.find(
    ({ label }) => label === "local path or source filename",
  ).pattern;

  for (const value of [
    "/Users/adam/Documents/Resume.docx",
    "/home/adam/Resume.docx",
    "/Volumes/Work/Resume.docx",
    "~/Documents/Resume.docx",
    String.raw`C:\Users\Adam\Resume.docx`,
    "C:/Documents/Resume.docx",
    String.raw`\\fileserver\resumes\Resume.docx`,
    "Resume_Adam_Gell_2025.docx",
  ]) {
    assert.match(value, pathGuard, `expected local artifact guard for ${value}`);
  }

  for (const value of [
    "OneDrive administration",
    "https://example.com/home/about",
    "https://example.com/Volumes/guide",
    "/resume/adam-gell-resume.pdf",
    "adam-gell-resume.pdf",
  ]) {
    assert.doesNotMatch(
      value,
      pathGuard,
      `unexpected local artifact match for ${value}`,
    );
  }
});
