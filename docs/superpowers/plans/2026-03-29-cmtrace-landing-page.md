# CMTrace Open Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated CMTrace Open landing page at `/tools/cmtrace` with a hero section and a blog content feed powered by a new Astro content collection.

**Architecture:** New `cmtrace` content collection mirrors the existing `blog` collection schema. Landing page at `/tools/cmtrace/index.astro` fetches collection entries and renders a hero + post list. Individual posts render at `/tools/cmtrace/[slug].astro` using the same prose styling pattern as `/blog/[slug].astro`.

**Tech Stack:** Astro 5, Tailwind CSS 4, Astro Content Collections (glob loader), MD/MDX

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/content.config.ts` | Add `cmtrace` collection |
| Create | `src/content/cmtrace/` | Directory for CMTrace posts |
| Create | `src/content/cmtrace/hello-cmtrace-open.md` | Sample post for testing |
| Create | `src/pages/tools/cmtrace/index.astro` | Landing page with hero + content feed |
| Create | `src/pages/tools/cmtrace/[slug].astro` | Individual post renderer |
| Modify | `src/pages/tools/index.astro` | Update CMTrace card to internal link |

---

### Task 1: Add cmtrace content collection

**Files:**
- Modify: `src/content.config.ts`

- [ ] **Step 1: Add the cmtrace collection to content config**

In `src/content.config.ts`, add a second collection alongside `blog`:

```typescript
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

const cmtrace = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/cmtrace" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog, cmtrace };
```

- [ ] **Step 2: Create the content directory and sample post**

Create `src/content/cmtrace/hello-cmtrace-open.md`:

```markdown
---
title: "Introducing CMTrace Open"
description: "A modern, cross-platform log analyzer built with Tauri."
date: 2026-03-29
draft: false
---

CMTrace Open is a modern, cross-platform replacement for the classic CMTrace log viewer. Built with Tauri, it runs on Windows, macOS, and Linux.

## Why CMTrace Open?

The original CMTrace is Windows-only and hasn't been updated in years. CMTrace Open brings log analysis into the modern era with a fast, native UI and cross-platform support.
```

- [ ] **Step 3: Verify dev server has no errors**

Run: Check preview server logs for errors.
Expected: No errors. The new collection is recognized.

- [ ] **Step 4: Commit**

```bash
git add src/content.config.ts src/content/cmtrace/hello-cmtrace-open.md
git commit -m "feat: add cmtrace content collection with sample post"
```

---

### Task 2: Create CMTrace landing page

**Files:**
- Create: `src/pages/tools/cmtrace/index.astro`

- [ ] **Step 1: Create the landing page**

Create `src/pages/tools/cmtrace/index.astro`:

```astro
---
import BaseLayout from "../../../layouts/BaseLayout.astro";
import { getCollection } from "astro:content";

const posts = await getCollection("cmtrace");
const sortedPosts = posts
  .filter((p) => !p.data.draft)
  .sort((a, b) => new Date(b.data.date).valueOf() - new Date(a.data.date).valueOf());
---

