import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

import FirecrawlApp from '@mendable/firecrawl-js';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { parseArticle } from './parse.js';

const DATA_DIR = resolve(__dirname, '../data/apps');
const PS_INDEX = 'https://silentinstallhq.com/powershell-scripts/';
const DELAY_MS = 6000;
const MAX_RETRIES = 4;
const BACKOFF_BASE_MS = 15000;

async function main() {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) { console.error('ERROR: FIRECRAWL_API_KEY not set'); process.exit(1); }

  const fc = new FirecrawlApp({ apiKey });

  console.log('🔍 Scraping PowerShell scripts index (JS-rendered)…');
  const indexResult = await fc.scrapeUrl(PS_INDEX, {
    formats: ['markdown'],
    waitFor: 3000,
  });

  if (!indexResult.success || !indexResult.markdown) {
    console.error('Failed to scrape index page'); process.exit(1);
  }

  // Parse the DataTable: | Vendor | Title | [DETAILS](url) |
  const psUrls = extractPsUrls(indexResult.markdown);
  console.log(`   Found ${psUrls.length} PS script articles`);

  let updated = 0, notFound = 0, failed = 0;

  for (let i = 0; i < psUrls.length; i++) {
    const { url } = psUrls[i];
    console.log(`\n[${i + 1}/${psUrls.length}] ${url}`);

    try {
      let result = null;
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          result = await fc.scrapeUrl(url, { formats: ['html'] });
          break;
        } catch (err) {
          const waitMs = BACKOFF_BASE_MS * attempt;
          if (attempt < MAX_RETRIES) {
            console.warn(`  ⚠️  Error (attempt ${attempt}/${MAX_RETRIES}) — waiting ${waitMs / 1000}s… ${err.message}`);
            await sleep(waitMs);
          } else throw err;
        }
      }

      if (!result?.success || !result.html) {
        console.warn('  ⚠️  No HTML returned, skipping');
        failed++;
        continue;
      }

      const script = extractPsadtScript(result.html);
      if (!script) {
        console.warn('  ⚠️  No PSADT script block found, skipping');
        failed++;
        continue;
      }

      // Find the matching app JSON by slug derived from this URL
      const slug = slugFromPsUrl(url);
      const appFile = resolve(DATA_DIR, `${slug}.json`);

      if (!existsSync(appFile)) {
        console.warn(`  ⚠️  No app JSON for slug "${slug}", skipping`);
        notFound++;
        continue;
      }

      const app = JSON.parse(readFileSync(appFile, 'utf8'));

      if (app.psadtScript === script) {
        console.log('  ✓ Unchanged');
        continue;
      }

      app.psadtScript = script;
      app.lastScraped = new Date().toISOString();
      writeFileSync(appFile, JSON.stringify(app, null, 2) + '\n');
      console.log(`  ✨ Saved PSADT script (${script.length} chars) → ${slug}.json`);
      updated++;

    } catch (err) {
      console.error(`  ❌ Error: ${err.message}`);
      failed++;
    }

    if (i < psUrls.length - 1) await sleep(DELAY_MS);
  }

  console.log(`\n✅ Done — ${updated} updated, ${notFound} no matching app, ${failed} failed`);
}

/**
 * Extract PSADT script from HTML — it lives in the first large <pre> block.
 * The content is HTML-entity-encoded, so we decode it.
 */
function extractPsadtScript(html) {
  const preMatches = [...html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/gi)];
  for (const m of preMatches) {
    const text = decodeHtmlEntities(m[1].replace(/<[^>]+>/g, ''));
    // Must look like a PSADT script: starts with <# or has recognizable markers
    if (text.length > 500 && (text.includes('.SYNOPSIS') || text.includes('Execute-Process') || text.includes('AppDeployToolkit'))) {
      return text.trim();
    }
  }
  return null;
}

/**
 * Parse the JS-rendered DataTable markdown to extract all DETAILS URLs.
 * Table rows look like: | Vendor | Title | [**DETAILS**](url) |
 */
function extractPsUrls(markdown) {
  const urls = [];
  for (const line of markdown.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    if (/^[\s|:-]+$/.test(line.trim())) continue;
    const urlMatch = line.match(/\[.*?DETAILS.*?\]\((https?:\/\/[^)]+)\)/i);
    if (urlMatch) urls.push({ url: urlMatch[1].replace(/\/$/, '') });
  }
  return urls;
}

/**
 * Derive the app slug from a PS script URL.
 * e.g. https://silentinstallhq.com/net-core-desktop-runtime-3-0-install-and-uninstall-powershell
 *   → net-core-desktop-runtime-3-0
 */
function slugFromPsUrl(url) {
  try {
    const segment = new URL(url).pathname.replace(/\/$/, '').split('/').pop() ?? '';
    return segment
      .replace(/-install-and-uninstall-powershell$/i, '')
      .replace(/-silent-uninstall-powershell$/i, '')
      .replace(/-install-powershell$/i, '')
      .toLowerCase();
  } catch { return 'unknown'; }
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

main();
