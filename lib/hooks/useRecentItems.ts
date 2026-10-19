"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * A reusable hook to track the most recently accessed items in localStorage.
 * Keeps items bounded to `maxItems`.
 * 
 * @param storageKey The localStorage key
 * @param maxItems The maximum number of items to keep (default: 5)
 * @param isEqual Optional function to determine equality of two items. Defaults to strict equality (===).
 */
export function useRecentItems<T>(
  storageKey: string,
  maxItems: number = 5,
  isEqual: (a: T, b: T) => boolean = (a, b) => a === b
) {
  const [items, setItems] = useState<T[]>([]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.warn(`Failed to parse recent items from localStorage for key ${storageKey}`, e);
    }
  }, [storageKey]);

  const addItem = useCallback(
    (item: T) => {
      setItems((currentItems) => {
        const filtered = currentItems.filter((i) => !isEqual(i, item));
        const updated = [item, ...filtered].slice(0, maxItems);

        try {
          window.localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (e) {
          console.warn(`Failed to save recent items to localStorage for key ${storageKey}`, e);
        }

        return updated;
      });
    },
    [storageKey, maxItems, isEqual]
  );

  const clearItems = useCallback(() => {
    setItems([]);
    try {
      window.localStorage.removeItem(storageKey);
    } catch (e) {
      console.warn(`Failed to clear recent items from localStorage for key ${storageKey}`, e);
    }
  }, [storageKey]);

  return { items, addItem, clearItems };
}
