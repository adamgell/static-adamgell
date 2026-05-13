const REPO = "adamgell/cmtraceopen";
const API = `https://api.github.com/repos/${REPO}`;

const NIGHTLY_WORKFLOW = {
  file: "cmtrace-nightly-signed.yml",
  title: "Nightly signed build",
};

const els = {
  nightly: document.querySelector("#nightly-release"),
  stable: document.querySelector("#stable-release"),
  publishChip: document.querySelector("#nightly-publish-chip"),
  publishTitle: document.querySelector("#nightly-publish-title"),
  publishMeta: document.querySelector("#nightly-publish-meta"),
  apiState: document.querySelector("#api-state"),
  refresh: document.querySelector("#refresh-button"),
};

els.refresh.addEventListener("click", () => loadBuilds({ force: true }));

loadBuilds();

async function loadBuilds({ force = false } = {}) {
  const stamp = new Date().toLocaleString();
  els.apiState.textContent = force ? `Refreshing at ${stamp}.` : "Loading GitHub API data.";
  els.refresh.disabled = true;

  try {
    const [nightly, latest, runs] = await Promise.all([
      fetchMaybe(`${API}/releases/tags/nightly`),
      fetchJson(`${API}/releases/latest`),
      loadWorkflowRuns(),
    ]);

    renderNightly(nightly, runs);
    renderStable(latest);
    renderPublishBadge(nightly, runs);
    els.apiState.textContent = `Updated ${new Date().toLocaleString()}.`;
  } catch (error) {
    renderError(error);
  } finally {
    els.refresh.disabled = false;
  }
}

async function loadWorkflowRuns() {
  const url = `${API}/actions/workflows/${encodeURIComponent(NIGHTLY_WORKFLOW.file)}/runs?branch=main&per_page=5`;
  try {
    const data = await fetchJson(url);
    return data.workflow_runs ?? [];
  } catch (error) {
    if (error.message.startsWith("404")) {
      return [];
    }

    throw error;
  }
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function fetchMaybe(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }

  return response.json();
}

function renderNightly(release, runs) {
  els.nightly.classList.remove("loading-block");
  els.nightly.replaceChildren();

  if (!release) {
    els.nightly.append(emptyRelease({
      title: "No nightly release yet",
      body: "The first successful nightly signed workflow will publish the mutable nightly prerelease.",
      href: `https://github.com/${REPO}/actions/workflows/${NIGHTLY_WORKFLOW.file}`,
    }));
    return;
  }

  const latestRun = runs[0];
  const visibleAssets = visibleReleaseAssets(release);
  const groups = groupAssets(visibleAssets);

  const summary = el("div", "", "release-summary");
  summary.append(el("span", "Nightly signed build", "eyebrow"));

  const releaseMain = el("div", "", "release-main");
  const releaseCopy = el("div", "", "release-copy");
  const check = el("div", "", "checkmark");
  check.setAttribute("aria-hidden", "true");
  check.innerHTML = `<svg viewBox="0 0 24 24"><path d="m9.4 16.8-4.2-4.2 1.9-1.9 2.3 2.3 7.5-7.5 1.9 1.9-9.4 9.4Z" fill="currentColor" /></svg>`;

  const releaseText = el("div", "", "release-text");
  const heading = el("h2", release.name || release.tag_name);
  heading.id = "nightly-heading";
  releaseText.append(
    heading,
    el("p", formatDate(release.published_at || release.created_at)),
    el("p", "Automatically signed and ready to install."),
  );

  releaseCopy.append(check, releaseText);
  releaseMain.append(releaseCopy, statusChip("Published"));
  summary.append(releaseMain);

  const stats = el("div", "", "stats");
  stats.setAttribute("aria-label", "Nightly build metadata");
  stats.append(
    stat("Commit", commitLabel(release, latestRun)),
    stat("Run", latestRun ? link(latestRun.html_url, `#${latestRun.id}`) : link(`https://github.com/${REPO}/actions/workflows/${NIGHTLY_WORKFLOW.file}`, "History")),
    stat("Artifacts", `${visibleAssets.length} files`),
    stat("Size", formatBytes(totalAssetBytes(visibleAssets))),
  );
  summary.append(stats);
  els.nightly.append(summary);

  const title = el("div", "", "section-title");
  title.append(el("h3", "Nightly Downloads"), el("span", `All assets (${visibleAssets.length})`, "asset-count"));
  els.nightly.append(title);

  if (!groups.length) {
    els.nightly.append(emptyRelease({
      title: "No downloadable assets",
      body: "The nightly release exists but does not have downloadable assets attached.",
      href: release.html_url,
    }));
    return;
  }

  const downloadGroups = el("div", "", "download-groups");
  for (const group of groups) {
    downloadGroups.append(assetSection(group.title, group.assets, release));
  }
  els.nightly.append(downloadGroups);
}

