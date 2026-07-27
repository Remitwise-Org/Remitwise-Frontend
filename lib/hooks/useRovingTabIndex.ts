"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";

export type RovingOrientation = "horizontal" | "vertical";

export interface UseRovingTabIndexOptions {
  /** Orientation of the tab list */
  orientation: RovingOrientation;
  /** Total number of items */
  itemCount: number;
  /** Ref to the container element that holds the focusable children */
  containerRef: RefObject<HTMLElement | null>;
  /** CSS selector for focusable child elements (used to programmatically focus) */
  itemSelector?: string;
  /** Callback to check if an item at a given index is disabled */
  isDisabled?: (index: number) => boolean;
  /** Whether arrow key navigation should wrap around */
  wrap?: boolean;
  /** Initial focused index (defaults to 0) */
  initialIndex?: number;
  /** Callback fired when focused index changes (useful for scrolling into view) */
  onFocusChange?: (index: number) => void;
}

export interface UseRovingTabIndexReturn {
  /** The index that currently holds tabIndex={0} */
  focusedIndex: number;
  /** Set the focused index programmatically (does NOT move focus — use for scroll-spy sync) */
  setFocusedIndex: (index: number) => void;
  /**
   * Returns the appropriate tabIndex value for the item at the given index.
   * - 0 for the focused item (in the tab sequence)
   * - -1 for all other items
   */
  getTabIndex: (index: number) => 0 | -1;
  /**
   * KeyDown handler to spread on the container element.
   * Handles ArrowLeft/ArrowRight (horizontal) or ArrowUp/ArrowDown (vertical),
   * plus Home/End keys. Disabled items are skipped. Focus is moved
   * programmatically after state update.
   */
  handleKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}

/**
 * useRovingTabIndex
 *
 * Implements the WAI-ARIA roving tabindex pattern for a list of focusable
 * items (navigation buttons, tabs, etc.). Only one item in the list has
 * `tabIndex={0}` at a time; all others have `tabIndex={-1}`. Arrow keys
 * move focus between items, and disabled items are skipped.
 *
 * Designed to meet WCAG 2.1 AA: Keyboard (2.1.1), Focus Order (2.4.3).
 *
 * @example
 * ```tsx
 * const listRef = useRef<HTMLUListElement>(null);
 * const { getTabIndex, handleKeyDown } = useRovingTabIndex({
 *   orientation: "vertical",
 *   itemCount: items.length,
 *   containerRef: listRef,
 *   itemSelector: "button",
 * });
 *
 * return (
 *   <ul ref={listRef} onKeyDown={handleKeyDown}>
 *     {items.map((item, i) => (
 *       <li key={item.id}>
 *         <button tabIndex={getTabIndex(i)} onClick={...}>
 *           {item.label}
 *         </button>
 *       </li>
 *     ))}
 *   </ul>
 * );
 * ```
 */
export function useRovingTabIndex({
  orientation,
  itemCount,
  containerRef,
  itemSelector = "button, [role='button']",
  isDisabled,
  wrap = true,
  initialIndex = 0,
  onFocusChange,
}: UseRovingTabIndexOptions): UseRovingTabIndexReturn {
  const [focusedIndex, setFocusedIndexState] = useState<number>(() =>
    isDisabled?.(initialIndex) ? findNextEnabled(0, itemCount, isDisabled) : initialIndex,
  );

  const onFocusChangeRef = useRef(onFocusChange);
  useEffect(() => {
    onFocusChangeRef.current = onFocusChange;
  }, [onFocusChange]);

  const setFocusedIndex = useCallback(
    (index: number) => {
      setFocusedIndexState(index);
      onFocusChangeRef.current?.(index);
    },
    [],
  );

  const getTabIndex = useCallback(
    (index: number): 0 | -1 => (index === focusedIndex ? 0 : -1),
    [focusedIndex],
  );

  /** Focus the child element at the given index (deferred until after React render). */
  const focusChildAtIndex = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container) return;

      const items = container.querySelectorAll<HTMLElement>(itemSelector);
      const target = items[index];
      if (target) {
        requestAnimationFrame(() => {
          target.focus();
        });
      }
    },
    [containerRef, itemSelector],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const prevKey = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
      const nextKey = orientation === "vertical" ? "ArrowDown" : "ArrowRight";

      let nextIndex: number | null = null;

      switch (e.key) {
        case prevKey: {
          e.preventDefault();
          nextIndex = findPrevEnabled(focusedIndex, itemCount, isDisabled, wrap);
          break;
        }
        case nextKey: {
          e.preventDefault();
          nextIndex = findNextEnabled(focusedIndex, itemCount, isDisabled, wrap);
          break;
        }
        case "Home": {
          e.preventDefault();
          nextIndex = findNextEnabled(-1, itemCount, isDisabled);
          break;
        }
        case "End": {
          e.preventDefault();
          nextIndex = findPrevEnabled(itemCount, itemCount, isDisabled);
          break;
        }
        default:
          return;
      }

      if (nextIndex !== null && nextIndex !== focusedIndex) {
        setFocusedIndex(nextIndex);
        focusChildAtIndex(nextIndex);
      }
    },
    [orientation, focusedIndex, itemCount, isDisabled, wrap, setFocusedIndex, focusChildAtIndex],
  );

  return { focusedIndex, setFocusedIndex, getTabIndex, handleKeyDown };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function findNextEnabled(
  current: number,
  total: number,
  isDisabled?: (i: number) => boolean,
  wrap = true,
): number {
  if (total === 0) return 0;
  for (let i = 1; i <= total; i++) {
    const next = (current + i) % total;
    if (!isDisabled?.(next)) return next;
  }
  return wrap ? current % total : Math.min(current, total - 1);
}

function findPrevEnabled(
  current: number,
  total: number,
  isDisabled?: (i: number) => boolean,
  wrap = true,
): number {
  if (total === 0) return 0;
  for (let i = 1; i <= total; i++) {
    const prev = (current - i + total) % total;
    if (!isDisabled?.(prev)) return prev;
  }
  return wrap ? current % total : Math.max(current, 0);
}
