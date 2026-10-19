"use client";

import { useEffect, useRef, RefObject } from "react";

export type ResizeObserverCallback = (
  entries: ResizeObserverEntry[],
  observer: ResizeObserver
) => void;

export type ElementTarget<T extends Element = Element> =
  | T
  | RefObject<T | null>
  | null
  | undefined;

function getTargetElement<T extends Element>(
  target?: ElementTarget<T>
): T | null {
  if (!target) return null;
  if ("current" in target) return target.current;
  return target;
}

export function useResizeObserver<T extends Element = HTMLElement>(
  callback?: ResizeObserverCallback,
  target?: ElementTarget<T>
): RefObject<T | null> {
  const internalRef = useRef<T | null>(null);
  const savedCallback = useRef<ResizeObserverCallback | undefined>(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  const resolvedElement = getTargetElement(target) ?? internalRef.current;

  useEffect(() => {
    const element = getTargetElement(target) ?? internalRef.current;

    if (!element || typeof window === "undefined" || !("ResizeObserver" in window)) {
      return;
    }

    const observer = new ResizeObserver((entries, obs) => {
      savedCallback.current?.(entries, obs);
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
      observer.disconnect();
    };
  }, [target, resolvedElement]);

  return internalRef;
}
