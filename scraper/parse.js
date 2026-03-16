import { emptyApp, emptyVariant } from './schema.js';

/**
 * Given the full markdown content of a silentinstallhq.com article,
 * extract structured app data.
 *
 * Strategy:
 *  - H1 → app title
 *  - Markdown tables that contain "Silent Install Switch" rows are info tables
 *  - Multiple info tables in one article = multiple variants (e.g. x86 + x64)
 *  - Log-command tables (single-column) are captured as logInstall / logUninstall
 *
 * @param {string} markdown  - Raw markdown from Firecrawl
 * @param {string} sourceUrl - Article URL
 * @returns {import('./schema.js').AppRecord}
 */
export function parseArticle(markdown, sourceUrl) {
  const slug = slugify(sourceUrl);
  const app = emptyApp(slug, sourceUrl);

  // --- Title from H1 ---
  const h1 = markdown.match(/^#\s+(.+)$/m);
  if (h1) app.title = h1[1].trim();

  // --- Split into blocks and find info tables ---
  // Info tables contain rows like "| Silent Install Switch | ... |"
  const variantTables = extractVariantTables(markdown);

  for (const table of variantTables) {
    const variant = emptyVariant();

    variant.architecture     = cell(table, /^architecture$/i)      ?? '';
    variant.installerType    = cell(table, /^installer\s*type$/i)   ?? '';
    variant.silentInstall    = cell(table, /^silent\s*install\s*switch$/i) ?? '';
    variant.silentUninstall  = cell(table, /^silent\s*uninstall\s*switch$/i) ?? '';
    variant.repair           = cell(table, /^repair\s*command$/i)   ?? null;
    variant.downloadUrl      = cell(table, /^download\s*link$/i)    ?? null;
    variant.psScriptUrl      = cell(table, /^powershell\s*script$/i) ?? null;
    variant.detectionScriptUrl = cell(table, /^detection\s*script$/i) ?? null;

    // Vendor (often the same for all variants — grab from first one found)
    if (!app.vendor) {
      app.vendor = cell(table, /^vendor$/i) ?? null;
    }

    // Software title override from table (more specific than H1)
    const tableTitle = cell(table, /^software\s*title$/i);
    if (tableTitle && !app.title) app.title = tableTitle;

    // Strip markdown links from URL cells  →  extract bare URL
    variant.downloadUrl        = extractUrl(variant.downloadUrl);
    variant.psScriptUrl        = extractUrl(variant.psScriptUrl);
    variant.detectionScriptUrl = extractUrl(variant.detectionScriptUrl);

    // Strip inline code backticks from command cells
    variant.silentInstall   = stripCode(variant.silentInstall);
    variant.silentUninstall = stripCode(variant.silentUninstall);
    variant.repair          = variant.repair ? stripCode(variant.repair) : null;

    if (variant.silentInstall) {
      app.variants.push(variant);
    }
  }

  // --- Log commands ---
  // Look for single-column tables that contain install/uninstall log commands
  attachLogCommands(markdown, app);

  return app;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts 2-column info tables (key | value) that contain a
 * "Silent Install Switch" row.
 */
function extractVariantTables(markdown) {
  const tables = [];
  // Split on horizontal rules or back-to-back blank lines to find table blocks
  const blocks = markdown.split(/\n(?:\*\s*\*\s*\*|-{3,}|_{3,})\n/);

  for (const block of blocks) {
    const rows = parseTable(block);
    if (rows.length === 0) continue;
    const hasSilentInstall = rows.some(([k]) =>
      /silent\s*install\s*switch/i.test(k)
    );
    if (hasSilentInstall) tables.push(rows);
  }

  // Fallback: if no HR-split found, scan the whole doc
  if (tables.length === 0) {
    const rows = parseTable(markdown);
    const hasSilentInstall = rows.some(([k]) =>
      /silent\s*install\s*switch/i.test(k)
    );
    if (hasSilentInstall) tables.push(rows);
  }

  return tables;
}

/**
 * Parse a markdown table block into an array of [key, value] pairs.
 * Handles both 2-column and ignores separator rows.
 * @param {string} text
 * @returns {Array<[string, string]>}
 */
function parseTable(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    if (/^\|[-| :]+\|$/.test(trimmed)) continue; // separator row
    const cells = trimmed
      .split('|')
      .map(c => c.trim())
      .filter(c => c.length > 0);
    if (cells.length >= 2) {
      // Strip trailing colon from key (e.g. "Software Title:" → "Software Title")
      rows.push([cells[0].replace(/:$/, '').trim(), cells[1]]);
    }
  }
  return rows;
}

/**
 * Find the value for a given key pattern in a table row array.
 * @param {Array<[string,string]>} rows
 * @param {RegExp} keyPattern
 * @returns {string|null}
 */
function cell(rows, keyPattern) {
  const row = rows.find(([k]) => keyPattern.test(k));
  return row ? row[1] : null;
}

/**
 * Look for single-column tables (log command tables) and attach them
 * to the matching variant based on install/uninstall context in surrounding text.
 */
function attachLogCommands(markdown, app) {
  if (app.variants.length === 0) return;

  const lines = markdown.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    // Single-cell table row containing a command with /log
    if (line.startsWith('|') && /\/log/i.test(line)) {
      const cmd = stripCode(
        line.split('|').map(c => c.trim()).filter(Boolean)[0] ?? ''
      );
      if (!cmd) continue;

      // Determine context: look backwards for a heading
      const context = lines.slice(Math.max(0, i - 10), i).join(' ').toLowerCase();
      const isUninstall = /uninstall/i.test(context);
      const arch = /x86/i.test(cmd) ? 'x86' : /x64/i.test(cmd) ? 'x64' : null;

      const target = arch
        ? app.variants.find(v => v.architecture.toLowerCase() === arch)
        : app.variants[0];

      if (target) {
        if (isUninstall) target.logUninstall = cmd;
        else target.logInstall = cmd;
      }
    }
  }
}

/**
 * Extract the first URL from a markdown link `[text](url)` or return as-is.
 */
function extractUrl(value) {
  if (!value) return null;
  const match = value.match(/\[.*?\]\((https?:\/\/[^)]+)\)/);
  if (match) return match[1];
  if (/^https?:\/\//.test(value.trim())) return value.trim();
  return null;
}

/** Strip backtick code spans and bold/italic markdown markers. */
function stripCode(value) {
  if (!value) return value;
  return value
    .replace(/`([^`]+)`/g, '$1')   // `code`
    .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold**
    .replace(/\*([^*]+)\*/g, '$1')     // *italic*
    .trim();
}

/**
 * Derive a slug from an article URL.
 * e.g. https://silentinstallhq.com/net-core-desktop-runtime-3-0-silent-install-how-to-guide/
 *   -> net-core-desktop-runtime-3-0
 */
function slugify(url) {
  try {
    const path = new URL(url).pathname.replace(/\/$/, '');
    const segment = path.split('/').pop() ?? '';
    // Strip trailing "-silent-install-how-to-guide" and similar suffixes
    return segment
      .replace(/-silent-install.*$/i, '')
      .replace(/-how-to.*$/i, '')
      .replace(/-install.*$/i, '')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  } catch {
    return 'unknown';
  }
}
