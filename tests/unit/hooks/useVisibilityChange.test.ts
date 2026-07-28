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

  // -------------------------------------------------------------------------
  // Listener lifecycle
  // -------------------------------------------------------------------------

  it("adds visibilitychange listener on mount", () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");

    renderHook(() => useVisibilityChange());

    expect(addEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
  });

  it("cleans up event listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useVisibilityChange());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );
  });

  it("listener and listener only added once per mount", () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");

    renderHook(() => useVisibilityChange());

    const visibilityChangeCalls = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === "visibilitychange",
    );
    expect(visibilityChangeCalls).toHaveLength(1);
  });

  it("does not fire callbacks after unmount (sad path)", () => {
    setDocumentHidden(false);
    const onHidden = vi.fn();
    const onVisible = vi.fn();
    const onChange = vi.fn();

    const { unmount } = renderHook(() =>
      useVisibilityChange({ onHidden, onVisible, onChange }),
    );

    // Clear the initial onChange call fired synchronously in useEffect
    onChange.mockClear();

    unmount();

    // Dispatch a visibility event after the hook is unmounted
    act(() => {
      setDocumentHidden(true);
    });

    expect(onHidden).not.toHaveBeenCalled();
    expect(onVisible).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("removes the exact same listener function that was added", () => {
    const addedListeners: EventListener[] = [];
    const removedListeners: EventListener[] = [];

    vi.spyOn(document, "addEventListener").mockImplementation(
      (event: string, listener: EventListenerOrEventListenerObject) => {
        if (event === "visibilitychange") {
          addedListeners.push(listener as EventListener);
        }
      },
    );
    vi.spyOn(document, "removeEventListener").mockImplementation(
      (event: string, listener: EventListenerOrEventListenerObject) => {
        if (event === "visibilitychange") {
          removedListeners.push(listener as EventListener);
        }
      },
    );

    const { unmount } = renderHook(() => useVisibilityChange());
    unmount();

    expect(addedListeners).toHaveLength(1);
    expect(removedListeners).toHaveLength(1);
    expect(removedListeners[0]).toBe(addedListeners[0]);
  });
});
