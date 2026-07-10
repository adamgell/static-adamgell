# Resume Content Expansion Design

Date: 2026-07-10

## Summary

Expand the existing `/resume` page and downloadable PDF with stronger, source-supported evidence from the supplied 2025 general and OS-deployment resumes. The update will combine two approved directions: integrate the best new material into the existing narrative and add a distinct, scannable technical-depth section.

The page will continue to position Adam as both a senior Microsoft Intune consultant and a consulting leader. It will now show deeper Windows deployment, automation, security, troubleshooting, practice-development, and open-source experience without turning the resume into a keyword inventory.

This design extends the approved `2026-07-09-resume-page-design.md` specification. Where the two documents differ, this expansion design governs the additional content and the approved publication of the 2025 consulting-revenue metric.

## Approved Direction

The approved approach is an integrated narrative plus a dedicated technical-depth section.

The approved publicity policy is balanced:

- Publish the supported consulting result: `$373K in consulting revenue in 2025`, equal to `132% of plan`.
- Do not publish customer names from the source resumes.
- Do not publish internal performance-rating language.
- Generalize internal service and initiative names when the underlying accomplishment can be stated safely.

## Goals

- Add meaningful technical and leadership depth from both supplied resumes.
- Make the consulting-performance result easy to find without repeating it as filler.
- Show credible expertise in modern management and traditional-to-cloud OS deployment.
- Add CMTrace Open as selected professional work rather than burying it in an experience bullet.
- Add the Microsoft 365 Endpoint Administrator Associate credential earned in August 2025.
- Preserve the current page's readability, accessibility, privacy protections, and static architecture.
- Keep the HTML page and downloadable PDF synchronized through the canonical JSON source.

## Non-goals

- Do not publish either supplied DOCX or copy it into the repository.
- Do not publish named customers, internal performance ratings, the source Gmail address, or other private identifiers.
- Do not add a dynamic GitHub-star counter or any external runtime data dependency.
- Do not create an exhaustive technology inventory or claim proficiency unsupported by the source material.
- Do not redesign the shared site navigation, homepage, blog, or tools pages.
- Do not add client-side JavaScript to the resume page.

## Audience and Editorial Outcome

The primary audience remains hiring managers, recruiters, consulting leaders, and client stakeholders evaluating Adam for senior endpoint-management work with leadership expectations.

The expanded resume must communicate three ideas quickly:

1. Adam owns endpoint engagements from assessment and architecture through delivery, escalation, knowledge transfer, and adoption.
2. Adam bridges cloud-native Microsoft Intune and Windows Autopilot work with deep Windows deployment, patching, automation, and troubleshooting experience.
3. Adam contributes beyond individual delivery through measurable consulting performance, pre-sales support, mentoring, reusable service automation, and open-source engineering.

The existing headline, `Microsoft endpoint strategy, from assessment to adoption.`, remains unchanged.

## Content Architecture

The expanded web page will use this order:

1. Name, professional positioning, existing headline, expanded summary, and contact actions.
2. Existing `Assess -> Design -> Deliver -> Adopt` consulting lifecycle.
3. Consulting impact, including the approved 2025 revenue result.
4. Technical depth in four focused groups.
5. Professional experience in reverse chronological order.
6. Selected work featuring CMTrace Open.
7. Education and credentials, including the 2025 certification.
8. Existing public contact links.

### Hero and Summary

Keep the headline and primary actions. Expand the summary enough to include Windows deployment, security architecture, PowerShell, and Microsoft Graph while retaining the current consultant-and-practice-lead positioning. The summary must remain a short paragraph, not a list of products.

### Consulting Impact

Add a structured consulting-performance item associated with the CDW role:

- Value: `$373K`
- Label: `consulting revenue delivered in 2025`
- Context: `132% of annual plan`

Store this fact once in canonical data with its CDW association. The web page will present it as a prominent impact proof point, while the PDF will place it inside the CDW experience entry for conventional resume context. Both renderings must consume the same data object.

Retain the existing qualitative signals for cross-platform delivery, trusted advisory, and practice contribution. Avoid adding a dashboard of repetitive historical metrics already explained in experience bullets.

### Technical Depth

Replace the current compact core-expertise treatment with a fuller `Technical depth` section. Use four groups with short supporting descriptions and concise item lists:

1. **Modern management and identity**
   - Microsoft Intune across Windows, macOS, iOS/iPadOS, Android, and Linux.
   - Microsoft Entra ID, Conditional Access, compliance and configuration policy, LAPS, BitLocker, Win32 apps, Windows 365, and relevant Intune Suite capabilities.
