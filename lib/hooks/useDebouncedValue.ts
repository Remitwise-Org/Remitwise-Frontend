"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Returns a debounced snapshot of `value` that only updates after the user
 * pauses for `delay` milliseconds.
 *
 * - Pending timers are cancelled on rapid value changes (latest wins).
 * - The timer is cleared on unmount to prevent state updates on
 *   unmounted components.
 *
 * @template T - The type of the value being debounced.
 * @param value - The value to debounce.
 * @param delay - Debounce delay in milliseconds (default: 300 ms).
 * @returns The debounced value.
 *
 * @example
 * ```tsx
 * const [amount, setAmount] = useState("");
 * const debouncedAmount = useDebouncedValue(amount, 400);
 *
 * useEffect(() => {
 *   if (debouncedAmount) fetchQuote(debouncedAmount);
 * }, [debouncedAmount]);
 * ```
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (mountedRef.current) {
        setDebouncedValue(value);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
