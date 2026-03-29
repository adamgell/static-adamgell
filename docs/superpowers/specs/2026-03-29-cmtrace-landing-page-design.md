# CMTrace Open Landing Page Design

## Context

CMTrace Open is a Tauri-powered cross-platform log analyzer built by Adam. Currently it only has an external GitHub link on the tools page. This spec adds a dedicated landing page with a blog/content section so Adam can publish posts about the project.

## What We're Building

A dedicated page at `/tools/cmtrace` with:
1. A hero/overview section describing the project
2. A content feed showing blog posts from a CMTrace-specific content collection
3. Individual post pages at `/tools/cmtrace/[slug]`

## Content Collection

**New collection:** `cmtrace` in `src/content/cmtrace/`

**Schema** (mirrors the existing `blog` collection):
```
title: string (required)
description: string (optional)
date: date (required)
draft: boolean (default: false)
```

**Config change:** Add `cmtrace` collection to `src/content.config.ts` alongside the existing `blog` collection.

## Pages

### `/tools/cmtrace` — Landing Page

**File:** `src/pages/tools/cmtrace/index.astro`

**Sections:**
1. **Hero** — Project name, tagline ("A modern, cross-platform log analyzer"), brief feature highlights, links to GitHub repo and releases
2. **Content feed** — Lists all non-draft cmtrace posts sorted by date (newest first). Each entry shows date, title, description. Links to `/tools/cmtrace/[slug]`.

**Style:** Matches existing site dark theme (slate-950 bg, slate-100 text). Similar card style to tools index page.

### `/tools/cmtrace/[slug]` — Individual Post Page

**File:** `src/pages/tools/cmtrace/[slug].astro`

**Layout:** Same pattern as `/blog/[slug].astro` — renders MD/MDX content with prose styling, shows title and date. Back link to `/tools/cmtrace`.

## Tools Page Update

**File:** `src/pages/tools/index.astro`

Change the CMTrace card from an external GitHub link to an internal link pointing to `/tools/cmtrace`. Remove the external link icon.

## Files to Create/Modify

| Action | File |
|--------|------|
| Create | `src/content/cmtrace/` (directory) |
| Create | `src/pages/tools/cmtrace/index.astro` |
| Create | `src/pages/tools/cmtrace/[slug].astro` |
| Modify | `src/content.config.ts` (add cmtrace collection) |
| Modify | `src/pages/tools/index.astro` (update CMTrace card link) |
| Create | One sample post in `src/content/cmtrace/` for testing |

## Verification

1. Dev server runs without errors
2. `/tools/cmtrace` renders hero + content feed
3. Sample post renders at `/tools/cmtrace/<slug>`
4. Tools index CMTrace card links to `/tools/cmtrace`
5. Navigation and back links work correctly
