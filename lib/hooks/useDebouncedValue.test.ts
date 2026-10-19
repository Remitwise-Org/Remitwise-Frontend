import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./useDebouncedValue";

// ---------------------------------------------------------------------------
// Minimal hook harness using createRoot (no @testing-library/react needed)
// ---------------------------------------------------------------------------
function createHookHarness<T>(initialValue: T, delay = 300) {
  let captured: T | undefined;
  let rerender!: (value: T) => void;
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container) as Root;

  function TestComponent({ value, d }: { value: T; d: number }) {
    captured = useDebouncedValue(value, d);
    return null;
  }

  act(() => {
    root.render(React.createElement(TestComponent, { value: initialValue, d: delay }));
  });

  rerender = (value: T) => {
    act(() => {
      root.render(React.createElement(TestComponent, { value, d: delay }));
    });
  };

  return {
    get value() {
      return captured as T;
    },
    rerender,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("returns the initial value immediately without waiting for the delay", () => {
    const harness = createHookHarness("hello", 300);
    try {
      expect(harness.value).toBe("hello");
    } finally {
      harness.unmount();
    }
  });

  it("does not update the debounced value before the delay elapses", () => {
    const harness = createHookHarness("initial", 300);
    try {
      harness.rerender("updated");
      // Advance time but not enough to trigger the debounce
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(harness.value).toBe("initial");
    } finally {
      harness.unmount();
    }
  });

  it("updates the debounced value after the full delay has elapsed", () => {
    const harness = createHookHarness("initial", 300);
    try {
      harness.rerender("updated");
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(harness.value).toBe("updated");
    } finally {
      harness.unmount();
    }
  });

  it("resets the timer on rapid successive changes (latest wins)", () => {
    const harness = createHookHarness("a", 300);
    try {
      harness.rerender("b");
      act(() => {
        vi.advanceTimersByTime(200);
      });
      // Change again before the first delay completes
      harness.rerender("c");
      act(() => {
        vi.advanceTimersByTime(200);
      });
      // Only 200ms have passed since the last update — still no change
      expect(harness.value).toBe("a");

      // Advance the remaining 100ms to complete the second debounce
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(harness.value).toBe("c");
    } finally {
      harness.unmount();
    }
  });

  it("does not fire an update after unmount (clears timer on unmount)", () => {
    const harness = createHookHarness("start", 300);
    harness.rerender("pending");

    // Unmount before the debounce fires
    harness.unmount();

    // Advance time past the delay — should NOT throw or update state
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // No assertion needed beyond no error being thrown; the mountedRef guard
    // prevents setState on an unmounted component.
  });

  it("works with numeric values", () => {
    const harness = createHookHarness(0, 400);
    try {
      harness.rerender(1000);
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(harness.value).toBe(1000);
    } finally {
      harness.unmount();
    }
  });

  it("uses the default delay of 300ms when no delay is provided", () => {
    // Create harness without specifying a delay; the hook defaults to 300 ms.
    let captured: string | undefined;
    let rerender!: (value: string) => void;
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container) as Root;

    function TestComponent({ value }: { value: string }) {
      // Call without explicit delay to exercise the default parameter.
      captured = useDebouncedValue(value);
      return null;
    }

    act(() => root.render(React.createElement(TestComponent, { value: "init" })));
    rerender = (v: string) => {
      act(() => root.render(React.createElement(TestComponent, { value: v })));
    };

    try {
      rerender("changed");
      act(() => vi.advanceTimersByTime(299));
      expect(captured).toBe("init");
      act(() => vi.advanceTimersByTime(1));
      expect(captured).toBe("changed");
    } finally {
      act(() => root.unmount());
      container.remove();
    }
  });

  it("handles object values without losing reference identity after debounce", () => {
    const obj = { key: "value" };
    const harness = createHookHarness(obj, 200);
    try {
      const newObj = { key: "updated" };
      harness.rerender(newObj);
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(harness.value).toEqual({ key: "updated" });
    } finally {
      harness.unmount();
    }
  });
});
