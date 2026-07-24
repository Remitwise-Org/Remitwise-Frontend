import { useState, useEffect } from 'react';

/**
 * Returns `true` when the user has opted into reduced motion via the OS
 * accessibility setting (`prefers-reduced-motion: reduce`).
 *
 * - SSR-safe: defaults to `false` on the server so hydration never mismatches.
 * - Reactive: updates immediately when the OS preference changes at runtime.
 * - Backwards-compatible with older browsers via a `addListener` fallback.
 *
 * Usage:
 * ```tsx
 * const prefersReducedMotion = usePrefersReducedMotion();
 * // Then gate any JS-driven animation:
 * <motion.div animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }} />
 * // Or for class-based animations:
 * className={prefersReducedMotion ? '' : 'animate-in fade-in duration-300'}
 * ```
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    // Set the initial value now that we're on the client.
    updatePreference();

    // Modern browsers
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', updatePreference);
      return () => mediaQuery.removeEventListener('change', updatePreference);
    }

    // Legacy Safari < 14
    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(updatePreference);
      return () => mediaQuery.removeListener(updatePreference);
    }
  }, []);

  return prefersReducedMotion;
}