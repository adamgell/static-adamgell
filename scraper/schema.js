/**
 * App data schema for silent install library.
 * Each app has a slug (URL-safe ID), metadata, and one or more variants
 * (typically one per CPU architecture).
 */

/**
 * @typedef {Object} AppVariant
 * @property {string} architecture
 * @property {string} installerType
 * @property {string} silentInstall
 * @property {string} silentUninstall
 * @property {string|null} repair
 * @property {string|null} downloadUrl
 * @property {string|null} psScriptUrl
 * @property {string|null} detectionScriptUrl
 * @property {string|null} logInstall
 * @property {string|null} logUninstall
 */

/**
 * @typedef {Object} AppRecord
 * @property {string}       slug
 * @property {string}       title
 * @property {string|null}  vendor
 * @property {string}       sourceUrl
 * @property {string}       lastScraped
 * @property {AppVariant[]} variants
 * @property {string|null}  psadtScript   - Full PSADT Deploy-Application.ps1 content
 */

export function emptyApp(slug, sourceUrl) {
  return {
    slug,
    title: '',
    vendor: null,
    sourceUrl,
    lastScraped: new Date().toISOString(),
    variants: [],
    psadtScript: null,
  };
}

export function emptyVariant() {
  return {
    architecture: '',
    installerType: '',
    silentInstall: '',
    silentUninstall: '',
    repair: null,
    downloadUrl: null,
    psScriptUrl: null,
    detectionScriptUrl: null,
    logInstall: null,
    logUninstall: null,
  };
}
