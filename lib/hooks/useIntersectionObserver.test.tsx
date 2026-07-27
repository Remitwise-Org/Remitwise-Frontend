import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import React, { useRef } from "react";
import {
  useIntersectionObserver,
  useScrollSpy,
} from "./useIntersectionObserver";

// ─── IntersectionObserver mock ────────────────────────────────────────────────

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
  observedElements: Element[] = [];
  disconnect = vi.fn(() => {
    this.observedElements = [];
  });
  observe = vi.fn((el: Element) => {
    this.observedElements.push(el);
  });
  unobserve = vi.fn();

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  /** Simulate entries entering / leaving the viewport. */
  trigger(entries: Partial<IntersectionObserverEntry>[]) {
    this.callback(
      entries as IntersectionObserverEntry[],
      this as unknown as IntersectionObserver,
    );
  }
}

const originalIO = (global as any).IntersectionObserver;

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  (global as any).IntersectionObserver = MockIntersectionObserver;
});

afterEach(() => {
  (global as any).IntersectionObserver = originalIO;
  vi.restoreAllMocks();
});

// ─── useIntersectionObserver tests ───────────────────────────────────────────

describe("useIntersectionObserver", () => {
  function SingleElement({
    cb,
    options,
  }: {
    cb: IntersectionObserverCallback;
    options?: Parameters<typeof useIntersectionObserver>[1];
  }) {
    const ref = useIntersectionObserver<HTMLDivElement>(cb, options);
    return <div data-testid="target" ref={ref} />;
  }

  it("creates exactly one observer and observes the attached element", () => {
    const cb = vi.fn();
    render(<SingleElement cb={cb} />);

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(MockIntersectionObserver.instances[0].observedElements).toHaveLength(1);
  });

  it("invokes the callback when the observed entry fires", () => {
    const cb = vi.fn();
    render(<SingleElement cb={cb} />);

    const [instance] = MockIntersectionObserver.instances;
    instance.trigger([{ isIntersecting: true, target: instance.observedElements[0] }]);

    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("forwards IntersectionObserverInit options to the constructor", () => {
    const cb = vi.fn();
    render(
      <SingleElement
        cb={cb}
        options={{ rootMargin: "100px", threshold: 0.5 }}
      />,
    );

    const [instance] = MockIntersectionObserver.instances;
    expect(instance.options).toMatchObject({ rootMargin: "100px", threshold: 0.5 });
  });

  it("calls disconnect on unmount", () => {
    const cb = vi.fn();
    const { unmount } = render(<SingleElement cb={cb} />);
    const [instance] = MockIntersectionObserver.instances;

    unmount();

    expect(instance.disconnect).toHaveBeenCalledTimes(1);
  });

  it("does not create an observer when enabled=false", () => {
    const cb = vi.fn();
    render(<SingleElement cb={cb} options={{ enabled: false }} />);

    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it("does not create an observer when IntersectionObserver is unsupported", () => {
    delete (global as any).IntersectionObserver;

    const cb = vi.fn();
    render(<SingleElement cb={cb} />);

    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it("uses an explicit target ref when provided", () => {
    const cb = vi.fn();

    function ExplicitTarget({ cb }: { cb: IntersectionObserverCallback }) {
      const divRef = useRef<HTMLDivElement>(null);
      useIntersectionObserver(cb, {}, divRef);
      return <div data-testid="explicit" ref={divRef} />;
    }

    render(<ExplicitTarget cb={cb} />);

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    const [instance] = MockIntersectionObserver.instances;
    expect(instance.observedElements).toHaveLength(1);
  });

  it("does not recreate the observer when the callback reference changes", () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    function Wrapper({ cb }: { cb: IntersectionObserverCallback }) {
      const ref = useIntersectionObserver(cb);
      return <div ref={ref} />;
    }

    const { rerender } = render(<Wrapper cb={cb1} />);
    rerender(<Wrapper cb={cb2} />);

    // Still only one observer instance created
    expect(MockIntersectionObserver.instances).toHaveLength(1);
    expect(MockIntersectionObserver.instances[0].disconnect).not.toHaveBeenCalled();
  });

  it("calls the latest callback even after a re-render", () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();

    function Wrapper({ cb }: { cb: IntersectionObserverCallback }) {
      const ref = useIntersectionObserver(cb);
      return <div ref={ref} />;
    }

    const { rerender } = render(<Wrapper cb={cb1} />);
    rerender(<Wrapper cb={cb2} />);

    const [instance] = MockIntersectionObserver.instances;
    instance.trigger([{ isIntersecting: true, target: instance.observedElements[0] }]);

    expect(cb1).not.toHaveBeenCalled();
    expect(cb2).toHaveBeenCalledTimes(1);
  });
});

// ─── useScrollSpy tests ───────────────────────────────────────────────────────

describe("useScrollSpy", () => {
  const SECTION_IDS = ["section-a", "section-b", "section-c"];

  function createSections() {
    SECTION_IDS.forEach((id) => {
      const el = document.createElement("section");
      el.id = id;
      document.body.appendChild(el);
    });
  }

  function removeSections() {
    SECTION_IDS.forEach((id) => {
      document.getElementById(id)?.remove();
    });
  }

  function SpyHarness({
    onActivate,
    options,
  }: {
    onActivate: (id: string) => void;
    options?: Parameters<typeof useScrollSpy>[2];
  }) {
    useScrollSpy(SECTION_IDS, onActivate, options);
    return <div data-testid="harness" />;
  }

  beforeEach(() => {
    createSections();
  });

  afterEach(() => {
    removeSections();
  });

  it("creates a single observer and observes all section elements", () => {
    const onActivate = vi.fn();
    render(<SpyHarness onActivate={onActivate} />);

    expect(MockIntersectionObserver.instances).toHaveLength(1);
    const [instance] = MockIntersectionObserver.instances;
    expect(instance.observedElements).toHaveLength(SECTION_IDS.length);
  });

  it("activates the section with the highest intersectionRatio", () => {
    const onActivate = vi.fn();
    render(<SpyHarness onActivate={onActivate} />);

    const [instance] = MockIntersectionObserver.instances;
    act(() => {
      instance.trigger([
        { target: { id: "section-a" } as Element, intersectionRatio: 0.2 },
        { target: { id: "section-b" } as Element, intersectionRatio: 0.8 },
        { target: { id: "section-c" } as Element, intersectionRatio: 0.1 },
      ]);
    });

    expect(onActivate).toHaveBeenLastCalledWith("section-b");
  });

  it("does not call onActivate when all ratios are 0", () => {
    const onActivate = vi.fn();
    render(<SpyHarness onActivate={onActivate} />);

    const [instance] = MockIntersectionObserver.instances;
    act(() => {
      instance.trigger([
        { target: { id: "section-a" } as Element, intersectionRatio: 0 },
      ]);
    });

    expect(onActivate).not.toHaveBeenCalled();
  });

  it("calls disconnect on unmount", () => {
    const { unmount } = render(<SpyHarness onActivate={vi.fn()} />);
    const [instance] = MockIntersectionObserver.instances;

    unmount();

    expect(instance.disconnect).toHaveBeenCalledTimes(1);
  });

  it("does not create an observer when enabled=false", () => {
    render(<SpyHarness onActivate={vi.fn()} options={{ enabled: false }} />);

    expect(MockIntersectionObserver.instances).toHaveLength(0);
  });

  it("forwards IntersectionObserverInit options", () => {
    render(
      <SpyHarness
        onActivate={vi.fn()}
        options={{ rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.5, 1] }}
      />,
    );

    const [instance] = MockIntersectionObserver.instances;
    expect(instance.options).toMatchObject({
      rootMargin: "-20% 0px -60% 0px",
      threshold: [0, 0.5, 1],
    });
  });

  it("uses the latest onActivate callback after a re-render", () => {
    const first = vi.fn();
    const second = vi.fn();

    function Wrapper({ onActivate }: { onActivate: (id: string) => void }) {
      useScrollSpy(SECTION_IDS, onActivate);
      return null;
    }

    const { rerender } = render(<Wrapper onActivate={first} />);
    rerender(<Wrapper onActivate={second} />);

    const [instance] = MockIntersectionObserver.instances;
    act(() => {
      instance.trigger([
        { target: { id: "section-a" } as Element, intersectionRatio: 1 },
      ]);
    });

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("section-a");
  });
});
