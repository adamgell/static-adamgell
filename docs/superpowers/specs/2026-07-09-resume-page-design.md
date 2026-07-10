# Resume Page and Download Design

Date: 2026-07-09

## Summary

Add a complete, native `/resume` page to `adamgell.com` and publish a matching downloadable PDF at the stable URL `/resume/adam-gell-resume.pdf`. The experience will present Adam as both a senior Microsoft Intune and endpoint-management consultant and a consulting leader who can guide clients and contribute to practice development.

The page will follow the site's established dark slate visual language. The PDF will use the same approved content in a restrained, single-column, ATS-readable design. The source files supplied for this work will not be published directly.

## Source Assessment

`Resume_2024_v5.docx` is the authoritative factual source despite its filename. It was modified on 2026-06-29 and contains the current CDW role, more recent platform experience, and the most complete work history.

`Resume_2022_v4.pdf` is not suitable for publication. It is outdated, omits the CDW role, lists an earlier role as current, and exposes a residential street address. It will not be copied into the repository or linked from the site.

The newer DOCX will be treated as source evidence, not as a publishable artifact. Its wording will be rewritten substantially into a modern, achievement-focused narrative, while every claim remains traceable to the supplied resume or existing site information. No metrics or accomplishments may be invented.

## Goals

- Give visitors a readable, mobile-friendly resume page without requiring a PDF viewer.
- Provide a conventional downloadable PDF for recruiters and applicant systems.
- Position Adam for senior Microsoft Intune and endpoint-management consulting roles while also signaling client leadership, pre-sales contribution, and consulting-practice impact.
- Make the resume discoverable from both the shared navigation and homepage.
- Keep the HTML page and PDF synchronized through one structured source of content.
- Prevent publication of private or unnecessary identifiers.
- Preserve the existing site's restrained visual identity while giving the resume one distinctive, subject-specific signature element.

## Non-goals

- Do not publish either supplied source file unchanged.
- Do not embed a browser PDF viewer or make an iframe the primary experience.
- Do not add a content-management system, database, contact form, analytics event, or client-side resume application.
- Do not invent customer names, project details, percentages, team sizes, savings, revenue, or other unsupported metrics.
- Do not redesign unrelated blog, tools, or CMTrace pages.

## Audience and Positioning

The primary audience is hiring managers, recruiters, consulting leaders, and client stakeholders evaluating Adam for senior Microsoft Intune or endpoint-management consulting work with leadership expectations.

The narrative must balance two signals:

1. Deep endpoint-management delivery experience across Microsoft Intune, Windows Autopilot, Microsoft Entra ID, Windows 365, Intune Suite capabilities, endpoint security, and PowerShell automation.
2. Consulting leadership through assessment, roadmap creation, solution design, client guidance, pre-sales discovery, technical recommendations, and repeatable delivery practices.

The approved headline is:

> Microsoft endpoint strategy, from assessment to adoption.

The supporting summary will state plainly that Adam turns complex endpoint requirements into secure, supportable Microsoft Intune programs by combining hands-on engineering, client advisory, and practice-level insight.

## Content Architecture

The web page and PDF use the same content hierarchy:

1. Name, current professional positioning, and public contact links.
2. Professional summary.
3. Three impact pillars:
   - Cross-platform endpoint delivery.
   - Trusted client advisory.
   - Consulting-practice contribution.
4. Core expertise grouped around endpoint strategy, Intune engineering, and consulting leadership.
5. Professional experience in reverse chronological order:
   - CDW, Managing Consultant Engineer, June 2022 to present.
   - Applied Microsystems, Senior Systems Engineer, January 2022 to April 2022.
   - NextStep Technology Advisors, IT Consultant, October 2013 to December 2021.
6. Education and selected relevant credentials:
   - AAS in Information Systems Administration, ITT Technical School Online, 2011.
   - Microsoft 365 Identity and Services (MS-100), 2021.
   - Microsoft Certified Professional, 2014, without the credential identifier.
   - Datto Certified Advanced Technician, 2014.
