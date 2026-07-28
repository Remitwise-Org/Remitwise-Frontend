"use client";

import { useEffect, useRef } from "react";
import type { RefObject } from "react";

// ─── Shared types ─────────────────────────────────────────────────────────────

export type ElementTarget<T extends Element = Element> =
  | T
  | RefObject<T | null>
  | null
  | undefined;

function resolveTarget<T extends Element>(target: ElementTarget<T>): T | null {
  if (!target) return null;
  if (typeof target === "object" && "current" in target) return target.current;
  return target as T;
}

// ─── useIntersectionObserver ──────────────────────────────────────────────────

export interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  /** Set to false to disable the observer without unmounting. Defaults to true. */
  enabled?: boolean;
}

/**
 * Centralized single-element IntersectionObserver hook.
 *
 * Creates exactly one `IntersectionObserver` per call, registers `callback`
 * on `target`, and calls `observer.disconnect()` automatically when the
 * component unmounts **or** when any dependency changes.
 *
 * Cleanup contract
 * ----------------
 * - `disconnect()` is always called in the effect's cleanup function.
 * - `callback` is kept via a stable ref so it is never a stale closure and
 *   does not itself need to be listed as an effect dependency.
 * - Returns a `RefObject<T>` that callers can attach to JSX when no explicit
 *   `target` is provided — the same pattern as `useResizeObserver`.
 *
 * @example Single-element usage
 * ```tsx
 * const sentinelRef = useIntersectionObserver(
 *   ([entry]) => { if (entry.isIntersecting) loadMore(); },
 *   { rootMargin: "200px" }
 * );
 * return <div ref={sentinelRef} />;
 * ```
 *
 * @example Explicit target element
 * ```tsx
 * const divRef = useRef<HTMLDivElement>(null);
 * useIntersectionObserver(
 *   ([entry]) => console.log(entry.isIntersecting),
 *   { threshold: 0.5 },
 *   divRef
 * );
 * ```
 */
export function useIntersectionObserver<T extends Element = HTMLDivElement>(
  callback: IntersectionObserverCallback,
  options: UseIntersectionObserverOptions = {},
  target?: ElementTarget<T>,
): RefObject<T | null> {
  const { enabled = true, ...observerInit } = options;

  // Stable ref so callback changes never force observer re-creation.
  const callbackRef = useRef<IntersectionObserverCallback>(callback);
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Internal ref returned to callers who don't supply an explicit target.
  const internalRef = useRef<T | null>(null);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (typeof IntersectionObserver === "undefined") return;

    const element = resolveTarget(target) ?? internalRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries, obs) => callbackRef.current(entries, obs),
      observerInit,
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
    // observerInit values are intentionally spread so they can be compared
    // individually; stringify avoids a new object reference on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, target, JSON.stringify(observerInit)]);

  return internalRef;
}

// ─── useScrollSpy ─────────────────────────────────────────────────────────────

export interface UseScrollSpyOptions extends IntersectionObserverInit {
  /** Set to false to disable the observer without unmounting. Defaults to true. */
  enabled?: boolean;
}

/**
 * Scroll-spy hook for multiple section elements.
 *
 * Observes every element whose `id` is listed in `sectionIds`, and calls
 * `onActivate` with the id of whichever section is currently most visible in
 * the viewport.  Uses a single `IntersectionObserver` instance for all
 * sections and calls `disconnect()` on cleanup.
 *
 * @example
 * ```tsx
 * const SECTION_IDS = ["profile", "security", "preferences"];
 *
 * function SettingsPage() {
 *   const [activeId, setActiveId] = useState(SECTION_IDS[0]);
 *   useScrollSpy(SECTION_IDS, setActiveId, {
 *     rootMargin: "-20% 0px -60% 0px",
 *     threshold: [0, 0.25, 0.5, 0.75, 1],
 *   });
 *   // …
 * }
 * ```
 */
export function useScrollSpy(
  sectionIds: readonly string[],
  onActivate: (id: string) => void,
  options: UseScrollSpyOptions = {},
): void {
  const { enabled = true, ...observerInit } = options;

  // Stable ref for the callback so it never triggers observer re-creation.
  const onActivateRef = useRef<(id: string) => void>(onActivate);
  useEffect(() => {
    onActivateRef.current = onActivate;
  }, [onActivate]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (typeof IntersectionObserver === "undefined") return;

    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          visible.set(e.target.id, e.intersectionRatio);
        });
        // Pick the section with the highest visible ratio.
        let bestId: string | null = null;
        let bestRatio = 0;
        visible.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });
        if (bestId !== null && bestRatio > 0) {
          onActivateRef.current(bestId);
        }
      },
      observerInit,
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, sectionIds, JSON.stringify(observerInit)]);
}
