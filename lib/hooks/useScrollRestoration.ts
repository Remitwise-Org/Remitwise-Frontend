"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const STORAGE_PREFIX = "rw:scroll:";
const SAVE_DEBOUNCE_MS = 80;
const RESTORE_MAX_ATTEMPTS = 40;
const RESTORE_INTERVAL_MS = 25;

type ScrollState = {
  x: number;
  y: number;
};

function storageKey(pathname: string, search: string): string {
  const suffix = search ? `${pathname}?${search}` : pathname;
  return `${STORAGE_PREFIX}${suffix}`;
}

function readStoredPosition(key: string): ScrollState | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScrollState;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.x === "number" &&
      typeof parsed.y === "number"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function writeStoredPosition(key: string, state: ScrollState): void {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Storage full or disabled — silently ignore. Scroll preservation
    // is a progressive enhancement, so failing here must not break the app.
  }
}

/**
 * Preserves the window scroll position per route when navigating within the
 * browser session history (back/forward), and resets scroll to the top when
 * performing a new push-style navigation.
 *
 * ## Behavior
 *
 * | Scenario                                       | Result                                     |
 * | ---------------------------------------------- | ------------------------------------------ |
 * | User clicks `<Link>` or calls `router.push()`  | Scrolls to `(0, 0)`                        |
 * | User clicks browser Back or Forward (popstate) | Restores scroll x/y saved for that URL     |
 * | User refreshes the page (F5 / reload)          | Browser restores its own native position   |
 * | Tab closes then is restored                    | Not preserved (sessionStorage is per-tab)  |
 *
 * ## Storage
 *
 * Positions are written to `sessionStorage` under keys shaped
 * `rw:scroll:/path?query=1`. Values are `{ x, y }` tuples of scroll coordinates
 * captured at the end of each scroll gesture (debounced by `SAVE_DEBOUNCE_MS`).
 *
 * ## Disabling per route
 *
 * Routes that manage their own scroll (e.g. a filter page using hash links)
 * can set `window.__rw_skip_scroll_restore = true` before a navigation
 * completes to bypass restoration for the next route change. The flag is
 * consumed once and automatically cleared.
 */
export function useScrollRestoration(): void {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const search = searchParams?.toString() ?? "";
  const debounceRef = useRef<number | null>(null);
  const pendingRestoreRef = useRef<number | null>(null);
  const isHistoryNavRef = useRef<boolean>(false);
  const lastKeyRef = useRef<string | null>(null);
  const initializedRef = useRef<boolean>(false);
  const currentRouteScrollRef = useRef<ScrollState>({ x: 0, y: 0 });

  const syncScrollRef = useCallback(() => {
    if (typeof window === "undefined") return;
    currentRouteScrollRef.current = { x: window.scrollX, y: window.scrollY };
  }, []);

  const saveCurrent = useCallback(() => {
    if (typeof window === "undefined") return;
    const key = storageKey(window.location.pathname, window.location.search);
    writeStoredPosition(key, currentRouteScrollRef.current);
  }, []);

  const scheduleSave = useCallback(() => {
    syncScrollRef();
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }
    debounceRef.current = window.setTimeout(saveCurrent, SAVE_DEBOUNCE_MS);
  }, [saveCurrent, syncScrollRef]);

  const restorePosition = useCallback((target: ScrollState) => {
    if (pendingRestoreRef.current !== null) {
      window.clearInterval(pendingRestoreRef.current);
      pendingRestoreRef.current = null;
    }

    let attempts = 0;

    const tryRestore = () => {
      attempts += 1;

      const docHeight =
        document.documentElement.scrollHeight || document.body.scrollHeight;
      const viewportHeight = window.innerHeight || 0;
      const canReach = docHeight > 0 && docHeight - viewportHeight >= target.y;

      const atRestored =
        Math.abs(window.scrollY - target.y) <= 2 &&
        Math.abs(window.scrollX - target.x) <= 2;

      if (atRestored || attempts >= RESTORE_MAX_ATTEMPTS) {
        if (pendingRestoreRef.current !== null) {
          window.clearInterval(pendingRestoreRef.current);
          pendingRestoreRef.current = null;
        }
        if (!atRestored && canReach) {
          window.scrollTo(target.x, target.y);
        }
        return;
      }

      if (canReach) {
        window.scrollTo(target.x, target.y);
      }
    };

    tryRestore();
    if (pendingRestoreRef.current === null) {
      pendingRestoreRef.current = window.setInterval(
        tryRestore,
        RESTORE_INTERVAL_MS,
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.history) return;

    if ("scrollRestoration" in window.history) {
      try {
        window.history.scrollRestoration = "manual";
      } catch {
        // Some browsers (embedded webviews) may throw even though the
        // property exists. We fall back gracefully; manual restoration
        // will still be attempted but the browser may also try to restore.
      }
    }

    syncScrollRef();

    const handlePopState = () => {
      isHistoryNavRef.current = true;
    };

    const handleBeforeUnload = () => {
      syncScrollRef();
      saveCurrent();
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("scroll", scheduleSave, { passive: true });

    initializedRef.current = true;
    const initialKey = storageKey(window.location.pathname, window.location.search);
    lastKeyRef.current = initialKey;

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("scroll", scheduleSave);

      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (pendingRestoreRef.current !== null) {
        window.clearInterval(pendingRestoreRef.current);
        pendingRestoreRef.current = null;
      }
    };
  }, [scheduleSave, saveCurrent]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!initializedRef.current) return;

    const currentKey = storageKey(pathname, search);

    if (lastKeyRef.current && lastKeyRef.current !== currentKey) {
      writeStoredPosition(lastKeyRef.current, currentRouteScrollRef.current);
      syncScrollRef();
    }

    const skipFlag = (window as unknown as { __rw_skip_scroll_restore?: boolean })
      .__rw_skip_scroll_restore;

    if (skipFlag) {
      (window as unknown as { __rw_skip_scroll_restore?: boolean })
        .__rw_skip_scroll_restore = false;
    } else if (isHistoryNavRef.current) {
      const stored = readStoredPosition(currentKey);
      if (stored) {
        restorePosition(stored);
      } else {
        window.scrollTo(0, 0);
      }
    } else {
      window.scrollTo(0, 0);
    }

    isHistoryNavRef.current = false;
    lastKeyRef.current = currentKey;
  }, [pathname, search, restorePosition, syncScrollRef]);
}
