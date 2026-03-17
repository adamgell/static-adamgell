/**
 * crawl-direct.js
 * Scrapes silentinstallhq.com using direct HTTP + cheerio (no Firecrawl needed).
 * Reads URLs from data/silentinstall-url-index.json (1701 entries).
 * Resume-safe: skips slugs that already have a JSON file in data/apps/.
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from 'fs';
import https from 'https';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATA_DIR      = resolve(__dirname, '../data/apps');
const URL_INDEX     = resolve(__dirname, '../data/silentinstall-url-index.json');
const COMBINED_FILE = resolve(__dirname, '../data/apps-combined.json');

const CONCURRENCY       = Number.parseInt(process.env.SCRAPE_CONCURRENCY ?? '10', 10);
const REQUEST_DELAY_MS  = Number.parseInt(process.env.SCRAPE_DELAY_MS ?? '500', 10);
const FETCH_TIMEOUT_MS  = Number.parseInt(process.env.SCRAPE_TIMEOUT_MS ?? '15000', 10);
const MAX_RETRIES       = Number.parseInt(process.env.SCRAPE_MAX_RETRIES ?? '3', 10);
const BACKOFF_BASE_MS   = Number.parseInt(process.env.SCRAPE_BACKOFF_MS ?? '10000', 10);
const REFRESH_EXISTING  = process.argv.includes('--refresh-existing') || process.env.REFRESH_EXISTING === '1';
const agent = new https.Agent({ keepAlive: true, maxSockets: CONCURRENCY });

// ---------------------------------------------------------------------------
// Token bucket — shared across workers to stay polite (~40 req/min max)
// ---------------------------------------------------------------------------
const tokenQueue = [];
let tokenTimer = null;
let globalPauseUntil = 0;

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
  tokenTimer = setTimeout(drainTokens, REQUEST_DELAY_MS);
}

async function waitForGlobalPause() {
  const waitMs = globalPauseUntil - Date.now();
  if (waitMs > 0) {
    await sleep(waitMs);
  }
}

// ---------------------------------------------------------------------------

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  if (!existsSync(URL_INDEX)) {
    console.error('ERROR: data/silentinstall-url-index.json not found. Run the masterpackager indexer first.');
    process.exit(1);
  }

  const index = JSON.parse(readFileSync(URL_INDEX, 'utf8'));
  const allUrls = index.map(e => e.url).filter(Boolean);
  console.log(`📋 URL index: ${allUrls.length} URLs`);

  const pending = allUrls.filter(url => {
    const slug = deriveSlug(url);
    return slug && (REFRESH_EXISTING || !existsSync(resolve(DATA_DIR, `${slug}.json`)));
  });

  const done = REFRESH_EXISTING ? 0 : allUrls.length - pending.length;
  console.log(
    REFRESH_EXISTING
      ? `🔄 Refreshing all ${pending.length} URLs`
      : `⏭️  ${done} already done, ${pending.length} remaining`
  );
  console.log(`🚀 ${CONCURRENCY} workers, shared bucket 1 req per ${REQUEST_DELAY_MS}ms (~${Math.round(60000 / REQUEST_DELAY_MS)} req/min total)\n`);

  if (pending.length === 0) {
    console.log('✅ Nothing to do!');
    writeCombined();
    return;
  }

  const queue = [...pending];
  const stats = { created: 0, updated: 0, skipped: 0, failed: 0, processed: 0 };

  const heartbeat = setInterval(() => {
    const pct = ((stats.processed / pending.length) * 100).toFixed(1);
    console.log(`📊 ${stats.processed}/${pending.length} (${pct}%) — ✨${stats.created} new, ⏭️${stats.skipped} skipped, ❌${stats.failed} failed | queue: ${queue.length}`);
  }, 15000);

  const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1, queue, stats));
  await Promise.all(workers);

  clearInterval(heartbeat);
  if (tokenTimer) clearTimeout(tokenTimer);

  writeCombined();
  console.log(`\n✅ Done — ${stats.created} new, ${stats.updated} updated, ${stats.skipped} skipped, ${stats.failed} failed`);
  if (stats.failed > 0) process.exit(1);
}

async function worker(id, queue, stats) {
  const tag = `[W${id}]`;

  while (queue.length > 0) {
    const url = queue.shift();
    if (!url) break;

    await acquireToken();
    await waitForGlobalPause();

    let html = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch(url, {
          agent,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SilentInstallBot/1.0)' },
          timeout: FETCH_TIMEOUT_MS,
        });
        if (res.status === 429) {
          const wait = BACKOFF_BASE_MS * attempt;
          globalPauseUntil = Date.now() + wait;
          console.warn(`${tag} 429 — pausing all workers for ${wait / 1000}s`);
          await sleep(wait);
          continue;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        html = await res.text();
        break;
      } catch (err) {
        console.warn(`${tag} attempt ${attempt} error on ${url}: ${err.message?.slice(0, 80)}`);
        if (attempt < MAX_RETRIES) {
          await sleep(BACKOFF_BASE_MS * attempt);
          await waitForGlobalPause();
        }
        else { console.error(`${tag} ❌ Gave up: ${url}`); stats.failed++; }
      }
    }

    if (!html) { stats.processed++; continue; }

    const app = parseHtml(html, url);
    if (!app || app.variants.length === 0) {
      stats.skipped++;
      stats.processed++;
      continue;
    }

    const outFile = resolve(DATA_DIR, `${app.slug}.json`);
    const isNew = !existsSync(outFile);

    if (!isNew) {
      const existing = JSON.parse(readFileSync(outFile, 'utf8'));
      if (existing.psadtScript) app.psadtScript = existing.psadtScript;
      const strip = o => JSON.stringify({ ...o, lastScraped: '' });
      if (strip(existing) !== strip(app)) stats.updated++;
      else app.lastScraped = existing.lastScraped;
    } else {
      stats.created++;
      console.log(`${tag} ✨ ${app.title}`);
    }

    writeFileSync(outFile, JSON.stringify(app, null, 2) + '\n');
    stats.processed++;
  }
}

// ---------------------------------------------------------------------------
// HTML parser — extracts install tables from WordPress post content
// ---------------------------------------------------------------------------
function parseHtml(html, url) {
  const $ = cheerio.load(html);
  const slug = deriveSlug(url);
  if (!slug) return null;

  const title = normalizeTitle($('h1.entry-title, h1.wp-block-post-title, h1').first().text());

  const variants = [];

  $('table').each((_, table) => {
    const rows = {};
    $(table).find('tr').each((_, tr) => {
      const cells = $(tr).find('td');
      if (cells.length < 2) return;
      const key = $(cells[0]).text().trim().toLowerCase().replace(/:$/, '');
      rows[key] = {
        text: $(cells[1]).text().trim(),
        href: $(cells[1]).find('a').first().attr('href')?.trim() ?? null,
      };
    });

    const installCmd = getRowText(rows, 'silent install switch', 'silent install');
    const uninstallCmd = getRowText(rows, 'silent uninstall switch', 'silent uninstall');
    if (!installCmd) return;

    const rawArchitecture = getRowText(rows, 'architecture');
    const installerType = getRowText(rows, 'installer type', 'type');
    const vendor = getRowText(rows, 'vendor', 'software vendor');
    const softwareTitle = getRowText(rows, 'software title') || title;
    const repair = getRowText(rows, 'repair command');
    const downloadUrl = getRowHref(rows, 'download link');
    const psScriptUrl = getRowHref(rows, 'powershell script');
    const detectionScriptUrl = getRowHref(rows, 'detection script');

    variants.push({
      architecture: normalizeArchitecture(rawArchitecture, installCmd, uninstallCmd, softwareTitle),
      installerType,
      vendor,
      softwareTitle,
      silentInstall: cleanCmd(installCmd),
      silentUninstall: cleanCmd(uninstallCmd),
      repair: repair ? cleanCmd(repair) : null,
      downloadUrl,
      psScriptUrl,
      detectionScriptUrl,
      logInstall: null,
      logUninstall: null,
    });
  });

  if (variants.length === 0) return null;

  const vendor = variants[0].vendor || '';

  return {
    slug,
    title: title || variants[0].softwareTitle,
    vendor,
    sourceUrl: url,
    lastScraped: new Date().toISOString(),
    variants: variants.map(v => ({
      architecture: v.architecture,
      installerType: v.installerType,
      silentInstall: v.silentInstall,
      silentUninstall: v.silentUninstall,
      repair: v.repair,
      downloadUrl: v.downloadUrl,
      psScriptUrl: v.psScriptUrl,
      detectionScriptUrl: v.detectionScriptUrl,
      logInstall: v.logInstall,
      logUninstall: v.logUninstall,
    })),
    psadtScript: null,
  };
}

function cleanCmd(cmd) {
  return cmd.replace(/\*\*/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
}