<BaseLayout title="CMTrace Open — Adam Gell" description="A modern, cross-platform, Tauri-powered log analyzer.">
  <div class="max-w-5xl mx-auto px-6 py-16">

    <!-- Hero -->
    <section class="mb-16">
      <h1 class="text-3xl font-bold tracking-tight mb-2">CMTrace Open</h1>
      <p class="text-slate-400 text-lg mb-6">
        A modern, cross-platform, Tauri-powered log analyzer that leaves the original CMTrace in the dust.
      </p>

      <div class="grid gap-4 sm:grid-cols-3 mb-8">
        <div class="border border-slate-800 rounded-lg p-4">
          <h3 class="text-sm font-semibold mb-1">Cross-Platform</h3>
          <p class="text-sm text-slate-400">Runs on Windows, macOS, and Linux.</p>
        </div>
        <div class="border border-slate-800 rounded-lg p-4">
          <h3 class="text-sm font-semibold mb-1">Modern UI</h3>
          <p class="text-sm text-slate-400">Fast, native interface built with Tauri.</p>
        </div>
        <div class="border border-slate-800 rounded-lg p-4">
          <h3 class="text-sm font-semibold mb-1">Open Source</h3>
          <p class="text-sm text-slate-400">Free and open source on GitHub.</p>
        </div>
      </div>

      <div class="flex gap-3">
        <a
          href="https://github.com/adamgell/cmtrace-open"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
          GitHub
        </a>
      </div>
    </section>

    <!-- Content Feed -->
    <section>
      <h2 class="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-5">
        Posts
      </h2>

      {sortedPosts.length === 0 ? (
        <p class="text-slate-400">Posts coming soon.</p>
      ) : (
        <ul class="space-y-4">
          {sortedPosts.map((post) => (
            <li>
              <a
                href={`/tools/cmtrace/${post.id}`}
                class="group block border border-slate-800 rounded-lg p-5 hover:border-slate-600 transition-colors"
              >
                <time class="text-xs text-slate-500">
                  {new Date(post.data.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </time>
                <h3 class="text-base font-semibold mt-1 group-hover:text-white transition-colors">
                  {post.data.title}
                </h3>
                {post.data.description && (
                  <p class="text-sm text-slate-400 mt-1">{post.data.description}</p>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  </div>
</BaseLayout>
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:4321/tools/cmtrace/`. Expected: Hero section renders with feature cards and GitHub link. Sample post appears in the content feed below.

- [ ] **Step 3: Commit**

```bash
git add src/pages/tools/cmtrace/index.astro
git commit -m "feat: add CMTrace Open landing page with hero and content feed"
```

---

### Task 3: Create CMTrace post page

**Files:**
- Create: `src/pages/tools/cmtrace/[slug].astro`

- [ ] **Step 1: Create the dynamic post page**

Create `src/pages/tools/cmtrace/[slug].astro`:

```astro
---
import BaseLayout from "../../../layouts/BaseLayout.astro";
import { getCollection, render } from "astro:content";

export async function getStaticPaths() {
  const posts = await getCollection("cmtrace");
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

const { post } = Astro.props;
const { Content } = await render(post);
---

<BaseLayout title={`${post.data.title} — CMTrace Open`} description={post.data.description}>
  <article class="max-w-3xl mx-auto px-6 py-16">
    <header class="mb-10">
      <a href="/tools/cmtrace" class="text-sm text-slate-500 hover:text-slate-300 transition-colors">
        &larr; CMTrace Open
      </a>
      <time class="block text-sm text-slate-500 mt-4">
        {new Date(post.data.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </time>
      <h1 class="text-3xl font-bold tracking-tight mt-2">{post.data.title}</h1>
    </header>

    <div class="prose prose-invert prose-zinc max-w-none">
      <Content />
    </div>
  </article>
</BaseLayout>
```

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:4321/tools/cmtrace/hello-cmtrace-open`. Expected: Post renders with back link, date, title, and prose-styled content.

- [ ] **Step 3: Commit**

```bash
git add src/pages/tools/cmtrace/[slug].astro
git commit -m "feat: add CMTrace individual post page"
```

---

### Task 4: Update tools index card

**Files:**
- Modify: `src/pages/tools/index.astro:55-70`

- [ ] **Step 1: Change CMTrace card from external to internal link**

In `src/pages/tools/index.astro`, replace the CMTrace external link card (lines 55-70) with an internal link card:

```astro
        <a
          href="/tools/cmtrace"
          class="group block border border-slate-800 rounded-lg p-5 hover:border-slate-600 transition-colors"
        >
          <h3 class="text-base font-semibold mb-1 group-hover:text-white transition-colors">
            CMTrace Open
          </h3>
          <p class="text-sm text-slate-400">
            A modern, cross‑platform, Tauri‑powered log analyzer that leaves the original CMTrace in the dust.
          </p>
        </a>
```

This removes the external link icon and `target="_blank"` since it's now an internal page.

- [ ] **Step 2: Verify in browser**

Navigate to `http://localhost:4321/tools/`. Click the CMTrace card. Expected: Navigates to `/tools/cmtrace` instead of opening GitHub.

- [ ] **Step 3: Commit**

```bash
git add src/pages/tools/index.astro
git commit -m "feat: update CMTrace card to link to internal landing page"
```

---

## Verification Checklist

- [ ] Dev server runs without errors
- [ ] `/tools/cmtrace` shows hero + sample post in feed
- [ ] `/tools/cmtrace/hello-cmtrace-open` renders the post with back link
- [ ] `/tools` CMTrace card links to `/tools/cmtrace` (no external icon)
- [ ] All navigation links work (back link, card click, nav bar)
