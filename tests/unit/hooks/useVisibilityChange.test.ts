import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useVisibilityChange } from "@/lib/hooks/useVisibilityChange";

describe("useVisibilityChange", () => {
  let originalHidden: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalHidden = Object.getOwnPropertyDescriptor(document, "hidden");
  });

  afterEach(() => {
    if (originalHidden) {
      Object.defineProperty(document, "hidden", originalHidden);
    }
    vi.restoreAllMocks();
  });

  const setDocumentHidden = (hidden: boolean) => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => hidden,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  };

  it("returns initial document visibility state", () => {
    setDocumentHidden(false);
    const { result } = renderHook(() => useVisibilityChange());
    expect(result.current).toBe(true);
  });

  it("fires onHidden when document becomes hidden", () => {
    setDocumentHidden(false);
    const onHidden = vi.fn();
    const { result } = renderHook(() => useVisibilityChange({ onHidden }));

    act(() => {
      setDocumentHidden(true);
    });

    expect(result.current).toBe(false);
    expect(onHidden).toHaveBeenCalledTimes(1);
  });

  it("fires onVisible when document becomes visible", () => {
    setDocumentHidden(true);
    const onVisible = vi.fn();
    const { result } = renderHook(() => useVisibilityChange({ onVisible }));

    act(() => {
      setDocumentHidden(false);
    });

    expect(result.current).toBe(true);
    expect(onVisible).toHaveBeenCalledTimes(1);
  });

  it("fires onChange on any visibility transition", () => {
    setDocumentHidden(false);
    const onChange = vi.fn();
    renderHook(() => useVisibilityChange({ onChange }));

    act(() => {
      setDocumentHidden(true);
    });
    expect(onChange).toHaveBeenCalledWith(false);

    act(() => {
      setDocumentHidden(false);
    });
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("cleans up event listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useVisibilityChange());

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });
});
