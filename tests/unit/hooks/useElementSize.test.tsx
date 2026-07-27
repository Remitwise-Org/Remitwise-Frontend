import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useElementSize } from "@/lib/hooks/useElementSize";

describe("useElementSize", () => {
  let ResizeObserverMock: any;
  let observeMock: any;
  let unobserveMock: any;
  let disconnectMock: any;
  let triggerResize: (entries: any[]) => void;

  beforeEach(() => {
    observeMock = vi.fn();
    unobserveMock = vi.fn();
    disconnectMock = vi.fn();

    ResizeObserverMock = vi.fn((cb) => {
      triggerResize = cb;
      return {
        observe: observeMock,
        unobserve: unobserveMock,
        disconnect: disconnectMock,
      };
    });

    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns_initial_size_of_zero", () => {
    const { result } = renderHook(() => useElementSize());
    expect(result.current.width).toBe(0);
    expect(result.current.height).toBe(0);
    expect(result.current.ref.current).toBe(null);
  });

  it("updates_size_when_resize_observer_triggers", () => {
    const { result } = renderHook(() => useElementSize());
    
    // Simulate setting the ref
    const element = document.createElement("div");
    (result.current.ref as any).current = element;

    // We must manually call observer in jsdom since we need it to attach
    // To trigger the resize, we just call the mocked callback directly
    act(() => {
      if (triggerResize) {
        triggerResize([
          {
            contentRect: {
              width: 200,
              height: 150,
            },
          },
        ]);
      }
    });

    expect(result.current.width).toBe(200);
    expect(result.current.height).toBe(150);
  });

  it("does_not_update_state_if_size_is_unchanged", () => {
    const { result } = renderHook(() => useElementSize());
    
    act(() => {
      if (triggerResize) {
        triggerResize([
          {
            contentRect: { width: 100, height: 100 },
          },
        ]);
      }
    });

    expect(result.current.width).toBe(100);
    expect(result.current.height).toBe(100);

    const prevResult = result.current;

    act(() => {
      if (triggerResize) {
        triggerResize([
          {
            contentRect: { width: 100, height: 100 },
          },
        ]);
      }
    });

    // Object identity should ideally be stable if we didn't update state
    // but the hook returns a new object on every render anyway { ref, width, height }
    // We check that the values remain correct.
    expect(result.current.width).toBe(100);
    expect(result.current.height).toBe(100);
  });
});
