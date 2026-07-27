"use client";

import { useState, useCallback, RefObject } from "react";
import { useResizeObserver, ElementTarget } from "./useResizeObserver";

export interface ElementSize {
  width: number;
  height: number;
}

export function useElementSize<T extends Element = HTMLElement>(
  target?: ElementTarget<T>
): {
  ref: RefObject<T | null>;
  width: number;
  height: number;
} {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
    if (!entries.length) return;
    const entry = entries[entries.length - 1];
    const { width, height } = entry.contentRect;
    setSize((prev) =>
      prev.width === width && prev.height === height
        ? prev
        : { width, height }
    );
  }, []);

  const ref = useResizeObserver<T>(handleResize, target);

  return { ref, width: size.width, height: size.height };
}
