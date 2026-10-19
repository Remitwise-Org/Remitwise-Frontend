import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePrefersReducedMotion } from './usePrefersReducedMotion';

/**
 * Factory that creates a minimal MediaQueryList mock.
 * `matches` starts at the supplied value and `dispatchChange` lets tests
 * simulate the OS preference changing at runtime.
 */
function makeMql(initialMatches: boolean) {
  const listeners: Array<(e: Partial<MediaQueryListEvent>) => void> = [];

  const mql = {
    matches: initialMatches,
    addEventListener: vi.fn((_: string, cb: (e: Partial<MediaQueryListEvent>) => void) => {
      listeners.push(cb);
    }),
    removeEventListener: vi.fn((_: string, cb: (e: Partial<MediaQueryListEvent>) => void) => {
      const idx = listeners.indexOf(cb);
      if (idx !== -1) listeners.splice(idx, 1);
    }),
    addListener: undefined,
    removeListener: undefined,
    dispatchChange(newMatches: boolean) {
      mql.matches = newMatches;
      listeners.forEach((cb) => cb({ matches: newMatches } as MediaQueryListEvent));
    },
  };

  return mql;
}

describe('usePrefersReducedMotion', () => {
  let mql: ReturnType<typeof makeMql>;

  beforeEach(() => {
    mql = makeMql(false);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when prefers-reduced-motion is not set', () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });

  it('returns true when prefers-reduced-motion: reduce is active', () => {
    mql = makeMql(true);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList);

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it('updates reactively when OS preference changes to reduce', () => {
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      mql.dispatchChange(true);
    });

    expect(result.current).toBe(true);
  });

  it('updates reactively when OS preference changes back to no-preference', () => {
    mql = makeMql(true);
    vi.spyOn(window, 'matchMedia').mockReturnValue(mql as unknown as MediaQueryList);

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);

    act(() => {
      mql.dispatchChange(false);
    });

    expect(result.current).toBe(false);
  });

  it('removes the event listener on unmount', () => {
    const { unmount } = renderHook(() => usePrefersReducedMotion());
    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledTimes(1);
  });

  it('falls back to addListener/removeListener on legacy browsers', () => {
    const legacyMql = {
      matches: false,
      addEventListener: undefined,
      removeEventListener: undefined,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };
    vi.spyOn(window, 'matchMedia').mockReturnValue(legacyMql as unknown as MediaQueryList);

    const { unmount } = renderHook(() => usePrefersReducedMotion());
    expect(legacyMql.addListener).toHaveBeenCalledTimes(1);

    unmount();
    expect(legacyMql.removeListener).toHaveBeenCalledTimes(1);
  });

  it('does not throw when matchMedia is unavailable (SSR-like environment)', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(undefined as unknown as typeof window.matchMedia);
    expect(() => renderHook(() => usePrefersReducedMotion())).not.toThrow();
  });
});