7. Email, GitHub, and LinkedIn links.

CDW receives the strongest treatment because it is current and most directly supports the target role. Its bullets will emphasize assessments, target-state recommendations, multi-platform Intune delivery, Intune Suite capabilities, pre-sales contribution, and PowerShell automation.

Applied Microsystems remains concise and demonstrates security leadership, vulnerability-management work, operational improvement, and client-base governance.

NextStep demonstrates consulting breadth and supported scale, including work across more than 40 clients, four Azure migrations, more than 15 modern-management transitions, CIO-style advisory, endpoint security, and VDI experience.

Product names will be normalized to current terminology where doing so does not change historical meaning. Examples include `Microsoft Entra ID`, `Microsoft Intune`, `Windows Autopilot`, `Azure Virtual Desktop`, and `PowerShell`.

## Canonical Data and Generation Flow

A structured JSON file at `src/data/resume.json` will be the repository's canonical resume content. It will hold public contact links, positioning copy, impact pillars, expertise groups, roles, education, and selected certifications.

`src/pages/resume.astro` will import this JSON and render the semantic HTML page. A small PDF-generation script at `scripts/generate-resume-pdf.py` will read the same JSON and write `public/resume/adam-gell-resume.pdf`. PDF generation is an explicit maintenance step, not a production runtime dependency.

This boundary gives each unit one purpose:

- `src/data/resume.json`: approved facts and wording.
- `src/pages/resume.astro`: accessible web presentation.
- `scripts/generate-resume-pdf.py`: ATS-readable downloadable representation.
- `public/resume/adam-gell-resume.pdf`: committed static download.

The generated PDF must never be edited manually. Content changes start in the JSON file, then regenerate the PDF and rerun verification.

## Web Page Design

The page will use the site's existing `BaseLayout`, slate background, restrained border treatment, rounded cards, and `max-w-5xl` shell. It will add a sky-blue accent used sparingly for labels, links, and the signature element.

The hero contains:

- A precise role label identifying Microsoft Intune and endpoint-management focus.
- The approved headline.
- A concise professional summary.
- Primary `Download resume (PDF)` and secondary `Email Adam` actions.

The signature element is a compact consulting lifecycle:

`Assess -> Design -> Deliver -> Adopt`

This is not decorative numbering. It encodes the actual advisory and delivery lifecycle described by the resume. On narrow screens, it collapses into a simple vertical or wrapped sequence without changing reading order.

Below the hero, three impact pillars create a quick scan of cross-platform delivery, client advisory, and practice contribution. Core expertise uses restrained cards. Experience uses a semantic chronological presentation with dates, employer, title, and concise achievement bullets. Education and selected certifications close the page.

The page will not duplicate the visual appearance of a white sheet of paper. It is a native web experience designed for responsive reading, keyboard navigation, screen readers, and search indexing.

## PDF Design

The PDF will be US Letter portrait, single-column, and limited to two pages. It will use a white background, dark navy text and headings, conservative typography, selectable text, and normal document reading order.

The PDF will avoid sidebars, skill meters, icons standing in for text, multi-column experience blocks, and dense decorative furniture that can interfere with applicant systems. Contact links will use readable labels and visible destinations.

The PDF content mirrors the web page but may use slightly shorter line lengths and bullets to fit the document format. It must not omit or add factual claims relative to the canonical JSON.

The final PDF must have no personal author, editor, source-path, or source-filename metadata. Generic producer metadata may remain only if the toolchain cannot remove it without damaging the document. The final artifact must be renamed `adam-gell-resume.pdf`, independent of year, so existing links remain valid after future updates.

## Navigation and Discovery

- Add `Resume` to the shared `BaseLayout` navigation.
- Adjust the compact navigation so it remains usable without horizontal page overflow at 320 CSS pixels.
- Add a resume entry point to the homepage that matches the existing bordered-card language and gives the page equal discoverability with Tools and Blog.
- Use `/resume` as the page URL and `/resume/adam-gell-resume.pdf` as the download URL.
- Keep the PDF secondary to the native web page; do not embed it.

