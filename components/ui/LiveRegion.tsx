"use client";

import type { ReactNode } from "react";

export type LiveRegionPoliteness = "polite" | "assertive";

export interface LiveRegionProps {
  /**
   * ARIA live-region politeness.
   * "polite" (default) waits for the screen reader to finish its current
   * announcement before reading this update — use for routine status
   * changes (idle/pending/success).
   * "assertive" interrupts immediately — reserve for urgent, blocking
   * conditions the user must know about right away.
   */
  politeness?: LiveRegionPoliteness;
  /**
   * When true (default), the entire region is re-announced as a unit on
   * any change, rather than only the specific node that changed. This is
   * almost always what you want for a status message — omitting it is a
   * common source of incomplete announcements.
   */
  atomic?: boolean;
  /**
   * When true, the region is visually hidden (sr-only) but remains in the
   * accessibility tree — use for announcements that don't need a visible
   * persistent UI element (e.g. "3 results loaded").
   * When false (default), the region renders normally and callers are
   * responsible for its visible presentation.
   */
  visuallyHidden?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * LiveRegion
 *
 * Central primitive for wrapping ARIA live-region semantics. Ensures
 * `role`, `aria-live`, and `aria-atomic` are always set together and
 * consistently, rather than each consumer hand-rolling its own subset
 * of these attributes (a pattern that previously led to inconsistent —
 * and in some cases missing — `aria-atomic` across the codebase).
 *
 * `role="status"` (polite) or `role="alert"` (assertive) is derived from
 * `politeness` — matching the app's existing convention in `Notice.tsx`.
 */
export default function LiveRegion({
  politeness = "polite",
  atomic = true,
  visuallyHidden = false,
  className = "",
  children,
}: LiveRegionProps) {
  const role = politeness === "assertive" ? "alert" : "status";

  return (
    <div
      role={role}
      aria-live={politeness}
      aria-atomic={atomic}
      className={visuallyHidden ? `sr-only ${className}`.trim() : className}
    >
      {children}
    </div>
  );
}
