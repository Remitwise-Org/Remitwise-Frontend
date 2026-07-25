import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRouteTransition } from "./useRouteTransition";

function makeMql(initialMatches: boolean) {
  const listeners: Array<(e: Partial<MediaQueryListEvent>) => void> = [];

  const mql = {
    matches: initialMatches,
    addEventListener: vi.fn(
      (_: string, cb: (e: Partial<MediaQueryListEvent>) => void) => {
        listeners.push(cb);
      },
    ),
    removeEventListener: vi.fn(
      (_: string, cb: (e: Partial<MediaQueryListEvent>) => void) => {
        const idx = listeners.indexOf(cb);
        if (idx !== -1) listeners.splice(idx, 1);
      },
    ),
    addListener: undefined,
    removeListener: undefined,
    dispatchChange(newMatches: boolean) {
      mql.matches = newMatches;
      listeners.forEach(
        (cb) => cb({ matches: newMatches } as MediaQueryListEvent),
      );
    },
  };

  return mql;
}

describe("useRouteTransition", () => {
  let mql: ReturnType<typeof makeMql>;

  beforeEach(() => {
    mql = makeMql(false);
    vi.spyOn(window, "matchMedia").mockReturnValue(
      mql as unknown as MediaQueryList,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns default animation classes when reduced motion is not active", () => {
    const { result } = renderHook(() => useRouteTransition());
    expect(result.current.animationClasses).toBe(
      "animate-in fade-in slide-in-from-left-4 duration-300",
    );
  });

  it("returns empty animationClasses when prefers reduced motion", () => {
    mql = makeMql(true);
    vi.spyOn(window, "matchMedia").mockReturnValue(
      mql as unknown as MediaQueryList,
    );

    const { result } = renderHook(() => useRouteTransition());
    expect(result.current.animationClasses).toBe("");
  });

  it("respects direction option", () => {
    const { result } = renderHook(() =>
      useRouteTransition({ direction: "right" }),
    );
    expect(result.current.animationClasses).toBe(
      "animate-in fade-in slide-in-from-right-4 duration-300",
    );
  });

  it("respects duration option", () => {
    const { result } = renderHook(() =>
      useRouteTransition({ duration: 500 }),
    );
    expect(result.current.animationClasses).toBe(
      "animate-in fade-in slide-in-from-left-4 duration-500",
    );
  });

  it("respects duration with 100ms", () => {
    const { result } = renderHook(() =>
      useRouteTransition({ duration: 100 }),
    );
    expect(result.current.animationClasses).toBe(
      "animate-in fade-in slide-in-from-left-4 duration-100",
    );
  });

  it("returns className only when animateOnMount is false", () => {
    const { result } = renderHook(() =>
      useRouteTransition({ animateOnMount: false, className: "my-class" }),
    );
    expect(result.current.animationClasses).toBe("my-class");
  });

  it("appends custom className to the default animation classes", () => {
    const { result } = renderHook(() =>
      useRouteTransition({ className: "max-w-2xl mx-auto" }),
    );
    expect(result.current.animationClasses).toBe(
      "animate-in fade-in slide-in-from-left-4 duration-300 max-w-2xl mx-auto",
    );
  });

  it("returns className when both reduced motion and animateOnMount:false", () => {
    mql = makeMql(true);
    vi.spyOn(window, "matchMedia").mockReturnValue(
      mql as unknown as MediaQueryList,
    );

    const { result } = renderHook(() =>
      useRouteTransition({ animateOnMount: false, className: "static-class" }),
    );
    expect(result.current.animationClasses).toBe("static-class");
  });

  it("returns prefersReducedMotion as false by default", () => {
    const { result } = renderHook(() => useRouteTransition());
    expect(result.current.prefersReducedMotion).toBe(false);
  });

  it("returns prefersReducedMotion as true when reduce is active", () => {
    mql = makeMql(true);
    vi.spyOn(window, "matchMedia").mockReturnValue(
      mql as unknown as MediaQueryList,
    );

    const { result } = renderHook(() => useRouteTransition());
    expect(result.current.prefersReducedMotion).toBe(true);
  });

  it("supports all four directions", () => {
    const directions = ["left", "right", "top", "bottom"] as const;
    for (const dir of directions) {
      const { result } = renderHook(() =>
        useRouteTransition({ direction: dir }),
      );
      expect(result.current.animationClasses).toContain(
        `slide-in-from-${dir}-4`,
      );
    }
  });

  it("supports all duration values", () => {
    const durations = [75, 100, 150, 200, 300, 500, 700, 1000] as const;
    for (const dur of durations) {
      const { result } = renderHook(() =>
        useRouteTransition({ duration: dur }),
      );
      expect(result.current.animationClasses).toContain(`duration-${dur}`);
    }
  });
});