2. **Autopilot and OS deployment**
   - Windows Autopilot, Enrollment Status Page, native and hybrid Microsoft Entra join scenarios, and migration from traditional imaging.
   - ConfigMgr/MDT task sequences, WDS/PXE, WIM servicing, OEM driver integration, Windows imaging, and language-pack provisioning.
3. **Automation, analytics, and troubleshooting**
   - PowerShell, Microsoft Graph, Azure REST APIs, and automation for bulk device and tenant operations.
   - KQL, Microsoft security analytics, and troubleshooting across CMTrace, CBS, DISM, Panther, Intune Management Extension, and SetupDiag logs.
4. **Patching and content delivery**
   - Intune update rings, WSUS/SUPs, third-party patching, compliance remediation, and vulnerability-management workflows.
   - Distribution points, cloud delivery, peer-to-peer delivery, and bandwidth-aware deployment design.

The web layout will use a two-by-two card grid at desktop sizes and a single-column sequence on narrow screens. Reading order must remain identical across breakpoints.

### Professional Experience

CDW remains the most detailed role. Revise its achievements into a concise set that covers:

- End-to-end Intune and Autopilot engagement ownership for enterprise and mid-market clients, including assessment, design, implementation, escalation, and knowledge transfer.
- The approved 2025 consulting-revenue result through the shared consulting-impact object.
- Windows Autopilot architecture for native and hybrid Microsoft Entra scenarios, including migration strategy from traditional deployment workflows.
- A reusable endpoint-health assessment and reporting service automated with PowerShell and Microsoft Graph, described generically rather than by an internal service name.
- Intune Suite, Conditional Access, compliance, configuration, least-privilege, and endpoint-health work.
- Pre-sales and bid-assurance support, Tier 3 escalation, peer mentoring, knowledge-base contribution, and service-development participation.

Applied Microsystems remains concise. Preserve its current emphasis on Qualys vulnerability management, patch governance, security escalation, Microsoft 365 posture auditing, documentation, and change management.

Expand NextStep only where the new material adds distinct evidence:

- MDT, WDS/PXE, Windows imaging, OEM driver integration, and language-pack delivery across diverse hardware.
- WSUS and third-party patch distribution, compliance auditing, and vulnerability remediation.
- RMM integration with Microsoft Intune and Windows Autopilot for lifecycle automation.
- Fractional-CIO advisory covering roadmaps, budgets, and business-process improvement.

Keep the existing supported scale of more than 40 clients, more than 15 modern-management transitions, and four Azure migrations. Avoid duplicating the same result in multiple bullets.

### Selected Work

Add one focused `Selected work` entry for CMTrace Open. It will include:

- A short description of the open-source, cross-platform log-viewing and Windows-troubleshooting purpose.
- Stable capabilities such as multi-format Windows log detection, large-file handling, real-time tailing, Intune diagnostics, device-registration analysis, and case-handoff export.
- Links to the existing on-site CMTrace page and the public GitHub repository.

Do not publish a GitHub-star count, exact lookup count, or other release-sensitive number. During implementation, current project evidence in the CMTrace Open repository and the existing site pages governs feature wording; stale framework wording from a supplied resume must not override the current project.

### Education and Credentials

Add `Microsoft 365 Certified: Endpoint Administrator Associate` with the wording `Earned August 2025`. Do not imply current active status. Retain the existing selected credentials and education, and list the 2025 credential first.

## Canonical Data and Rendering Flow

`src/data/resume.json` remains the only editable public-content source. Extend it with focused structures for:

- `consultingImpact`: the approved metric, context, and associated role ID.
- `technicalDepth`: the four ordered groups and their items.
- `selectedWork`: the CMTrace Open description, capability bullets, and links.
- Expanded experience achievements.
- The 2025 credential.

`src/pages/resume.astro` will render the new structures as semantic HTML. `scripts/generate-resume-pdf.py` will read the same structures and produce the committed PDF. The generated PDF must never be edited manually.

No new content-management system, build-time network request, client-side data fetch, or browser hydration is permitted.

## Web Presentation

Preserve the existing dark slate visual system, sky accent, rounded borders, readable line lengths, and `max-w-5xl` shell. New content should feel like a deeper version of the existing page rather than a redesign.

- Present consulting impact near the top as a restrained proof point, not a sales dashboard.
- Present technical depth as a balanced two-by-two grid on desktop and a single column on mobile.
- Present CMTrace Open as one selected-work article with concise capabilities and two descriptive links.
- Keep experience bullets readable; avoid dense paragraphs and keyword-only lines.
- Maintain one `h1`, logical `h2` and `h3` levels, visible focus, sufficient contrast, and zero horizontal overflow at 320 CSS pixels.

