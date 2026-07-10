# Resume Content Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the existing native resume page and synchronized PDF with the approved consulting metric, deeper endpoint and OS-deployment expertise, expanded experience, CMTrace Open selected work, and the 2025 Endpoint Administrator credential.

**Architecture:** Keep `src/data/resume.json` as the only public-content source. Extend its schema, render the new structures semantically in `src/pages/resume.astro`, and update `scripts/generate-resume-pdf.py` to place the same content into a deterministic one- or two-page ATS-readable PDF. Enforce the publication boundary and cross-surface synchronization with focused Node and Python tests.

**Tech Stack:** Astro 5, Tailwind CSS 4, Node's built-in test runner, Python 3, ReportLab, PyPDF, Poppler, and the Codex in-app browser.

## Global Constraints

- Work only in `/Users/Adam.Gell/repo/static-adamgell/.worktrees/resume-page` on `codex/resume-page`.
- Follow strict red-green-refactor: every production-content or rendering change begins with a focused failing test that fails for the expected missing behavior.
- Keep `src/data/resume.json` as the only editable public-content source; never edit the generated PDF manually.
- Publish `$373K` as `consulting revenue delivered in 2025` with context `132% of annual plan` and associate it with role ID `cdw`.
- Do not publish customer names, internal performance-rating language, alternate personal email addresses, internal initiative names, source paths, or source filenames.
- Public contact data remains exactly `me@adamgell.com`, `https://github.com/adamgell`, and `https://linkedin.com/in/adamgell`.
- Use the official distinction between [Windows Autopilot](https://learn.microsoft.com/en-us/autopilot/overview) and [Windows Autopilot device preparation](https://learn.microsoft.com/en-us/autopilot/device-preparation/compare); do not publish informal `v1` or `v2` labels as product names.
- Use current evidence from `/Users/Adam.Gell/repo/cmtraceopen/README.md` and the existing `src/pages/tools/cmtrace/` content for CMTrace Open wording; omit stars and changing feature counts.
- Keep the resume static: no client-side scripts, hydration markup, runtime network requests, CMS, or dynamic GitHub API calls.
- Preserve the existing dark slate and sky visual language, one `h1`, logical labelled `h2`/`h3` sections, visible focus, and no overflow at 320 CSS pixels.
- The PDF must be deterministic, selectable, ATS-readable, scrubbed of personal metadata, no longer than two US Letter pages, and free of a sparse trailing page.
- Never add either source DOCX to version control or `public/`.

---

### Task 1: Expand the Canonical Resume Data

**Files:**
- Modify: `tests/resume-data.test.mjs:27-87`
- Modify: `src/data/resume.json:3-154`

**Interfaces:**
- Consumes: the approved schema and wording from `docs/superpowers/specs/2026-07-10-resume-content-expansion-design.md`.
- Produces: `resume.consultingImpact`, `resume.technicalDepth`, `resume.selectedWork`, expanded `resume.experience`, and the ordered 2025 credential for both renderers.

- [ ] **Step 1: Write focused failing data tests**

Add these tests after the existing role/contact tests in `tests/resume-data.test.mjs`:

```js
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
```

Change the existing content-group assertions to expect `technicalDepth.length === 4` and remove the old `expertise.length === 3` assertion.

- [ ] **Step 2: Run the data tests and verify RED**

Run:

```bash
node --test tests/resume-data.test.mjs
```

Expected: FAIL because `resume.consultingImpact`, `resume.technicalDepth`, and `resume.selectedWork` do not exist and the current experience/credential content differs.

- [ ] **Step 3: Implement the exact canonical content**

In `src/data/resume.json`:

1. Replace `summary` with:

```json
"Senior Microsoft Intune consultant with 15+ years of enterprise IT experience translating complex endpoint and Windows deployment requirements into secure, supportable programs. Combines hands-on engineering across Microsoft Intune, Windows Autopilot, Microsoft Entra ID, Windows 365, PowerShell, and Microsoft Graph with client advisory, pre-sales discovery, delivery leadership, and knowledge transfer."
```

2. Insert this object after `impactPillars`:

```json
"consultingImpact": {
  "value": "$373K",
  "label": "consulting revenue delivered in 2025",
  "context": "132% of annual plan",
  "roleId": "cdw"
}
```

3. Replace `expertise` with:

```json
"technicalDepth": [
  {
    "title": "Modern management and identity",
    "description": "Cloud-native endpoint, access, and security policy across diverse platforms.",
    "items": ["Microsoft Intune", "Microsoft Entra ID", "Conditional Access", "Compliance and configuration policy", "LAPS and BitLocker", "Win32 apps", "Windows 365", "Intune Suite"]
  },
  {
    "title": "Autopilot and OS deployment",
    "description": "Provisioning strategy across cloud-native and traditional deployment workflows.",
    "items": ["Windows Autopilot", "Windows Autopilot device preparation", "Enrollment Status Page", "Microsoft Entra join", "Hybrid Microsoft Entra join", "ConfigMgr and MDT task sequences", "WDS and PXE", "WIM servicing", "OEM driver integration", "Windows imaging", "Language-pack provisioning"]
  },
  {
    "title": "Automation, analytics, and troubleshooting",
    "description": "Repeatable administration, security insight, and evidence-led diagnosis.",
    "items": ["PowerShell", "Microsoft Graph", "Azure REST APIs", "KQL", "Log Analytics and Microsoft Sentinel", "Advanced Hunting", "CMTrace", "CBS and DISM", "Panther", "Intune Management Extension", "SetupDiag"]
  },
  {
    "title": "Patching and content delivery",
    "description": "Update compliance and bandwidth-aware software delivery at scale.",
    "items": ["Intune update rings", "WSUS and SUPs", "Third-party patching", "Compliance remediation", "Vulnerability-management workflows", "Distribution points", "Cloud delivery", "Peer-to-peer delivery", "Bandwidth-aware design"]
  }
]
```

4. Replace the CDW and NextStep achievement arrays with the exact arrays from Step 1. Leave Applied Microsystems unchanged.

5. Insert this structure after `experience`:

```json
"selectedWork": [
  {
    "id": "cmtrace-open",
    "title": "CMTrace Open",
    "subtitle": "Open-source, cross-platform log viewer and Windows troubleshooting tool",
    "description": "Built as a modern replacement for CMTrace.exe with dedicated Intune diagnostics, device-registration analysis, and real-time log tailing.",
    "capabilities": [
      "Automatically detects and parses common Windows log formats, including CCM, CBS, DISM, Panther, MSI, and plain text.",
      "Combines Intune Management Extension logs into a dedicated diagnostic workspace and structures DSRegCmd evidence for join and identity troubleshooting.",
      "Handles large files, supports live tailing and filtering, and exports investigation context for case handoff."
    ],
    "links": [
      { "label": "Explore CMTrace Open", "url": "/tools/cmtrace" },
      { "label": "View source on GitHub", "url": "https://github.com/adamgell/cmtraceopen" }
    ]
  }
]
```

6. Prepend the 2025 credential from Step 1 to `credentials`; retain all three existing credentials afterward.

- [ ] **Step 4: Run the data tests and verify GREEN**

Run:

```bash
node --test tests/resume-data.test.mjs
```

Expected: all data tests PASS with no warnings.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/data/resume.json tests/resume-data.test.mjs
git commit -m "feat: expand canonical resume content"
```

---

### Task 2: Render Consulting Impact, Technical Depth, and Selected Work on the Web

**Files:**
- Modify: `tests/resume-page.test.mjs:49-146`
- Modify: `src/pages/resume.astro:9-174`

**Interfaces:**
- Consumes: `resume.consultingImpact`, `resume.technicalDepth`, `resume.selectedWork`, expanded experience, and credential data from Task 1.
- Produces: labelled static sections `impact-heading`, `technical-depth-heading`, `experience-heading`, `selected-work-heading`, `education-heading`, and `contact-heading` with no client JavaScript.

- [ ] **Step 1: Write failing built-page tests**

In the section-structure table in `tests/resume-page.test.mjs`, replace `expertise-heading / Core expertise` with `technical-depth-heading / Technical depth` and insert `selected-work-heading / Selected work` after Experience.

Add these tests after the heading-structure test:

```js
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
```

- [ ] **Step 2: Run the built-page test and verify RED**

Run:

```bash
node --test tests/resume-page.test.mjs
```

Expected: FAIL because the built page still renders `Core expertise`, has no metric card, and has no `Selected work` section.

- [ ] **Step 3: Render the approved static sections**

In `src/pages/resume.astro`:

1. Extend `description` and `keywords` with OS deployment, PowerShell, and Microsoft Graph without changing the title.
2. Replace the current impact grid with one metric article plus the three existing pillars:

```astro
<section aria-labelledby="impact-heading" class="mt-14">
  <h2 id="impact-heading" class="sr-only">Consulting impact</h2>
  <div class="grid gap-px overflow-hidden rounded-lg border border-slate-800 bg-slate-800 sm:grid-cols-2 xl:grid-cols-4">
    <article class="bg-slate-950 p-6">
      <p class="text-3xl font-bold tracking-tight text-white">{resume.consultingImpact.value}</p>
      <h3 class="mt-2 font-semibold text-slate-100">{resume.consultingImpact.label}</h3>
      <p class="mt-2 text-sm leading-6 text-sky-300">{resume.consultingImpact.context}</p>
    </article>
    {resume.impactPillars.map((pillar) => (
      <article class="bg-slate-950 p-6">
        <h3 class="font-semibold text-slate-100">{pillar.title}</h3>
        <p class="mt-2 text-sm leading-6 text-slate-400">{pillar.description}</p>
      </article>
    ))}
  </div>
</section>
```

3. Replace the current Core expertise section with:

```astro
<section aria-labelledby="technical-depth-heading" class="mt-20">
  <div class="max-w-2xl">
    <h2 id="technical-depth-heading" class="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Technical depth</h2>
    <p class="mt-3 text-sm leading-6 text-slate-400">Cloud-native endpoint strategy backed by hands-on Windows deployment, automation, security, and troubleshooting.</p>
  </div>
  <div class="mt-8 grid gap-5 md:grid-cols-2">
    {resume.technicalDepth.map((group, index) => (
      <article aria-labelledby={`technical-depth-${index}`} class="rounded-lg border border-slate-800 p-6">
        <h3 id={`technical-depth-${index}`} class="text-lg font-semibold text-white">{group.title}</h3>
        <p class="mt-2 text-sm leading-6 text-slate-400">{group.description}</p>
        <ul class="mt-5 flex flex-wrap gap-2" aria-label={`${group.title} capabilities`}>
          {group.items.map((item) => (
            <li class="rounded-full border border-slate-700 px-3 py-1.5 text-xs leading-5 text-slate-300">{item}</li>
          ))}
        </ul>
      </article>
    ))}
  </div>
</section>
```

4. Insert this section between Experience and Education:

```astro
<section aria-labelledby="selected-work-heading" class="mt-20 grid gap-8 md:grid-cols-[10rem_minmax(0,1fr)]">
  <h2 id="selected-work-heading" class="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">Selected work</h2>
  <div class="space-y-8">
    {resume.selectedWork.map((project) => (
      <article aria-labelledby={`project-${project.id}`} class="rounded-lg border border-slate-800 p-6 sm:p-8">
        <h3 id={`project-${project.id}`} class="text-xl font-semibold text-white">{project.title}</h3>
        <p class="mt-1 text-sm font-medium text-sky-300">{project.subtitle}</p>
        <p class="mt-4 text-sm leading-7 text-slate-400">{project.description}</p>
        <ul class="mt-5 space-y-3 text-sm leading-7 text-slate-400">
          {project.capabilities.map((capability) => (
            <li class="relative pl-5 before:absolute before:left-0 before:text-slate-600 before:content-['—']">{capability}</li>
          ))}
        </ul>
        <div class="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm">
          {project.links.map((item) => (
            <a class="text-sky-300 hover:text-sky-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300" href={item.url} target={item.url.startsWith("http") ? "_blank" : undefined} rel={item.url.startsWith("http") ? "noopener noreferrer" : undefined}>{item.label}</a>
          ))}
        </div>
      </article>
    ))}
  </div>
</section>
```

Leave experience rendering data-driven and leave navigation/homepage untouched.

- [ ] **Step 4: Run the page tests and verify GREEN**

Run:

```bash
node --test tests/resume-data.test.mjs tests/resume-page.test.mjs
```

Expected: all Node tests PASS; the build invoked by `resume-page.test.mjs` succeeds.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/pages/resume.astro tests/resume-page.test.mjs
git commit -m "feat: render expanded resume sections"
```

---

### Task 3: Expand and Regenerate the ATS-Friendly PDF

**Files:**
- Modify: `tests/test_resume_pdf.py:60-111`
- Modify: `scripts/generate-resume-pdf.py:59-262`
- Regenerate: `public/resume/adam-gell-resume.pdf`

**Interfaces:**
- Consumes: the canonical Task 1 structures and the existing deterministic ReportLab/PyPDF pipeline.
- Produces: a deterministic one- or two-page PDF whose section order is `PROFESSIONAL SUMMARY`, `CONSULTING IMPACT`, `TECHNICAL DEPTH`, `PROFESSIONAL EXPERIENCE`, `SELECTED WORK`, `EDUCATION`, `SELECTED CREDENTIALS`.

- [ ] **Step 1: Write failing PDF content and order tests**

In `test_pdf_has_expected_ats_reading_order`, replace `CORE EXPERTISE` with `TECHNICAL DEPTH` and insert `SELECTED WORK` after `PROFESSIONAL EXPERIENCE`.

Add these assertions to the same test:

```python
self.assertIn("$373K", self.text)
self.assertIn("132% of annual plan", self.text)
self.assertIn("Windows Autopilot device preparation", self.text)
self.assertIn("WDS and PXE", self.text)
self.assertIn("CMTrace Open", self.text)
self.assertIn("Microsoft 365 Certified: Endpoint Administrator Associate", self.text)
self.assertIn("Earned August 2025", self.text)
self.assertNotRegex(self.text, r"\d+[★⭐]|GitHub stars?")
```

Add a contact-boundary assertion to `test_pdf_text_contains_no_private_identifiers`:

```python
emails = sorted(set(re.findall(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", self.text, re.IGNORECASE)))
self.assertEqual(emails, ["me@adamgell.com"])
```

- [ ] **Step 2: Run the PDF tests and verify RED**

Run with the bundled Python:

```bash
CODEX_PYTHON="/Users/Adam.Gell/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
"$CODEX_PYTHON" -m unittest tests/test_resume_pdf.py -v
```

Expected: FAIL because the generator still emits `CORE EXPERTISE`, omits the metric, and has no selected-work content.

- [ ] **Step 3: Update the PDF story without shrinking the current type scale**

In `build_story`:

1. Replace `Core expertise` and `data["expertise"]` with `Technical depth` and `data["technicalDepth"]`. Render each group as:

```python
items = ", ".join(escape(item) for item in group["items"])
story.append(
    Paragraph(
        f'<b>{escape(group["title"])}</b> - '
        f'{escape(group["description"])} {items}',
        styles["left"],
    )
)
```

2. Before each CDW achievement, insert the shared consulting metric only when `role["id"] == data["consultingImpact"]["roleId"]`:

```python
impact = data["consultingImpact"]
if role["id"] == impact["roleId"]:
    story.append(
        Paragraph(
            f'- {escape(impact["value"])} '
            f'{escape(impact["label"])} ({escape(impact["context"])}).',
            styles["bullet"],
        )
    )
```

3. After Professional Experience and before Education, render Selected Work:

```python
story.append(section("Selected work", styles))
for project in data["selectedWork"]:
    story.append(CondPageBreak(0.7 * inch))
    story.append(Paragraph(escape(project["title"]), styles["role"]))
    story.append(Paragraph(escape(project["subtitle"]), styles["role_meta"]))
    story.append(Paragraph(escape(project["description"]), styles["body"]))
    for capability in project["capabilities"]:
        story.append(Paragraph(f'- {escape(capability)}', styles["bullet"]))
    links = " | ".join(link(item["url"], item["label"]) for item in project["links"])
    story.append(Paragraph(links, styles["left"]))
```

Do not reduce existing font sizes or margins merely to keep one page. Let ReportLab flow naturally to a second page, then tune only section spacing if the trailing-page density test requires it.

- [ ] **Step 4: Regenerate the committed PDF and verify GREEN**

Run:

```bash
CODEX_PYTHON="/Users/Adam.Gell/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
"$CODEX_PYTHON" scripts/generate-resume-pdf.py
"$CODEX_PYTHON" -m unittest tests/test_resume_pdf.py -v
```

Expected: all PDF tests PASS, including deterministic byte equality, one-to-two-page limit, trailing-page density, ATS order, contact boundary, and metadata scrub.

- [ ] **Step 5: Commit Task 3**

```bash
git add scripts/generate-resume-pdf.py tests/test_resume_pdf.py public/resume/adam-gell-resume.pdf
git commit -m "feat: expand downloadable resume PDF"
```

---

### Task 4: Cross-Surface Review and Release Verification

**Files:**
- Verify: `src/data/resume.json`
- Verify: `src/pages/resume.astro`
- Verify: `public/resume/adam-gell-resume.pdf`
- Verify: `dist/resume/index.html`
- Modify only if a failing test or observed defect requires a focused regression fix.

**Interfaces:**
- Consumes: Tasks 1-3 and the approved design spec.
- Produces: independently reviewed, browser-verified, PDF-inspected, privacy-audited resume expansion with a clean worktree.

- [ ] **Step 1: Run the complete automated suite and production build**

```bash
set -e
CODEX_PYTHON="/Users/Adam.Gell/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3"
"$CODEX_PYTHON" scripts/generate-resume-pdf.py
node --test tests/resume-data.test.mjs tests/resume-page.test.mjs
"$CODEX_PYTHON" -m unittest tests/test_resume_pdf.py -v
npm run build
git diff --check
```

Expected: zero test failures, successful 17-page-or-greater static build, and no whitespace errors.

- [ ] **Step 2: Run the release privacy and source-artifact audit**

Use runtime-only patterns rather than committing private values as fixtures. Search `src/data/resume.json`, `dist/resume/index.html`, and extracted PDF text for alternate email addresses, phone/address formats, credential IDs, local paths, source filenames, customer names from the supplied documents, and internal rating language. Confirm:

```bash
git ls-files | rg '\.docx$' && exit 1 || true
```

Expected: no source DOCX or supplied filename is tracked, and no forbidden value appears in published output.

- [ ] **Step 3: Inspect the live page in the Codex in-app browser**

Reuse or start the Astro dev server at `http://127.0.0.1:4321`. Verify `/resume` at the normal desktop viewport and at 320 CSS pixels:

- All approved sections and exact metric are visible.
- The technical-depth grid is two-by-two on desktop and one column on mobile.
- CMTrace links are correct and descriptive.
- DOM order, headings, focusability, focus visibility, contrast classes, and keyboard order remain correct.
- `scrollWidth <= clientWidth`, `scriptCount === 0`, and browser console warnings/errors are empty.

- [ ] **Step 4: Render and inspect every PDF page**

Use the PDF skill's Poppler workflow to render `public/resume/adam-gell-resume.pdf` to PNG. Inspect every page at 100 percent zoom for clipping, overlap, awkward page breaks, sparse pages, missing glyphs, and cramped typography. Extract text and verify section order and the public-contact boundary.

- [ ] **Step 5: Request independent code review and address findings with TDD**

Use `superpowers:requesting-code-review` and the default CodeRabbit review skill for the complete diff from `20f68578ff5d84bfcad4866115a663c281719ec1` to feature HEAD. Any actionable defect must first receive a focused failing regression test, then the minimal fix, then a fresh full verification run.

- [ ] **Step 6: Record final verification evidence**

Confirm `git status --short` is empty and record exact passing test counts, build page count, PDF page count, browser viewport results, and review outcome in the task handoff. Do not merge or push until the user selects a finishing option.
