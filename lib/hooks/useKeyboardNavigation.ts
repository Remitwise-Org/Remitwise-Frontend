"use client";

import { useEffect, type RefObject } from "react";

export interface UseKeyboardNavigationOptions {
  containerRef: RefObject<HTMLElement | null>;
  isActive: boolean;
  onEscape?: () => void;
  orientation?: "vertical" | "horizontal";
  selector?: string;
}

/**
 * Roving arrow-key navigation between items matching `selector` inside
 * `containerRef`, plus Escape handling. Home/End jump to the first/last item.
 */
export function useKeyboardNavigation({
  containerRef,
  isActive,
  onEscape,
  orientation = "vertical",
  selector = '[role="menuitem"]',
}: UseKeyboardNavigationOptions): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!isActive || !container) return;

    const prevKey = orientation === "vertical" ? "ArrowUp" : "ArrowLeft";
    const nextKey = orientation === "vertical" ? "ArrowDown" : "ArrowRight";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onEscape?.();
        return;
      }
      if (![prevKey, nextKey, "Home", "End"].includes(event.key)) return;

      const items = Array.from(container.querySelectorAll<HTMLElement>(selector));
      if (items.length === 0) return;
      event.preventDefault();

      const current = items.indexOf(document.activeElement as HTMLElement);
      let next = 0;
      if (event.key === "Home") next = 0;
      else if (event.key === "End") next = items.length - 1;
      else if (event.key === nextKey) next = current < 0 ? 0 : (current + 1) % items.length;
      else next = current <= 0 ? items.length - 1 : current - 1;
      items[next]?.focus();
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [containerRef, isActive, onEscape, orientation, selector]);
}
