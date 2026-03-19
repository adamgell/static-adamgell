import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  existsSync,
  readdirSync,
} from 'fs';
import fetch from 'node-fetch';
import YAML from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));

const DATA_DIR = resolve(__dirname, '../data/winget');
const COMBINED_FILE = resolve(__dirname, '../data/winget-combined.json');
const PUBLIC_COMBINED_FILE = resolve(__dirname, '../public/winget-combined.json');
const CURATED_IDS_FILE = resolve(__dirname, '../data/winget-package-ids.json');

const WINGET_INDEX_URL =
  process.env.WINGET_INDEX_URL ??
  'https://raw.githubusercontent.com/svrooij/winget-pkgs-index/main/index.v2.json';
const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/microsoft/winget-pkgs/master/manifests';
const GITHUB_TREE_BASE =
  'https://github.com/microsoft/winget-pkgs/tree/master/manifests';

const REQUEST_TIMEOUT_MS = Number.parseInt(
  process.env.WINGET_REQUEST_TIMEOUT_MS ?? '20000',
  10
);
const DEFAULT_CONCURRENCY = Number.parseInt(
  process.env.WINGET_CONCURRENCY ?? '8',
  10
);

async function main() {
  mkdirSync(DATA_DIR, { recursive: true });

  const options = parseOptions(process.argv.slice(2));
  if (options.help) {
    printUsage();
    return;
  }

  console.log(`📦 Fetching winget index from ${WINGET_INDEX_URL}`);
  const index = await fetchJson(WINGET_INDEX_URL);
  const indexById = new Map(
    index
      .filter((entry) => entry?.PackageId)
      .map((entry) => [entry.PackageId, entry])
  );

  const packageIds = resolvePackageIds(index, options);
  if (packageIds.length === 0) {
    console.error('ERROR: No Winget package IDs were selected for import.');
    process.exit(1);
  }

  clearOutputDirectory();

  const stats = {
    mode: options.mode,
    selected: packageIds.length,
    targetWritten: options.targetWritten,
    written: 0,
    skipped: 0,
    missing: [],
    failed: [],
  };

  console.log(
    `🚀 Import mode: ${options.mode} · selected ${packageIds.length} package IDs · concurrency ${options.concurrency}`
  );
  if (options.targetWritten) {
    console.log(`🎯 Target written apps: ${options.targetWritten}`);
  }

  const apps = await processPackageIds(packageIds, indexById, stats, options);

  writeCombined(apps);

  console.log('\n✅ Winget import finished');
  console.log(`   Mode:      ${stats.mode}`);
  console.log(`   Selected:  ${stats.selected}`);
  console.log(`   Written:   ${stats.written}`);
  console.log(`   Skipped:   ${stats.skipped}`);
  console.log(`   Missing:   ${stats.missing.length}`);
  console.log(`   Failed:    ${stats.failed.length}`);

  if (stats.missing.length > 0) {
    console.log(`   Missing IDs: ${stats.missing.join(', ')}`);
  }

  if (stats.failed.length > 0) {
    process.exit(1);
  }
}

function parseOptions(argv) {
  const options = {
    mode: process.env.WINGET_IMPORT_MODE ?? 'all',
    limit: parseOptionalInteger(process.env.WINGET_IMPORT_LIMIT),
    targetWritten: parseOptionalInteger(process.env.WINGET_TARGET_WRITTEN),
    concurrency: parsePositiveInteger(
      process.env.WINGET_CONCURRENCY,
      DEFAULT_CONCURRENCY
    ),
    offset: parsePositiveInteger(process.env.WINGET_IMPORT_OFFSET, 0),
    splitFiles: process.env.WINGET_WRITE_SPLIT_FILES === '1',
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (arg === '--mode') {
      options.mode = argv[index + 1] ?? options.mode;
      index += 1;
      continue;
    }

    if (arg === '--limit') {
      options.limit = parseOptionalInteger(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === '--target-written') {
      options.targetWritten = parseOptionalInteger(argv[index + 1]);
      index += 1;
      continue;
    }

    if (arg === '--concurrency') {
      options.concurrency = parsePositiveInteger(
        argv[index + 1],
        options.concurrency
      );
      index += 1;
      continue;
    }

    if (arg === '--offset') {
      options.offset = parsePositiveInteger(argv[index + 1], options.offset);
      index += 1;
      continue;
    }

    if (arg === '--split-files') {
      options.splitFiles = true;
    }
  }

  if (!['curated', 'auto', 'all'].includes(options.mode)) {
    throw new Error(`Unsupported import mode: ${options.mode}`);
  }

  return options;
}

function printUsage() {
  console.log(`Usage: node crawl-winget.js [options]

Options:
  --mode curated|auto|all   Import curated IDs, a large automatic slice, or the whole index
  --limit <number>          Limit the number of selected package IDs
  --target-written <number> Stop launching new packages once this many apps are written
  --concurrency <number>    Number of packages to hydrate in parallel
  --offset <number>         Skip the first N automatically selected packages
  --split-files             Also write per-app JSON files under data/winget

Examples:
  node crawl-winget.js
  node crawl-winget.js --mode curated
  node crawl-winget.js --mode auto --target-written 1401 --concurrency 8
  node crawl-winget.js --mode all --limit 2000 --concurrency 12
  node crawl-winget.js --mode all --split-files
`);
}

function loadCuratedIds() {
  if (!existsSync(CURATED_IDS_FILE)) {
    return [];
  }

  const parsed = JSON.parse(readFileSync(CURATED_IDS_FILE, 'utf8'));
  const ids = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.packageIds)
      ? parsed.packageIds
      : [];

  return [...new Set(ids.map((id) => `${id}`.trim()).filter(Boolean))];
}

