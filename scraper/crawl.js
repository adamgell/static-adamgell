import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import FirecrawlApp from '@mendable/firecrawl-js';
import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from 'fs';
import { parseArticle } from './parse.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

const DATA_DIR    = resolve(__dirname, '../data/apps');
const INDEX_FILE  = resolve(__dirname, '../data/index.json');
const COMBINED_FILE = resolve(__dirname, '../data/apps-combined.json');
const SITE_ORIGIN = 'https://silentinstallhq.com';

const CONCURRENCY  = 5;
// Token bucket: shared across all workers.
// Firecrawl free plan = ~10 req/min. With 5 concurrent, space them 12s apart
// so the bucket refills at ~5 req/min (conservative to avoid 429s).
// Adjust TOKEN_INTERVAL_MS down if you're on a paid plan with higher limits.
const TOKEN_INTERVAL_MS = 3000; // 1 token every 3s = ~20 req/min total across all workers
const MAX_RETRIES  = 4;
const BACKOFF_BASE = 20000; // 20s base backoff on 429

// ---------------------------------------------------------------------------
// Token bucket — workers call acquireToken() before each request.
// All 5 workers share this single queue, serialising their firing rate.
// ---------------------------------------------------------------------------
const tokenQueue = [];
let tokenTimer = null;

function acquireToken() {
  return new Promise(resolve => {
    tokenQueue.push(resolve);
    if (!tokenTimer) drainTokens();
  });
}

function drainTokens() {
  if (tokenQueue.length === 0) { tokenTimer = null; return; }
  const next = tokenQueue.shift();
  next();
  tokenTimer = setTimeout(drainTokens, TOKEN_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Global pause — set by any worker on 429, respected by all
// ---------------------------------------------------------------------------
let globalPauseUntil = 0;

async function waitForGlobalPause() {
  const wait = globalPauseUntil - Date.now();
  if (wait > 0) {
    await sleep(wait);
  }
}

// ---------------------------------------------------------------------------

async function main() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) { console.error('ERROR: FIRECRAWL_API_KEY not set'); process.exit(1); }

  const fc = new FirecrawlApp({ apiKey });
  mkdirSync(DATA_DIR, { recursive: true });

  // --- URL discovery (cached) ---
  let articleUrls;
  if (existsSync(INDEX_FILE)) {
    const cached = JSON.parse(readFileSync(INDEX_FILE, 'utf8'));
    articleUrls = cached.urls;
    console.log(`📋 Cached index: ${articleUrls.length} URLs (${cached.updatedAt})`);
  } else {
    console.log('🔍 Mapping site…');
    articleUrls = await discoverArticleUrls(fc);
    writeFileSync(INDEX_FILE, JSON.stringify({ updatedAt: new Date().toISOString(), urls: articleUrls }, null, 2));
    console.log(`   Saved ${articleUrls.length} URLs to index`);
  }

  // --- Skip already-done ---
  const pending = articleUrls.filter(url => {
    const slug = deriveSlug(url);
    return slug && !existsSync(resolve(DATA_DIR, `${slug}.json`));
  });

  const done = articleUrls.length - pending.length;
  console.log(`⏭️  ${done} done, ${pending.length} remaining`);
  console.log(`🚀 ${CONCURRENCY} workers, 1 token per ${TOKEN_INTERVAL_MS}ms (~${Math.round(60000/TOKEN_INTERVAL_MS)} req/min)\n`);

  const queue = [...pending];
  const stats = { created: 0, updated: 0, skipped: 0, failed: 0, processed: 0 };

  // Progress heartbeat every 30s
  const heartbeat = setInterval(() => {
    const pct = ((stats.processed / pending.length) * 100).toFixed(1);
    console.log(`📊 ${stats.processed}/${pending.length} (${pct}%) — ✨${stats.created} new, ⏭️${stats.skipped} skipped, ❌${stats.failed} failed | queue: ${queue.length}`);
  }, 15000);

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1, queue, fc, stats));
  await Promise.all(workers);

  clearInterval(heartbeat);
  if (tokenTimer) clearTimeout(tokenTimer);

  // Write combined JSON for the Astro site to fetch at build time
  writeCombined();

  console.log(`\n✅ Done — ${stats.created} new, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.failed} failed`);
  if (stats.failed > 0) process.exit(1);
}

