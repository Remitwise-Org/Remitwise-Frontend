"use client";

import { useEffect } from "react";

interface UseOnClickOutsideOptions {
  /** Whether the listener is active (e.g. dropdown is open). Defaults to `true`. */
  enabled?: boolean;
  /** A ref to an element that should be ignored (e.g. the trigger button). */
  ignoreRef?: React.RefObject<HTMLElement>;
}

/**
 * Calls `handler` when the user clicks outside of the element referenced by `ref`.
 *
 * - Supports both `mousedown` and `touchstart` for mobile coverage.
 * - The `enabled` flag lets you toggle the listener on/off without remounting.
 * - An optional `ignoreRef` allows you to exclude a trigger element from
 *   "outside" detection (e.g. a button that toggles the popover).
 * - Cleans up listeners on unmount or when `enabled` becomes `false`.
 *
 * @param ref - A React ref pointing to the container element.
 * @param handler - Callback invoked when a click outside is detected.
 * @param options - Optional configuration (see {@link UseOnClickOutsideOptions}).
 *
 * @example
 * ```tsx
 * const dropdownRef = useRef<HTMLDivElement>(null);
 * const buttonRef = useRef<HTMLButtonElement>(null);
 * const [open, setOpen] = useState(false);
 *
 * useOnClickOutside(dropdownRef, () => setOpen(false), {
 *   enabled: open,
 *   ignoreRef: buttonRef,
 * });
 * ```
 */
export function useOnClickOutside(
  ref: React.RefObject<HTMLElement>,
  handler: () => void,
  options: UseOnClickOutsideOptions = {},
): void {
  const { enabled = true, ignoreRef } = options;

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      // Ignore clicks on the trigger button (if provided)
      if (ignoreRef?.current && ignoreRef.current.contains(target)) {
        return;
      }

      // Ignore clicks inside the container
      if (ref.current && ref.current.contains(target)) {
        return;
      }

      handler();
    };

    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);

    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [enabled, ref, handler, ignoreRef]);
}