function resolvePackageIds(index, options) {
  const indexIds = getIndexedPackageIds(index);

  if (options.mode === 'curated') {
    const curatedIds = loadCuratedIds();
    if (curatedIds.length === 0) {
      console.error('ERROR: data/winget-package-ids.json contains no package IDs.');
      process.exit(1);
    }

    return curatedIds;
  }

  let ids = indexIds;
  if (options.offset > 0) {
    ids = ids.slice(options.offset);
  }

  if (options.limit && options.limit > 0) {
    ids = ids.slice(0, options.limit);
  }

  return ids;
}

function getIndexedPackageIds(index) {
  return index
    .filter((entry) => entry?.PackageId && entry?.Version)
    .map((entry) => entry.PackageId);
}

function clearOutputDirectory() {
  if (!existsSync(DATA_DIR)) {
    return;
  }

  for (const file of readdirSync(DATA_DIR)) {
    if (file.endsWith('.json')) {
      rmSync(resolve(DATA_DIR, file));
    }
  }
}

async function processPackageIds(packageIds, indexById, stats, options) {
  const workerCount = Math.max(
    1,
    Math.min(options.concurrency, packageIds.length)
  );
  let nextIndex = 0;
  const apps = [];

  const worker = async () => {
    while (nextIndex < packageIds.length) {
      if (options.targetWritten && stats.written >= options.targetWritten) {
        return;
      }

      const packageId = packageIds[nextIndex];
      nextIndex += 1;

      const indexEntry = indexById.get(packageId);
      if (!indexEntry) {
        console.warn(`⚠️ Missing from index: ${packageId}`);
        stats.missing.push(packageId);
        continue;
      }

      try {
        const record = await buildWingetRecord(indexEntry);
        if (!record || record.variants.length === 0) {
          console.warn(`⏭️ Skipping ${packageId} (no usable silent install variants)`);
          stats.skipped += 1;
          continue;
        }

        if (options.splitFiles) {
          writeFileSync(
            resolve(DATA_DIR, `${record.slug}.json`),
            JSON.stringify(record, null, 2) + '\n'
          );
        }
        apps.push(buildCombinedApp(record));
        stats.written += 1;
        console.log(`✨ ${record.title} (${record.variants.length} variants)`);
      } catch (error) {
        console.warn(`❌ Failed ${packageId}: ${error.message}`);
        stats.failed.push({ packageId, error: error.message });
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return apps.sort((a, b) => a.title.localeCompare(b.title));
}

async function buildWingetRecord(indexEntry) {
  const packageId = indexEntry.PackageId;
  const packageVersion = indexEntry.Version;
  const { manifestPath, manifestUrl } = getManifestPaths(packageId, packageVersion);

  const installerManifest = await fetchYaml(`${manifestPath}/${packageId}.installer.yaml`);
  if (!installerManifest) {
    throw new Error('installer manifest not found');
  }

  const localeManifest =
    (await fetchYaml(`${manifestPath}/${packageId}.locale.en-US.yaml`)) ??
    (await fetchYaml(`${manifestPath}/${packageId}.locale.yaml`));

  const packageName =
    localeManifest?.PackageName ?? indexEntry.Name ?? packageId;
  const publisher =
    localeManifest?.Publisher ?? derivePublisherFromPackageId(packageId);
  const preferredLocale = localeManifest?.PackageLocale ?? 'en-US';

  const installers = selectPreferredInstallers(
    installerManifest?.Installers,
    preferredLocale
  );

  const manifestSwitches = installerManifest?.InstallerSwitches ?? {};
  const manifestScope = installerManifest?.Scope ?? null;
  const manifestInstallModes = installerManifest?.InstallModes ?? [];
  const manifestInstallerType = installerManifest?.InstallerType ?? null;

  const variants = installers
    .map((installer) =>
      buildVariant({
        packageId,
        installer,
        manifestSwitches,
        manifestInstallerType,
        manifestScope,
      })
    )
    .filter(Boolean);

  return {
    slug: `winget-${slugify(packageId)}`,
    title: packageName,
    vendor: publisher,
    sourceUrl: manifestUrl,
    sourceType: 'winget',
    sourceName: 'Windows Package Manager',
    lastScraped: new Date().toISOString(),
    variants,
    psadtScript: null,
    metadata: {
      packageIdentifier: packageId,
      packageVersion,
      manifestUrl,
      tags: Array.isArray(indexEntry.Tags) ? indexEntry.Tags : [],
      wingetLastUpdate: indexEntry.LastUpdate ?? null,
      packageName,
      publisher,
      publisherUrl: localeManifest?.PublisherUrl ?? null,
      packageUrl: localeManifest?.PackageUrl ?? null,
      license: localeManifest?.License ?? null,
      licenseUrl: localeManifest?.LicenseUrl ?? null,
      shortDescription: localeManifest?.ShortDescription ?? null,
      description: localeManifest?.Description ?? null,
      moniker: localeManifest?.Moniker ?? null,
      releaseDate: installerManifest?.ReleaseDate ?? null,
      scope: manifestScope,
      installModes: manifestInstallModes,
      installerSwitches: manifestSwitches,
      sourceIndex: indexEntry,
      localeManifest,
      installers: installers.map((installer) => ({
        architecture: installer.Architecture ?? null,
        installerLocale: installer.InstallerLocale ?? null,
        installerType: installer.InstallerType ?? manifestInstallerType ?? null,
        installerUrl: installer.InstallerUrl ?? null,
        installerSha256: installer.InstallerSha256 ?? null,
        productCode: installer.ProductCode ?? null,
        scope: installer.Scope ?? manifestScope ?? null,
      })),
    },
  };
}

function buildVariant({
  packageId,
  installer,
  manifestSwitches,
  manifestInstallerType,
  manifestScope,
}) {
  const installerUrl = installer?.InstallerUrl ?? null;
  const installerType = installer?.InstallerType ?? manifestInstallerType ?? '';
  const architecture = installer?.Architecture ?? 'neutral';
  const installerSwitches = mergeSwitches(
    manifestSwitches ?? {},
    installer?.InstallerSwitches ?? {}
  );
  const inferredSwitches = inferInstallerSwitches(installerType, installerSwitches);
  const silentSwitch = inferredSwitches?.Silent ?? null;
  const silentWithProgressSwitch = inferredSwitches?.SilentWithProgress ?? null;

  if (!installerUrl || (!silentSwitch && !silentWithProgressSwitch)) {
    return null;
  }

  const fallbackName = `${packageId}-${architecture}`;
  const fileName = getFileNameFromUrl(installerUrl, fallbackName);

  const silentInstall = buildCommand(
    fileName,
    silentSwitch ?? silentWithProgressSwitch,
    installerType
  );
  const silentWithProgress =
    silentWithProgressSwitch && silentWithProgressSwitch !== silentSwitch
      ? buildCommand(fileName, silentWithProgressSwitch, installerType)
      : null;

  return {
    architecture: normalizeArchitecture(architecture),
    installerType: `${installerType}`.toUpperCase(),
    silentInstall,
    silentWithProgress,
    silentUninstall: null,
    repair: null,
    downloadUrl: installerUrl,
    psScriptUrl: null,
    detectionScriptUrl: null,
    logInstall: null,
    logUninstall: null,
    scope: installer?.Scope ?? manifestScope ?? null,
  };
}

function selectPreferredInstallers(rawInstallers, preferredLocale) {
  if (!Array.isArray(rawInstallers)) {
    return [];
  }

  const groups = new Map();

  for (const installer of rawInstallers) {
    const key = [
      installer?.Architecture ?? 'neutral',
      installer?.Scope ?? 'unknown',
    ].join('|');

    const group = groups.get(key) ?? [];
    group.push(installer);
    groups.set(key, group);
  }

  return [...groups.values()].map((group) =>
    [...group].sort(
      (a, b) => scoreInstaller(b, preferredLocale) - scoreInstaller(a, preferredLocale)
    )[0]
  );
}

function scoreInstaller(installer, preferredLocale) {
  const locale = installer?.InstallerLocale ?? null;
  let score = 0;

  if (!locale) score += 4;
  if (locale === preferredLocale) score += 3;
  if (locale === 'en-US') score += 2;

  const type = `${installer?.InstallerType ?? ''}`.toLowerCase();
  if (type === 'exe' || type === 'burn' || type === 'nullsoft' || type === 'inno') {
    score += 2;
  }
  if (type === 'msi' || type === 'wix') score += 1;
  if (`${installer?.Scope ?? ''}`.toLowerCase() === 'machine') score += 2;

  return score;
}

function getManifestPaths(packageId, version) {
  const parts = packageId.split('.');
  const firstLetter = parts[0]?.charAt(0)?.toLowerCase();
  const path = `${firstLetter}/${parts.join('/')}/${version}`;

  return {
    manifestPath: `${GITHUB_RAW_BASE}/${path}`,
    manifestUrl: `${GITHUB_TREE_BASE}/${path}`,
  };
}

function derivePublisherFromPackageId(packageId) {
  return packageId.split('.')[0] ?? packageId;
}

function normalizeArchitecture(value) {
  const arch = `${value ?? ''}`.trim().toLowerCase();
  if (!arch) return 'unknown';
  if (arch === 'x86') return 'x86';
  if (arch === 'x64') return 'x64';
  if (arch === 'arm64') return 'arm64';
  if (arch === 'neutral') return 'neutral';
  return arch;
}

function buildCommand(fileName, switches, installerType) {
  const normalizedType = `${installerType ?? ''}`.trim().toLowerCase();
  const trimmedSwitches = `${switches ?? ''}`.trim();

  if (normalizedType === 'wix' || normalizedType === 'msi') {
    return `msiexec /i "${fileName}" ${trimmedSwitches}`.trim();
  }

  return `${fileName} ${trimmedSwitches}`.trim();
}

function mergeSwitches(base, override) {
  return {
    ...base,
    ...override,
  };
}

function inferInstallerSwitches(installerType, switches) {
  const normalizedType = `${installerType ?? ''}`.trim().toLowerCase();
  const merged = { ...switches };

  if (merged.Silent || merged.SilentWithProgress) {
    return merged;
  }

  if (normalizedType === 'wix' || normalizedType === 'msi') {
    merged.Silent = '/qn /norestart';
    merged.SilentWithProgress = '/qb-! /norestart';
    return merged;
  }

  if (normalizedType === 'inno') {
    const custom = merged.Custom ? ` ${merged.Custom}` : '';
    merged.Silent = `/SP- /VERYSILENT /SUPPRESSMSGBOXES /NORESTART${custom}`;
    merged.SilentWithProgress = `/SP- /SILENT /SUPPRESSMSGBOXES /NORESTART${custom}`;
    return merged;
  }

  if (normalizedType === 'nullsoft') {
    merged.Silent = '/S';
    merged.SilentWithProgress = '/S';
    return merged;
  }

  if (normalizedType === 'burn') {
    merged.Silent = '/quiet /norestart';
    merged.SilentWithProgress = '/passive /norestart';
    return merged;
  }

  return merged;
}

function getFileNameFromUrl(url, fallback) {
  try {
    const pathname = new URL(url).pathname;
    const fileName = pathname.split('/').pop();
    return decodeURIComponent(fileName || fallback);
  } catch {
    return fallback;
  }
}

async function fetchJson(url) {
  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'StaticAdamGellWingetBot/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching JSON`);
  }

  return response.json();
}

async function fetchYaml(url) {
  const response = await fetchWithTimeout(url, {
    headers: {
      Accept: 'text/plain',
      'User-Agent': 'StaticAdamGellWingetBot/1.0',
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${url}`);
  }

  const text = await response.text();
  return YAML.parse(text);
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function writeCombined(apps) {
  const payload =
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        count: apps.length,
        apps,
      },
      null,
      2
    ) + '\n';

  writeFileSync(COMBINED_FILE, payload);
  writeFileSync(
    PUBLIC_COMBINED_FILE,
    payload
  );

  console.log(`📦 Wrote winget-combined.json (${apps.length} apps)`);
}

function buildCombinedApp(app) {
  return {
    slug: app.slug,
    title: app.title,
    vendor: app.vendor,
    sourceUrl: app.sourceUrl,
    sourceType: app.sourceType,
    sourceName: app.sourceName,
    lastScraped: app.lastScraped,
    variants: app.variants,
    psadtScript: app.psadtScript,
    metadata: {
      packageIdentifier: app.metadata?.packageIdentifier ?? null,
      packageVersion: app.metadata?.packageVersion ?? null,
      manifestUrl: app.metadata?.manifestUrl ?? null,
      tags: Array.isArray(app.metadata?.tags) ? app.metadata.tags : [],
      publisherUrl: app.metadata?.publisherUrl ?? null,
      packageUrl: app.metadata?.packageUrl ?? null,
      shortDescription: app.metadata?.shortDescription ?? null,
      scope: app.metadata?.scope ?? null,
    },
  };
}

function parseOptionalInteger(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number.parseInt(`${value}`, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function parsePositiveInteger(value, fallback) {
  const parsed = parseOptionalInteger(value);
  return parsed ?? fallback;
}

function slugify(value) {
  return `${value}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