function getRowText(rows, ...keys) {
  for (const key of keys) {
    if (rows[key]?.text) return rows[key].text;
  }
  return '';
}

function getRowHref(rows, ...keys) {
  for (const key of keys) {
    if (rows[key]?.href) return rows[key].href;
  }
  return null;
}

function normalizeTitle(value) {
  return value
    .trim()
    .replace(/\s*\((how[- ]to guide|install guide)\)\s*$/i, '')
    .replace(/\s+silent install(?:\/uninstall)?\s*$/i, '')
    .replace(/\s*[-–]\s*silent install.*$/i, '')
    .replace(/\s+how[- ]to guide\s*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeArchitecture(rawValue, installCmd, uninstallCmd, softwareTitle) {
  const value = (rawValue || '')
    .trim()
    .toLowerCase()
    .replace(/\\/g, '')
    .replace(/_/g, '/')
    .replace(/\s+/g, ' ');
  if (value === 'x86' || value === '32-bit' || value === '32 bit') return 'x86';
  if (value === 'x64' || value === '64-bit' || value === '64 bit') return 'x64';
  if (value === 'arm64' || value === 'aarch64') return 'arm64';
  if (value === 'x86/x64' || value === 'x64/x86' || value === 'x86 / x64' || value === 'x64 / x86') return 'x86/x64';
  if (value === 'all' || value === 'neutral' || value === 'any') return 'All';
  if (value) return rawValue.trim().replace(/\\/g, '');

  const haystack = `${installCmd} ${uninstallCmd} ${softwareTitle}`.toLowerCase();
  const hasX86 = /\bx86\b|32-bit|32 bit|win32/.test(haystack);
  const hasX64 = /\bx64\b|64-bit|64 bit|win64/.test(haystack);
  const hasArm64 = /\barm64\b|\baarch64\b/.test(haystack);
  if (hasArm64) return 'arm64';
  if (hasX86 && hasX64) return 'x86/x64';
  if (hasX64) return 'x64';
  if (hasX86) return 'x86';
  return '';
}

function deriveSlug(url) {
  try {
    const segment = new URL(url).pathname.replace(/\/$/, '').split('/').pop() ?? '';
    return segment
      .replace(/-silent-install.*$/i, '').replace(/-how-to.*$/i, '').replace(/-install.*$/i, '')
      .toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  } catch { return null; }
}

function writeCombined() {
  const files = readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
  const apps = files
    .map(f => JSON.parse(readFileSync(resolve(DATA_DIR, f), 'utf8')))
    .sort((a, b) => a.title.localeCompare(b.title));
  writeFileSync(COMBINED_FILE, JSON.stringify({ generatedAt: new Date().toISOString(), count: apps.length, apps }, null, 2) + '\n');
  console.log(`📦 Wrote apps-combined.json (${apps.length} apps)`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main();
