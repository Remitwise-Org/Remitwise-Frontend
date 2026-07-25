import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useResizeObserver, ResizeObserverCallback } from "./useResizeObserver";

class MockResizeObserver {
  static instances: MockResizeObserver[] = [];

  callback: ResizeObserverCallback;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    MockResizeObserver.instances.push(this);
  }

  trigger(entries: Partial<ResizeObserverEntry>[]) {
    this.callback(entries as ResizeObserverEntry[], this as unknown as ResizeObserver);
  }
}

describe("useResizeObserver", () => {
  beforeEach(() => {
    MockResizeObserver.instances = [];
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("disconnects_resize_observer_on_unmount", () => {
    const element = document.createElement("div");
    const callback = vi.fn();

    const { unmount } = renderHook(() => useResizeObserver(callback, element));

    expect(MockResizeObserver.instances).toHaveLength(1);
    const observerInstance = MockResizeObserver.instances[0];

    expect(observerInstance.disconnect).not.toHaveBeenCalled();

    unmount();

    expect(observerInstance.disconnect).toHaveBeenCalledTimes(1);
  });

  it("observes_target_when_element_exists", () => {
    const element = document.createElement("div");
    const callback = vi.fn();

    renderHook(() => useResizeObserver(callback, element));

    expect(MockResizeObserver.instances).toHaveLength(1);
    const observerInstance = MockResizeObserver.instances[0];

    expect(observerInstance.observe).toHaveBeenCalledWith(element);

    const fakeEntries = [{ target: element, contentRect: {} }] as unknown as ResizeObserverEntry[];
    observerInstance.trigger(fakeEntries);

    expect(callback).toHaveBeenCalledWith(fakeEntries, observerInstance);
  });

  it("handles_missing_target_element_gracefully", () => {
    const callback = vi.fn();

    const { unmount } = renderHook(() => useResizeObserver(callback, null));

    expect(MockResizeObserver.instances).toHaveLength(0);

    expect(() => unmount()).not.toThrow();
  });

  it("cleans_up_old_target_and_observes_new_target_on_change", () => {
    const elementA = document.createElement("div");
    const elementB = document.createElement("div");
    const callback = vi.fn();

    const { rerender } = renderHook(
      ({ target }) => useResizeObserver(callback, target),
      { initialProps: { target: elementA } }
    );

    expect(MockResizeObserver.instances).toHaveLength(1);
    const observerA = MockResizeObserver.instances[0];
    expect(observerA.observe).toHaveBeenCalledWith(elementA);

    rerender({ target: elementB });

    expect(observerA.unobserve).toHaveBeenCalledWith(elementA);
    expect(observerA.disconnect).toHaveBeenCalledTimes(1);

    expect(MockResizeObserver.instances).toHaveLength(2);
    const observerB = MockResizeObserver.instances[1];
    expect(observerB.observe).toHaveBeenCalledWith(elementB);
  });

  it("handles_multiple_hook_instances_independently", () => {
    const element1 = document.createElement("div");
    const element2 = document.createElement("div");
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const hook1 = renderHook(() => useResizeObserver(callback1, element1));
    const hook2 = renderHook(() => useResizeObserver(callback2, element2));

    expect(MockResizeObserver.instances).toHaveLength(2);
    const instance1 = MockResizeObserver.instances[0];
    const instance2 = MockResizeObserver.instances[1];

    hook1.unmount();

    expect(instance1.disconnect).toHaveBeenCalledTimes(1);
    expect(instance2.disconnect).not.toHaveBeenCalled();

    hook2.unmount();

    expect(instance2.disconnect).toHaveBeenCalledTimes(1);
  });

  it("regression_verifies_disconnect_is_called_on_unmount", () => {
    const element = document.createElement("div");
    const callback = vi.fn();

    const { unmount } = renderHook(() => useResizeObserver(callback, element));

    const observer = MockResizeObserver.instances[0];
    expect(observer).toBeDefined();

    unmount();

    expect(observer.disconnect).toHaveBeenCalledTimes(1);
  });

  it("observes_target_element_via_ref_object", () => {
    const element = document.createElement("div");
    const callback = vi.fn();
    const ref = { current: element };

    const { unmount } = renderHook(() => useResizeObserver(callback, ref));

    expect(MockResizeObserver.instances).toHaveLength(1);
    const observerInstance = MockResizeObserver.instances[0];
    expect(observerInstance.observe).toHaveBeenCalledWith(element);

    unmount();
    expect(observerInstance.disconnect).toHaveBeenCalledTimes(1);
  });
});
