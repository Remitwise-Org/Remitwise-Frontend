import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import fc from "fast-check";
import { useElementSize } from "@/lib/hooks/useElementSize";

describe("useElementSize update behaviour", () => {
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

  it("reports_new_size_after_simulated_resize", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            width: fc.integer({ min: 0, max: 10000 }),
            height: fc.integer({ min: 0, max: 10000 }),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (sizes) => {
          const { result, unmount } = renderHook(() => useElementSize());
          
          const element = document.createElement("div");
          (result.current.ref as any).current = element;

          for (const size of sizes) {
            act(() => {
              if (triggerResize) {
                triggerResize([
                  {
                    contentRect: size,
                  },
                ]);
              }
            });

            expect(result.current.width).toBe(size.width);
            expect(result.current.height).toBe(size.height);
          }
          
          unmount();
        }
      )
    );
  });

  it("ignores_empty_resize_entries", () => {
    const { result, unmount } = renderHook(() => useElementSize());
    
    act(() => {
      if (triggerResize) {
        triggerResize([]); // Empty array
      }
    });

    expect(result.current.width).toBe(0);
    expect(result.current.height).toBe(0);

    unmount();
  });
it("handles_multiple_resize_entries", () => {
  const { result, unmount } = renderHook(() => useElementSize());
  const sizes = [{ width: 100, height: 200 }, { width: 300, height: 400 }, { width: 500, height: 600 }];
  act(() => {
    if (triggerResize) {
      triggerResize(sizes.map(s => ({ contentRect: s })));
    }
  });
  const last = sizes[sizes.length - 1];
  expect(result.current.width).toBe(last.width);
  expect(result.current.height).toBe(last.height);
  unmount();
});
});