function renderStable(release) {
  els.stable.classList.remove("loading-block");
  els.stable.replaceChildren();

  if (!release) {
    els.stable.append(emptyRelease({
      title: "No stable release found",
      body: "GitHub did not return a latest release.",
      href: `https://github.com/${REPO}/releases`,
    }));
    return;
  }

  const copy = el("div", "", "stable-copy");
  copy.append(el("span", "Latest stable release", "eyebrow"));

  const stableTitle = el("div", "", "stable-title");
  stableTitle.append(el("strong", release.name || release.tag_name), statusChip("Stable"));
  copy.append(stableTitle, el("span", formatDate(release.published_at || release.created_at)));

  const actions = el("div", "", "stable-actions");
  actions.append(link(release.html_url || `https://github.com/${REPO}/releases/latest`, "View stable downloads", "button primary"));

  els.stable.append(copy, actions);
}

function renderPublishBadge(nightly, runs) {
  const latestRun = runs[0];

  if (nightly) {
    els.publishChip.className = "status-chip";
    els.publishChip.textContent = "Nightly Published";
    els.publishTitle.textContent = `Updated ${formatRelative(nightly.published_at || nightly.created_at)}`;
    els.publishMeta.textContent = latestRun ? `Run #${latestRun.id}` : `Tag ${nightly.tag_name}`;
    return;
  }

  els.publishChip.className = "status-chip neutral";
  els.publishChip.textContent = "Not Published";
  els.publishTitle.textContent = latestRun ? statusText(latestRun) : "No nightly release";
  els.publishMeta.textContent = latestRun
    ? `Run #${latestRun.id}`
    : "Waiting for the first successful nightly run.";
}

function assetSection(title, assets, release) {
  const section = el("section", "", "download-group");
  section.setAttribute("aria-label", `${title} nightly downloads`);

  const label = el("div", "", "platform-label");
  label.append(platformIcon(title), el("span", title));

  const rows = el("div", "", "rows");
  for (const asset of assets) {
    rows.append(assetRow(asset, release));
  }

  section.append(label, rows);
  return section;
}

function assetRow(asset, release) {
  const kind = assetKind(asset.name);
  const row = el("div", "", "download-row");
  const main = el("div", "", "download-main");
  main.append(
    el("strong", assetLabel(asset.name, release), "file-name"),
    el("span", kind, `asset-kind ${assetKindClass(kind)}`),
    el("span", formatBytes(asset.size), "file-size"),
  );

  row.append(main, link(asset.browser_download_url, "Download", "download-action"));
  return row;
}

function emptyRelease({ title, body, href }) {
  const box = el("div", "", "empty-state");
  box.append(el("h3", title), el("p", body));

  if (href) {
    box.append(link(href, "Open GitHub"));
  }

  return box;
}

function renderError(error) {
  els.apiState.textContent = `GitHub API error: ${error.message}`;
  els.publishChip.className = "status-chip failure";
  els.publishChip.textContent = "Unavailable";
  els.publishTitle.textContent = "GitHub API error";
  els.publishMeta.textContent = error.message;

  els.nightly.classList.remove("loading-block");
  els.stable.classList.remove("loading-block");
  els.nightly.replaceChildren(emptyRelease({
    title: "Could not load nightly build data",
    body: error.message,
    href: `https://github.com/${REPO}/actions`,
  }));
  els.stable.replaceChildren(emptyRelease({
    title: "Could not load stable release data",
    body: error.message,
    href: `https://github.com/${REPO}/releases`,
  }));
}

function groupAssets(assets) {
  const groups = new Map();
  const sorted = [...assets].sort((a, b) => {
    const groupDiff = groupRank(assetGroup(a.name)) - groupRank(assetGroup(b.name));
    return groupDiff || assetRank(a.name) - assetRank(b.name) || a.name.localeCompare(b.name);
  });

  for (const asset of sorted) {
    const title = assetGroup(asset.name);
    if (!groups.has(title)) {
      groups.set(title, []);
    }
    groups.get(title).push(asset);
  }

  return Array.from(groups, ([title, groupAssets]) => ({ title, assets: groupAssets }));
}

function visibleReleaseAssets(release) {
  return (release.assets ?? []).filter((asset) => !asset.name.endsWith(".sig"));
}

function assetGroup(name) {
  if (/macos|darwin|\.dmg$|\.app\.tar\.gz$/i.test(name)) {
    return /arm64|aarch64/i.test(name) ? "macOS arm64" : "macOS";
  }

  if (/linux|appimage|\.deb$/i.test(name)) {
    return "Linux";
  }

  if (/arm64|aarch64/i.test(name)) {
    return "Windows arm64";
  }

  if (/x64|x86_64/i.test(name)) {
    return "Windows x64";
  }

  return "Other assets";
}

function groupRank(group) {
  const order = ["Windows x64", "Windows arm64", "macOS arm64", "macOS", "Linux", "Other assets"];
  const index = order.indexOf(group);
  return index === -1 ? 99 : index;
}

