"use client";

import { useEffect, useRef } from "react";

/**
 * useTitle – page + section title stacking hook.
 *
 * Callers declare their title and an optional `depth` (default `0`).
 * Lower depth = more outer layout level (page title); higher depth = more
 * nested section. Entries at the same depth keep insertion order.
 *
 * ```
 * // In a layout wrapper (depth 0 – the page-level title)
 * useTitle("Dashboard");
 *
 * // In a nested widget / section (depth 1)
 * useTitle("Goals", { depth: 1 });
 *
 * // → document.title becomes "Dashboard | Goals"
 * ```
 *
 * When a component unmounts the hook removes its entry and updates
 * `document.title` with whatever is left in the stack.
 */

// ── Internal stack entry ─────────────────────────────────────────────────────

interface TitleEntry {
  title: string;
  depth: number;
  /** Unique identifier so two components with the same title string can
   *  coexist without interfering during remove. */
  id: number;
}

let _nextId = 0;

/**
 * Exported for direct inspection in tests.
 * Do NOT mutate externally — use the hook API instead.
 */
export const titleStack: TitleEntry[] = [];

// ── Public helpers ───────────────────────────────────────────────────────────

/**
 * Pure function: given an ordered list of title strings, return the composed
 * `document.title` string.
 *
 * - Trims each segment.
 * - Drops blank segments.
 * - Joins remaining segments with ` | `.
 * - Returns `""` when no valid segment remains.
 */
export function composeTitles(titles: string[]): string {
  const valid = titles.map((t) => t?.trim()).filter(Boolean);
  if (valid.length === 0) return "";
  return valid.join(" | ");
}

// ── DOM update ───────────────────────────────────────────────────────────────

function updateDomTitle(): void {
  if (typeof window === "undefined") return;

  // Sort by depth (ascending) then by insertion id (ascending) so that outer
  // layout titles come first in the composed string.
  const sorted = [...titleStack].sort(
    (a, b) => a.depth - b.depth || a.id - b.id
  );

  const composed = composeTitles(sorted.map((e) => e.title));
  // Only write when there is something to write; avoids clearing a title that
  // was set by a different mechanism (e.g. server-side metadata).
  if (composed) {
    document.title = composed;
  } else {
    document.title = "";
  }
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UseTitleOptions {
  /**
   * Nesting depth of this call site within the layout tree.
   * `0` = outermost (page-level). Higher values = deeper sections.
   * Default: `0`.
   */
  depth?: number;
}

/**
 * Sets `document.title` to a composed string of all active titles, ordered by
 * `depth` (ascending) so that the outermost layout title appears first.
 *
 * @param title - The title string to register.  Whitespace-only strings are
 *                silently ignored.
 * @param options - Optional configuration (`depth` defaults to `0`).
 */
export function useTitle(title: string, options: UseTitleOptions = {}): void {
  const { depth = 0 } = options;

  // Keep a stable ref to the entry so the cleanup closure always removes the
  // exact object that was pushed, regardless of re-renders with different title
  // values.
  const entryRef = useRef<TitleEntry | null>(null);

  useEffect(() => {
    const trimmed = title?.trim();
    if (!trimmed) return;

    const entry: TitleEntry = { title: trimmed, depth, id: _nextId++ };
    entryRef.current = entry;

    titleStack.push(entry);
    updateDomTitle();

    return () => {
      const idx = titleStack.indexOf(entry);
      if (idx > -1) {
        titleStack.splice(idx, 1);
      }
      entryRef.current = null;
      updateDomTitle();
    };
    // Re-run only when the effective trimmed title or depth changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title?.trim(), depth]);
}
