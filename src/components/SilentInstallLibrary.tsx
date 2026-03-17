import { useState, useMemo } from "react";
import Fuse from "fuse.js";
import SearchBar from "./SearchBar";
import AppCard from "./AppCard";

// Load all app JSON at Vite/Astro build time
const appModules = import.meta.glob("../../data/apps/*.json", { eager: true });
const ALL_APPS: any[] = Object.values(appModules).map(
  (m: any) => m.default ?? m
);

const fuse = new Fuse(ALL_APPS, {
  keys: [
    { name: "title", weight: 3 },
    { name: "vendor", weight: 2 },
    { name: "variants.silentInstall", weight: 1 },
  ],
  threshold: 0.35,
  includeScore: true,
});

export default function SilentInstallLibrary() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return ALL_APPS;
    return fuse.search(query).map((r) => r.item);
  }, [query]);

  return (
    <div>
      <SearchBar
        value={query}
        onChange={setQuery}
        total={ALL_APPS.length}
        filtered={results.length}
      />

      {results.length === 0 ? (
        <p className="text-slate-500 text-center py-12">
          No apps matched &ldquo;{query}&rdquo;
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((app) => (
            <AppCard key={app.slug} app={app} />
          ))}
        </div>
      )}

      <footer className="mt-12 text-center text-sm text-slate-600">
        Data sourced from{" "}
        <a
          href="https://silentinstallhq.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-400 transition-colors"
        >
        silentinstallhq.com
      </footer>
    </div>
  );
}