function assetKind(name) {
  if (/\.msix(bundle)?$/i.test(name)) {
    return "MSIX Package";
  }

  if (/\.msi$/i.test(name)) {
    return "MSI Installer";
  }

  if (/-setup\.exe$/i.test(name)) {
    return "Setup EXE";
  }

  if (/lite.*\.exe$/i.test(name)) {
    return "Lite EXE";
  }

  if (/\.exe$/i.test(name)) {
    return "Full EXE";
  }

  if (/\.dmg$/i.test(name)) {
    return "DMG";
  }

  if (/\.appimage$/i.test(name)) {
    return "AppImage";
  }

  if (/\.deb$/i.test(name)) {
    return "DEB";
  }

  if (/\.app\.tar\.gz$/i.test(name)) {
    return "App TAR";
  }

  if (/latest\.json$/i.test(name)) {
    return "Update JSON";
  }

  return "Asset";
}

function assetKindClass(kind) {
  if (kind.startsWith("MSI Installer")) {
    return "format-msi";
  }

  if (kind.startsWith("MSIX")) {
    return "format-msix";
  }

  if (kind.includes("EXE") && kind.includes("Lite")) {
    return "format-lite";
  }

  if (kind.includes("EXE")) {
    return "format-exe";
  }

  if (kind === "DMG") {
    return "format-dmg";
  }

  return "format-other";
}

function assetLabel(name, release) {
  let label = name
    .replace(/^CMTrace-Open[_-]?/i, "")
    .replace(/^Nightly[_-]?/i, "Nightly ")
    .replace(/_/g, " ");

  if (/\.dmg$/i.test(name) && !/\b\d{8}\b/.test(label)) {
    label = label.replace(/^Nightly\s*/i, `Nightly ${releaseDateStamp(release)} `);
  }

  return label;
}

function assetRank(name) {
  const kind = assetKind(name);
  const order = ["MSI Installer", "MSIX Package", "Setup EXE", "Full EXE", "Lite EXE", "DMG", "App TAR", "DEB", "AppImage", "Update JSON", "Asset"];
  const index = order.indexOf(kind);
  return index === -1 ? 99 : index;
}

function platformIcon(title) {
  const icon = el("span", "", `os-icon ${/macOS/i.test(title) ? "apple" : "windows"}`);
  icon.setAttribute("aria-hidden", "true");

  if (/macOS/i.test(title)) {
    icon.innerHTML = `<svg viewBox="0 0 24 24"><path d="M16.8 12.7c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.1-1.7-1.3-.1-2.6.8-3.3.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 6.8 1.1 9.1.8 1.1 1.7 2.3 2.9 2.2 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.2.9-1.3 1.2-2.5 1.3-2.6 0-.1-2.9-1.1-3-3.6ZM14.7 6.2c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.7-1.1 1.7-.9 2.7 1 .1 2-.5 2.6-1.3Z" fill="currentColor" /></svg>`;
    return icon;
  }

  icon.innerHTML = `<svg viewBox="0 0 24 24"><path d="M3 4.4 10.7 3v8.2H3V4.4Zm9.4-1.7L21 1.2v10h-8.6V2.7ZM3 12.8h7.7V21L3 19.7v-6.9Zm9.4 0H21v10l-8.6-1.5v-8.5Z" fill="currentColor" /></svg>`;
  return icon;
}

function statusChip(text) {
  return el("span", text, "status-chip");
}

function stat(label, value) {
  const box = el("div", "", "stat");
  box.append(el("span", label));

  const strong = el("strong");
  if (value instanceof Node) {
    strong.append(value);
  } else {
    strong.textContent = value;
  }
  box.append(strong);
  return box;
}

function commitLabel(release, run) {
  if (run?.head_sha) {
    return run.head_sha.slice(0, 12);
  }

  return release.target_commitish || release.tag_name;
}

function totalAssetBytes(assets) {
  return assets.reduce((sum, asset) => sum + (Number.isFinite(asset.size) ? asset.size : 0), 0);
}

function formatDate(value) {
  if (!value) {
    return "unknown";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function releaseDateStamp(release) {
  const date = new Date(release?.published_at || release?.created_at || Date.now());
  if (Number.isNaN(date.getTime())) {
    return "nightly";
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function formatRelative(value) {
  if (!value) {
    return "just now";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "just now";
  }

  const diffSeconds = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000));
  const units = [
    ["day", 86400],
    ["hour", 3600],
    ["min", 60],
  ];

  for (const [label, seconds] of units) {
    if (diffSeconds >= seconds) {
      const count = Math.round(diffSeconds / seconds);
      return `${count} ${label}${count === 1 ? "" : "s"} ago`;
    }
  }

  return "just now";
}

function formatBytes(value) {
  if (!Number.isFinite(value)) {
    return "unknown size";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }

  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function statusText(run) {
  const raw = run?.conclusion || run?.status || "pending";
  return raw.replace(/_/g, " ");
}

function el(tag, text = "", className = "") {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  if (text) {
    node.textContent = text;
  }
  return node;
}

function link(href, text, className = "") {
  const node = document.createElement("a");
  node.href = href;
  node.textContent = text;
  if (className) {
    node.className = className;
  }
  return node;
}
