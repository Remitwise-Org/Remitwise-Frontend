"use client";

import { useMemo } from "react";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

type TransitionDirection = "left" | "right" | "top" | "bottom";

type TransitionDuration = 75 | 100 | 150 | 200 | 300 | 500 | 700 | 1000;

interface UseRouteTransitionOptions {
  direction?: TransitionDirection;
  duration?: TransitionDuration;
  /** Avoid double-animation when remounting the same route. Default: true. */
  animateOnMount?: boolean;
  /** Additional CSS class names merged into the result. */
  className?: string;
}

interface UseRouteTransitionReturn {
  /** CSS class string for the page container. Empty when reduced-motion is active. */
  animationClasses: string;
  /** True when the OS prefers reduced motion. Use to gate other JS animations. */
  prefersReducedMotion: boolean;
}

const SLIDE_CLASS: Record<TransitionDirection, string> = {
  left: "slide-in-from-left-4",
  right: "slide-in-from-right-4",
  top: "slide-in-from-top-4",
  bottom: "slide-in-from-bottom-4",
};

const DURATION_CLASS: Record<TransitionDuration, string> = {
  75: "duration-75",
  100: "duration-100",
  150: "duration-150",
  200: "duration-200",
  300: "duration-300",
  500: "duration-500",
  700: "duration-700",
  1000: "duration-1000",
};

export function useRouteTransition(
  options?: UseRouteTransitionOptions,
): UseRouteTransitionReturn {
  const prefersReducedMotion = usePrefersReducedMotion();

  const { direction = "left", duration = 300, animateOnMount = true, className = "" } =
    options ?? {};

  const animationClasses = useMemo(() => {
    if (prefersReducedMotion || !animateOnMount) {
      return className;
    }

    const base = `animate-in fade-in ${SLIDE_CLASS[direction]} ${DURATION_CLASS[duration]}`;
    return className ? `${base} ${className}` : base;
  }, [prefersReducedMotion, direction, duration, animateOnMount, className]);

  return { animationClasses, prefersReducedMotion };
}