async function worker(id, queue, fc, stats) {
  const tag = `[W${id}]`;

  while (queue.length > 0) {
    const url = queue.shift();
    if (!url) break;

    // Wait for a token slot (shared rate limiter)
    await acquireToken();
    // Respect any global 429 pause
    await waitForGlobalPause();

    let result = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        result = await fc.scrapeUrl(url, { formats: ['markdown'] });
        break;
      } catch (err) {
        const is429 = err.message?.includes('429') || err.statusCode === 429;
        const waitMs = BACKOFF_BASE * attempt;

        if (is429) {
          globalPauseUntil = Date.now() + waitMs;
          console.warn(`${tag} 429 — all workers paused ${waitMs / 1000}s`);
        } else {
          console.warn(`${tag} attempt ${attempt} error: ${err.message?.slice(0, 100)}`);
        }

        if (attempt < MAX_RETRIES) {
          await sleep(waitMs);
          await waitForGlobalPause();
        } else {
          console.error(`${tag} ❌ Gave up: ${url}`);
          stats.failed++;
        }
      }
    }

    if (!result?.success || !result.markdown) { stats.processed++; continue; }

    const app = parseArticle(result.markdown, url);
    if (app.variants.length === 0) { stats.skipped++; stats.processed++; continue; }

    const outFile = resolve(DATA_DIR, `${app.slug}.json`);
    const isNew = !existsSync(outFile);
    let finalApp = app;

    if (!isNew) {
      const existing = JSON.parse(readFileSync(outFile, 'utf8'));
      if (existing.psadtScript) app.psadtScript = existing.psadtScript;
      const strip = o => JSON.stringify({ ...o, lastScraped: '' });
      if (strip(existing) === strip(app)) { finalApp = existing; }
      else { stats.updated++; }
    } else {
      stats.created++;
      console.log(`${tag} ✨ ${app.title}`);
    }

    writeFileSync(outFile, JSON.stringify(finalApp, null, 2) + '\n');
    stats.processed++;
  }
}

async function discoverArticleUrls(fc) {
  const mapResult = await fc.mapUrl(SITE_ORIGIN, { includeSubdomains: false, limit: 2000 });
  return [...new Set((mapResult.links ?? []).filter(url => {
    try {
      const path = new URL(url).pathname;
      return path.length > 1 &&
        !path.startsWith('/category/') && !path.startsWith('/tag/') &&
        !path.startsWith('/author/')   && !path.startsWith('/page/') &&
        !/\.(png|jpg|jpeg|gif|svg|pdf|zip|xml|txt)$/i.test(path) &&
        (/silent-install/i.test(path) || /how-to-guide/i.test(path) || /install-and-uninstall/i.test(path));
    } catch { return false; }
  }))].sort();
}

function writeCombined() {
  const files = readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  const apps = files
    .map(f => JSON.parse(readFileSync(resolve(DATA_DIR, f), 'utf8')))
    .sort((a, b) => a.title.localeCompare(b.title));
  writeFileSync(COMBINED_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), count: apps.length, apps }, null, 2) + '\n');
  console.log(`📦 Wrote apps-combined.json (${apps.length} apps)`);
}

function deriveSlug(url) {
  try {
    const segment = new URL(url).pathname.replace(/\/$/, '').split('/').pop() ?? '';
    return segment
      .replace(/-silent-install.*$/i, '').replace(/-how-to.*$/i, '').replace(/-install.*$/i, '')
      .toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  } catch { return null; }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main();
