import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useOnClickOutside } from "./useOnClickOutside";

function makeRef<T extends HTMLElement>(element: T | null = null) {
  const ref = { current: element } as React.RefObject<T>;
  return ref;
}

describe("useOnClickOutside", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("calls handler when mousedown fires outside the ref element", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const ref = makeRef(container);
    const handler = vi.fn();

    renderHook(() => useOnClickOutside(ref, handler));

    // Click outside the container
    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does NOT call handler when mousedown fires inside the ref element", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const inner = document.createElement("button");
    container.appendChild(inner);

    const ref = makeRef(container);
    const handler = vi.fn();

    renderHook(() => useOnClickOutside(ref, handler));

    act(() => {
      inner.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("calls handler when touchstart fires outside the ref element", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const ref = makeRef(container);
    const handler = vi.fn();

    renderHook(() => useOnClickOutside(ref, handler));

    act(() => {
      document.dispatchEvent(new TouchEvent("touchstart", { bubbles: true }));
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does NOT call handler when touchstart fires inside the ref element", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const inner = document.createElement("button");
    container.appendChild(inner);

    const ref = makeRef(container);
    const handler = vi.fn();

    renderHook(() => useOnClickOutside(ref, handler));

    act(() => {
      inner.dispatchEvent(new TouchEvent("touchstart", { bubbles: true }));
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("does NOT call handler when enabled is false", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const ref = makeRef(container);
    const handler = vi.fn();

    renderHook(() =>
      useOnClickOutside(ref, handler, { enabled: false }),
    );

    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("stops listening when enabled transitions from true to false", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const ref = makeRef(container);
    const handler = vi.fn();

    const { rerender } = renderHook(
      ({ enabled }) => useOnClickOutside(ref, handler, { enabled }),
      { initialProps: { enabled: true } },
    );

    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });
    expect(handler).toHaveBeenCalledTimes(1);

    // Disable
    rerender({ enabled: false });

    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(handler).toHaveBeenCalledTimes(1); // no additional call
  });

  it("ignores clicks on the ignoreRef element", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const trigger = document.createElement("button");
    document.body.appendChild(trigger);

    const ref = makeRef(container);
    const ignoreRef = makeRef(trigger);
    const handler = vi.fn();

    renderHook(() =>
      useOnClickOutside(ref, handler, { ignoreRef }),
    );

    // Click the trigger button (should be ignored)
    act(() => {
      trigger.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(handler).not.toHaveBeenCalled();

    // Click truly outside
    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("removes listeners on unmount", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const ref = makeRef(container);
    const handler = vi.fn();

    const { unmount } = renderHook(() => useOnClickOutside(ref, handler));

    unmount();

    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    expect(handler).not.toHaveBeenCalled();
  });

  it("does not throw when ref.current is null", () => {
    const ref = makeRef<HTMLDivElement>(null);
    const handler = vi.fn();

    expect(() =>
      renderHook(() => useOnClickOutside(ref, handler)),
    ).not.toThrow();

    act(() => {
      document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    });

    // When ref.current is null, short-circuits the guard and considers
    // every click "outside" — the handler fires as expected.
    expect(handler).toHaveBeenCalled();
  });

  it("handles events where target is null gracefully", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    const ref = makeRef(container);
    const handler = vi.fn();

    renderHook(() => useOnClickOutside(ref, handler));

    // Simulate an event without a valid target
    const event = new MouseEvent("mousedown", { bubbles: true });
    Object.defineProperty(event, "target", { value: null });

    expect(() => {
      act(() => {
        document.dispatchEvent(event);
      });
    }).not.toThrow();

    // Handler not called because target is null and we guard
    expect(handler).not.toHaveBeenCalled();
  });
});
