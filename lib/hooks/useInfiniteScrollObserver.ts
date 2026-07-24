"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

interface UseInfiniteScrollObserverOptions {
  /** Whether there is more data available to load. */
  hasMore: boolean;
  /** Whether a load-more request is already in flight. */
  loading: boolean;
  /** Called when the sentinel enters the viewport and another page should load. */
  onLoadMore: () => void;
  rootMargin?: string;
}

interface UseInfiniteScrollObserverResult<T extends Element> {
  sentinelRef: RefObject<T | null>;
  /** False when auto-loading is disabled (no IntersectionObserver support, or reduced motion) and a manual trigger is the only way forward. */
  isObserverActive: boolean;
}

/**
 * Auto-triggers `onLoadMore` when a sentinel element scrolls into view.
 *
 * Auto-loading is skipped when `IntersectionObserver` isn't supported, or
 * when the user prefers reduced motion — unannounced content appearing as
 * you scroll is a motion-adjacent surprise some users opt out of. In both
 * cases the caller's manual "load more" trigger (e.g. a button) remains the
 * only way to load more, so it must always be rendered alongside the
 * sentinel rather than only shown when the observer is inactive.
 */
export function useInfiniteScrollObserver<T extends Element = HTMLDivElement>({
  hasMore,
  loading,
  onLoadMore,
  rootMargin = "200px",
}: UseInfiniteScrollObserverOptions): UseInfiniteScrollObserverResult<T> {
  const sentinelRef = useRef<T | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const isSupported = typeof IntersectionObserver !== "undefined";
  const isObserverActive = isSupported && !prefersReducedMotion;

  useEffect(() => {
    if (!hasMore || loading || !isObserverActive) return;

    const node = sentinelRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      { rootMargin },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, isObserverActive, onLoadMore, rootMargin]);

  return { sentinelRef, isObserverActive };
}
