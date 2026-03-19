import { useEffect, useRef } from "react";

interface Props {
  hasMore: boolean;
  onLoadMore: () => void;
}

export default function InfiniteScrollTrigger({
  hasMore,
  onLoadMore,
}: Props) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!hasMore || typeof IntersectionObserver === "undefined") {
      return;
    }

    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore();
        }
      },
      {
        rootMargin: "500px 0px",
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, onLoadMore]);

  if (!hasMore) {
    return null;
  }

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <div ref={sentinelRef} className="h-1 w-full" aria-hidden="true" />
      <p className="text-sm text-slate-500">
        Scroll for more results or load the next batch manually.
      </p>
      <button
        type="button"
        onClick={onLoadMore}
        className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500 hover:text-white transition-colors"
      >
        Load more
      </button>
    </div>
  );
}
