"use client";

import { useCallback, useEffect, useState } from "react";

export interface CursorPage<T> {
  items: T[];
  nextCursor?: string;
}

interface UseCursorPaginationOptions<T> {
  /**
   * Fetches one page. Called with `cursor: undefined, reset: true` for the
   * first page (and any time `fetchPage` itself changes, e.g. a filter
   * dependency it closes over). Responsible for the request itself and any
   * side effects tied to the response (e.g. capturing metadata).
   */
  fetchPage: (cursor: string | undefined, reset: boolean) => Promise<CursorPage<T>>;
  /** Used when `fetchPage` rejects with something other than an `Error`. */
  fallbackErrorMessage?: string;
}

interface UseCursorPaginationResult<T> {
  items: T[];
  /** True only while the initial (or a filter-driven reset) fetch is in flight. */
  loading: boolean;
  /** True only while a "load more" fetch is in flight. */
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  /** True only for the very first fetch this hook instance ever makes. */
  isInitialLoading: boolean;
  loadMore: () => void;
  /** Re-runs the first page from scratch (e.g. a "Retry" button after an error). */
  refetch: () => void;
}

/**
 * Owns cursor-based "load more" pagination state so table/list pages don't
 * have to hand-roll cursor/hasMore/loading bookkeeping themselves.
 */
export function useCursorPagination<T>({
  fetchPage,
  fallbackErrorMessage = "Something went wrong. Please try again.",
}: UseCursorPaginationOptions<T>): UseCursorPaginationResult<T> {
  const [items, setItems] = useState<T[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);

  const load = useCallback(
    async (currentCursor: string | undefined, reset: boolean) => {
      try {
        if (reset) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setError(null);

        const page = await fetchPage(currentCursor, reset);

        setItems((prev) => (reset ? page.items : [...prev, ...page.items]));
        setCursor(page.nextCursor);
        setHasMore(!!page.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : fallbackErrorMessage);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setHasLoadedOnce(true);
      }
    },
    [fetchPage, fallbackErrorMessage],
  );

  useEffect(() => {
    load(undefined, true);
    // `load` changes whenever `fetchPage` does, which is exactly when a
    // reset-from-scratch fetch (e.g. a filter change) should run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const loadMore = useCallback(() => {
    if (hasMore && !loadingMore) {
      load(cursor, false);
    }
  }, [hasMore, loadingMore, cursor, load]);

  const refetch = useCallback(() => {
    load(undefined, true);
  }, [load]);

  return {
    items,
    loading,
    loadingMore,
    error,
    hasMore,
    isInitialLoading: !hasLoadedOnce && loading,
    loadMore,
    refetch,
  };
}
