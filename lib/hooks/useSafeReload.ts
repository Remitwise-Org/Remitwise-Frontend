"use client";

import { useEffect } from "react";

/**
 * Registers a `beforeunload` event listener when `isDirty` is `true`,
 * causing the browser to display a standard "unsaved changes" prompt when
 * the user tries to reload, close the tab, or navigate away.
 *
 * The prompt text is controlled by the browser and cannot be customised.
 *
 * @param isDirty - Whether there are unsaved changes.
 *
 * @example
 * ```tsx
 * const { isDirty } = useAutosave(onSave);
 * useSafeReload(isDirty);
 * ```
 */
export function useSafeReload(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);
}