## PDF Presentation

Allow the downloadable PDF to grow from one page to two US Letter portrait pages. Do not reduce typography below the current readable scale or remove meaningful content merely to preserve one page.

The PDF will:

- Use the consulting metric in CDW context.
- Present technical depth compactly without multi-column ATS-hostile layouts.
- Include the expanded experience, selected work, and 2025 credential.
- Keep normal reading order, selectable text, deterministic generation, and scrubbed metadata.
- Remain no longer than two pages, with neither page sparsely populated.

## Terminology and Evidence Rules

Microsoft product names that may have changed must be checked against current official Microsoft documentation during implementation. Use the current official name where it preserves the historical meaning. Do not present informal `v1` or `v2` labels as official Windows Autopilot product names.

CMTrace Open claims must be checked against the current local project or its existing site documentation. If a source-resume detail conflicts with current project evidence, current project evidence wins. Use stable nonnumeric capability wording rather than publishing potentially stale counts.

No unsupported customer, project, team-size, savings, or delivery-scale claim may be introduced.

## Privacy and Publishing Rules

Continue enforcing the original privacy rules. Public contact details remain limited to:

- `me@adamgell.com`
- `https://github.com/adamgell`
- `https://linkedin.com/in/adamgell`

The page, PDF, and built output must exclude:

- Any alternate personal email from a supplied source.
- Phone numbers and residential addresses.
- Credential identifiers.
- Customer names contained in the supplied resumes.
- Internal performance-rating language.
- Local source paths and source filenames.
- Internal initiative names that are not needed to explain the accomplishment.

The test suite will enforce the exact approved public contact schema rather than committing private contact values as test fixtures.

## Runtime and Failure Handling

The resume remains static and has no loading or authentication state.

Treat each of the following as a release-blocking failure:

- Missing required consulting-impact, technical-depth, selected-work, experience, or credential data.
- Any forbidden private value in canonical data, generated HTML, built output, PDF text, or PDF metadata.
- A missing, empty, stale, or nondeterministically generated PDF.
- A PDF longer than two pages or a sparsely populated trailing page.
- Broken semantic heading relationships or missing section labels.
- Horizontal page overflow at the supported mobile viewport.
- Source DOCX files added to version control or public assets.

## Test-First Verification Design

Implementation must follow red-green-refactor cycles.

Automated coverage will assert:

1. The canonical data contains the exact approved consulting metric and CDW association.
2. All four technical-depth groups are present in the approved order.
3. CDW and NextStep contain the approved new accomplishment themes without customer names or internal ratings.
4. CMTrace Open is present with stable links and no dynamic star count.
5. The 2025 Endpoint Administrator credential uses `Earned August 2025` wording.
6. Public contact data contains only the approved email, GitHub, and LinkedIn fields.
7. The Astro page renders the new sections with the required heading and ARIA relationships and still publishes no executable scripts or hydration markup.
8. A fresh deterministic PDF exactly matches the committed PDF, contains the new content in ATS-readable order, has scrubbed metadata, and is one or two well-populated pages.
9. The production build copies the PDF to the stable public URL and contains no forbidden paths or source artifacts.

Manual verification will include:

- A production build.
- Desktop and 320-pixel mobile browser inspection for hierarchy, spacing, focus, and overflow.
- Keyboard-order and no-client-JavaScript checks.
- Rendering every PDF page to PNG and inspecting each page at 100 percent zoom.
- PDF text extraction, reading-order review, and metadata inspection.
- A final source-artifact and privacy audit before commit.

## Acceptance Criteria

The expansion is complete when:

- The page visibly includes the approved consulting metric, technical-depth groups, expanded experience, CMTrace Open, and 2025 credential.
- Customer names, internal ratings, alternate email addresses, and other forbidden values are absent from published output.
- The additional content strengthens both senior endpoint-engineering and consulting-leadership positioning without becoming repetitive or keyword-heavy.
- The page remains static, accessible, responsive, and visually consistent with the existing site.
- The synchronized PDF is deterministic, ATS-readable, visually clean, and no longer than two pages.
- Focused tests, the full production build, browser checks, PDF inspection, and privacy audits pass.

## Expected Repository Changes

- `src/data/resume.json`
- `src/pages/resume.astro`
- `scripts/generate-resume-pdf.py`
- `public/resume/adam-gell-resume.pdf`
- `tests/resume-data.test.mjs`
- `tests/resume-page.test.mjs`
- `tests/test_resume_pdf.py`

No unrelated site files should change.