## Privacy and Publishing Rules

The following values must not appear in `src/data/resume.json`, generated HTML, built output, or PDF text/metadata:

- The phone number from the supplied resumes.
- The residential street address from the 2022 PDF.
- The Microsoft credential identifier `F009-7864`.
- Local OneDrive paths or original source filenames.

Public contact details are limited to:

- `me@adamgell.com`
- `https://github.com/adamgell`
- `https://linkedin.com/in/adamgell`

The original DOCX and old PDF remain outside the repository and are never copied into `public/`.

## Accessibility and SEO

- Use one `h1` and a logical `h2`/`h3` hierarchy.
- Represent roles, expertise, and achievements with semantic headings, lists, links, and time text rather than presentational tables.
- Give every action descriptive text; do not use raw URLs as the only accessible name.
- Preserve visible keyboard focus and sufficient contrast.
- Respect reduced-motion preferences; the design requires no essential animation.
- Add a specific page title, meta description, and relevant keywords through `BaseLayout`.
- Use normal same-origin PDF download behavior and include the file type in the link label.
- Keep the HTML page as the accessible primary source because the generated PDF is optimized primarily for conventional download and ATS parsing.

## Runtime Behavior and Failure Handling

The resume experience is static and requires no client-side JavaScript. There are no loading, empty, authentication, or network states beyond normal static asset delivery.

If an external profile is temporarily unavailable, the resume content remains complete and the email link remains available. External links open safely with `rel="noopener noreferrer"` where they open a new tab.

A missing or zero-byte PDF is a release-blocking build/verification failure. The HTML page remains readable if a visitor reaches it during an external asset-delivery problem, but the implementation is not considered complete until the PDF URL succeeds.

## Verification Plan

Implementation verification must include:

1. Run the existing production build with `npm run build`.
2. Run focused automated checks for the resume data and built output:
   - Required sections and current role are present.
   - Only the approved public contact fields exist.
   - Forbidden phone, address, credential ID, local paths, and source filenames are absent.
   - The PDF exists and is non-empty at the stable URL.
3. Inspect `/resume` in a real browser at desktop and mobile widths, including 320 CSS pixels.
4. Check keyboard order, focus visibility, headings, link labels, and contrast.
5. Verify navigation and homepage links to `/resume` and the PDF download.
6. Render every page of the final PDF to PNG and visually inspect at 100 percent zoom for clipping, overlap, poor page breaks, missing glyphs, or cramped spacing.
7. Extract PDF text and confirm correct reading order and complete supported content.
8. Inspect PDF metadata and repeat the forbidden-value search against PDF text and metadata.
9. Confirm no source DOCX or obsolete PDF was added to the repository.

## Acceptance Criteria

The work is complete when:

- `/resume` builds and matches the approved consultant-plus-practice-lead direction.
- The page is discoverable from the shared navigation and homepage.
- The page works at desktop and mobile widths without horizontal page overflow.
- The rewritten content targets senior Intune consulting and consulting leadership without unsupported claims.
- `adam-gell-resume.pdf` downloads successfully, is ATS-readable, and visually passes inspection on every page.
- HTML and PDF are generated from the same canonical data.
- Phone number, street address, credential ID, source paths, original filenames, and personal author/editor metadata are absent from all published output.
- The production build and focused automated checks pass.

## Expected Repository Changes

- `src/data/resume.json`
- `src/pages/resume.astro`
- `src/layouts/BaseLayout.astro`
- `src/pages/index.astro`
- `scripts/generate-resume-pdf.py`
- `public/resume/adam-gell-resume.pdf`
- Focused automated verification files or scripts required to enforce the acceptance criteria.

No other site areas should change unless a small shared-navigation adjustment is required for responsive behavior.
