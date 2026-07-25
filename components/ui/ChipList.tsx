"use client";

import React, { useCallback, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChipListProps {
  /** Chip items to display */
  children: React.ReactNode;
  /**
   * Overflow mode:
   * - "wrap": all chips wrap naturally to multiple lines
   * - "count": show first maxVisible chips, rest collapse into "+X more"
   * - "hybrid": wrap until container reaches maxHeight, then collapse into "+X more"
   */
  overflow?: "wrap" | "count" | "hybrid";
  /** Maximum chips visible before "+X more" collapse (used by "count" and "hybrid") */
  maxVisible?: number;
  /** Maximum height in pixels before collapsing (used by "hybrid" mode only) */
  maxHeight?: number;
  /** Accessible label for the chip list */
  ariaLabel?: string;
  /** Additional class names */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ChipList
 *
 * Renders a list of chips with configurable overflow behaviour.
 *
 * ## Overflow modes
 * - wrap: all chips wrap naturally to multiple lines (default)
 * - count: renders maxVisible chips then a "+X more" indicator
 * - hybrid: renders chips wrapping up to maxHeight, then collapses remainder
 *
 * ## Accessibility
 * - Container has ole="list" with ria-label
 * - Each child is wrapped in a ole="listitem"
 * - "+X more" button has ria-label describing how many hidden items
 */
export function ChipList({
  children,
  overflow = "wrap",
  maxVisible = 4,
  maxHeight = 200,
  ariaLabel = "Filter options",
  className,
}: ChipListProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(true);

  const chipArray = React.Children.toArray(children);
  const totalCount = chipArray.length;

  const handleToggleExpand = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  // "wrap" mode: render all chips
  if (overflow === "wrap") {
    return (
      <div
        ref={containerRef}
        role="list"
        aria-label={ariaLabel}
        className={cn("flex flex-wrap gap-2", className)}
      >
        {chipArray.map((chip, index) => (
          <div key={chip--} role="listitem">
            {chip}
          </div>
        ))}
      </div>
    );
  }

  // "count" mode: show maxVisible chips + collapsed remainder
  if (overflow === "count") {
    const visibleChips = chipArray.slice(0, maxVisible);
    const hiddenCount = totalCount - maxVisible;
    const showToggle = hiddenCount > 0;

    return (
      <div
        ref={containerRef}
        role="list"
        aria-label={ariaLabel}
        className={cn("flex flex-wrap gap-2", className)}
      >
        {visibleChips.map((chip, index) => (
          <div key={chip--} role="listitem">
            {chip}
          </div>
        ))}
        {showToggle && collapsed && (
          <div role="listitem">
            <button
              type="button"
              onClick={handleToggleExpand}
              aria-label={Show  more filter options}
              className="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-white/20 bg-white/[0.03] px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            >
              +{hiddenCount} more
            </button>
          </div>
        )}
        {showToggle && !collapsed && (
          <>
            {chipArray.slice(maxVisible).map((chip, index) => (
              <div key={chip-hidden--} role="listitem">
                {chip}
              </div>
            ))}
            <div role="listitem">
              <button
                type="button"
                onClick={handleToggleExpand}
                aria-label="Collapse additional filter options"
                className="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-white/20 bg-white/[0.03] px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
              >
                Show less
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // "hybrid" mode: wrap until maxHeight, then collapse
  if (overflow === "hybrid") {
    const visibleChips = collapsed ? chipArray.slice(0, maxVisible) : chipArray;
    const hiddenCount = totalCount - maxVisible;

    return (
      <div
        ref={containerRef}
        role="list"
        aria-label={ariaLabel}
        className={cn("flex flex-wrap gap-2", className)}
        style={{ maxHeight: collapsed ? ${maxHeight}px : "none", overflow: "hidden" }}
      >
        {visibleChips.map((chip, index) => (
          <div key={chip--} role="listitem">
            {chip}
          </div>
        ))}
        {collapsed && hiddenCount > 0 && (
          <div role="listitem">
            <button
              type="button"
              onClick={handleToggleExpand}
              aria-label={Show  more filter options}
              className="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-white/20 bg-white/[0.03] px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            >
              +{hiddenCount} more
            </button>
          </div>
        )}
        {!collapsed && hiddenCount > 0 && (
          <div role="listitem">
            <button
              type="button"
              onClick={handleToggleExpand}
              aria-label="Collapse additional filter options"
              className="inline-flex min-h-[40px] items-center gap-1 rounded-full border border-white/20 bg-white/[0.03] px-3 py-2 text-sm font-medium text-gray-300 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"
            >
              Show less
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}

export default ChipList;
