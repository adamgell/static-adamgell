import { useCallback, useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import SearchBar from "./SearchBar";
import AppCard from "./AppCard";
import InfiniteScrollTrigger from "./InfiniteScrollTrigger";

const BATCH_SIZE = 48;

interface LibraryVariant {
  silentInstall?: string;
}

interface LibraryApp {
  slug: string;
  title: string;
  vendor?: string;
  sourceUrl?: string;
  sourceType?: string;
  sourceName?: string;
  lastScraped: string;
  variants: LibraryVariant[];
  metadata?: {
    packageIdentifier?: string | null;
    tags?: string[];
  };
}

interface WingetPayload {
  apps?: LibraryApp[];
}

const FUSE_OPTIONS = {
  keys: [
    { name: "title", weight: 3 },
    { name: "vendor", weight: 2 },
    { name: "variants.silentInstall", weight: 1 },
    { name: "metadata.packageIdentifier", weight: 1 },
    { name: "metadata.tags", weight: 0.5 },
  ],
  threshold: 0.35,
  includeScore: true,
};

export default function SilentInstallLibrary() {
  const [query, setQuery] = useState("");
  const [apps, setApps] = useState<LibraryApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadApps() {
      try {
        setLoading(true);
        setLoadError(null);

        const response = await fetch("/winget-combined.json");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = (await response.json()) as WingetPayload;
        const nextApps = Array.isArray(payload?.apps) ? payload.apps : [];

        if (!cancelled) {
          setApps(nextApps);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load app data"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadApps();

    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return apps;
    return new Fuse(apps, FUSE_OPTIONS).search(query).map((r) => r.item);
  }, [apps, query]);

  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [query]);

  useEffect(() => {
    setVisibleCount((current) => {
      if (results.length === 0) {
        return BATCH_SIZE;
      }

      return Math.min(Math.max(current, BATCH_SIZE), results.length);
    });
  }, [results.length]);

  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 800);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const visibleResults = useMemo(
    () => results.slice(0, visibleCount),
    [results, visibleCount]
  );

  const hasMoreResults = visibleResults.length < results.length;

  const loadMore = useCallback(() => {
    setVisibleCount((current) => Math.min(current + BATCH_SIZE, results.length));
  }, [results.length]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div>
      <SearchBar
        value={query}
        onChange={setQuery}
        total={apps.length}
        filtered={results.length}
        visible={visibleResults.length}
      />

      {loading ? (
        <p className="text-slate-500 text-center py-12">Loading app data…</p>
      ) : loadError ? (
        <p className="text-rose-400 text-center py-12">
          Failed to load app data: {loadError}
        </p>
      ) : results.length === 0 ? (
        <p className="text-slate-500 text-center py-12">
          No apps matched &ldquo;{query}&rdquo;
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleResults.map((app) => (
              <AppCard key={app.slug} app={app} />
            ))}
          </div>
          <InfiniteScrollTrigger hasMore={hasMoreResults} onLoadMore={loadMore} />
        </>
      )}

      <footer className="mt-12 text-center text-sm text-slate-600">
        Data sourced from curated{" "}
        <a
          href="https://github.com/microsoft/winget-pkgs"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-slate-400 transition-colors"
        >
          Winget manifests
        </a>
      </footer>

      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-20 rounded-full border border-cyan-700 bg-slate-950/90 px-4 py-3 text-sm font-medium text-cyan-300 shadow-lg shadow-slate-950/40 backdrop-blur hover:border-cyan-500 hover:text-white transition-colors"
          aria-label="Back to top"
        >
          ↑ Top
        </button>
      )}
    </div>
  );
}
