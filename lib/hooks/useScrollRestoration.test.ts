import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useScrollRestoration } from "./useScrollRestoration";

const mockUsePathname = vi.fn<string, []>();
const mockUseSearchParams = vi.fn<{ toString: () => string }, []>();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
  useSearchParams: () => mockUseSearchParams(),
}));

function createHookHarness() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container) as Root;

  function TestComponent() {
    useScrollRestoration();
    return null;
  }

  act(() => {
    root.render(React.createElement(TestComponent));
  });

  return {
    rerender() {
      act(() => {
        root.render(React.createElement(TestComponent));
      });
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function setRoute(pathname: string, search = "") {
  mockUsePathname.mockReturnValue(pathname);
  mockUseSearchParams.mockReturnValue({
    toString: () => search,
  });

  Object.defineProperty(window, "location", {
    value: {
      pathname,
      search: search ? `?${search}` : "",
    },
    writable: true,
    configurable: true,
  });
}

describe("useScrollRestoration", () => {
  let scrollToMock: ReturnType<typeof vi.fn>;
  let sessionStore: Map<string, string>;
  let scrollX = 0;
  let scrollY = 0;

  beforeEach(() => {
    vi.useFakeTimers();
    scrollToMock = vi.fn((x: number, y: number) => {
      scrollX = x;
      scrollY = y;
    });
    sessionStore = new Map();

    Object.defineProperty(window, "scrollTo", {
      value: scrollToMock,
      writable: true,
      configurable: true,
    });
    Object.defineProperty(window, "scrollX", {
      get: () => scrollX,
      configurable: true,
    });
    Object.defineProperty(window, "scrollY", {
      get: () => scrollY,
      configurable: true,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 4000,
      configurable: true,
    });
    Object.defineProperty(document.body, "scrollHeight", {
      value: 4000,
      configurable: true,
    });
    Object.defineProperty(window, "innerHeight", {
      value: 800,
      configurable: true,
    });

    vi.spyOn(window.sessionStorage, "getItem").mockImplementation((key) =>
      sessionStore.get(String(key)) ?? null,
    );
    vi.spyOn(window.sessionStorage, "setItem").mockImplementation((key, value) => {
      sessionStore.set(String(key), String(value));
    });

    setRoute("/dashboard");
    scrollX = 0;
    scrollY = 0;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    delete (window as unknown as { __rw_skip_scroll_restore?: boolean })
      .__rw_skip_scroll_restore;
  });

  it("sets history.scrollRestoration to manual on mount", () => {
    const original = window.history.scrollRestoration;
    const harness = createHookHarness();
    try {
      expect(window.history.scrollRestoration).toBe("manual");
    } finally {
      window.history.scrollRestoration = original;
      harness.unmount();
    }
  });

  it("scrolls to the top on a push-style route change", () => {
    const harness = createHookHarness();
    try {
      scrollToMock.mockClear();
      scrollY = 500;

      setRoute("/dashboard/goals");
      harness.rerender();

      expect(scrollToMock).toHaveBeenCalledWith(0, 0);
    } finally {
      harness.unmount();
    }
  });

  it("restores a saved scroll position on history navigation", () => {
    sessionStore.set(
      "rw:scroll:/dashboard/goals",
      JSON.stringify({ x: 0, y: 1200 }),
    );

    const harness = createHookHarness();
    try {
      scrollToMock.mockClear();

      window.dispatchEvent(new PopStateEvent("popstate"));
      setRoute("/dashboard/goals");
      harness.rerender();

      expect(scrollToMock).toHaveBeenCalledWith(0, 1200);
    } finally {
      harness.unmount();
    }
  });

  it("persists the outgoing route scroll position when navigating away", () => {
    const harness = createHookHarness();
    try {
      scrollY = 640;
      window.dispatchEvent(new Event("scroll"));

      setRoute("/dashboard/goals");
      harness.rerender();

      expect(sessionStore.get("rw:scroll:/dashboard")).toBe(
        JSON.stringify({ x: 0, y: 640 }),
      );
    } finally {
      harness.unmount();
    }
  });

  it("persists the outgoing scroll position via the ref even when the window scroll has already been reset (Next.js race)", () => {
    const harness = createHookHarness();
    try {
      scrollY = 640;
      window.dispatchEvent(new Event("scroll"));
      act(() => {
        vi.advanceTimersByTime(0);
      });

      scrollY = 0;
      scrollX = 0;

      setRoute("/dashboard/goals");
      harness.rerender();

      expect(sessionStore.get("rw:scroll:/dashboard")).toBe(
        JSON.stringify({ x: 0, y: 640 }),
      );
    } finally {
      harness.unmount();
    }
  });

  it("debounces scroll saves into sessionStorage", () => {
    const harness = createHookHarness();
    try {
      scrollY = 100;
      window.dispatchEvent(new Event("scroll"));
      expect(sessionStore.has("rw:scroll:/dashboard")).toBe(false);

      act(() => {
        vi.advanceTimersByTime(80);
      });

      expect(sessionStore.get("rw:scroll:/dashboard")).toBe(
        JSON.stringify({ x: 0, y: 100 }),
      );
    } finally {
      harness.unmount();
    }
  });

  it("honors the one-shot __rw_skip_scroll_restore flag", () => {
    const harness = createHookHarness();
    try {
      scrollToMock.mockClear();
      scrollY = 900;

      (
        window as unknown as { __rw_skip_scroll_restore?: boolean }
      ).__rw_skip_scroll_restore = true;

      setRoute("/settings");
      harness.rerender();

      expect(scrollToMock).not.toHaveBeenCalled();
      expect(
        (window as unknown as { __rw_skip_scroll_restore?: boolean })
          .__rw_skip_scroll_restore,
      ).toBe(false);
    } finally {
      harness.unmount();
    }
  });

  it("correctly saves and restores across a multi-step push and history navigation sequence", () => {
    const harness = createHookHarness();
    try {
      scrollY = 100;
      window.dispatchEvent(new Event("scroll"));
      scrollY = 0;
      scrollX = 0;

      setRoute("/settings");
      harness.rerender();
      expect(sessionStore.get("rw:scroll:/dashboard")).toBe(
        JSON.stringify({ x: 0, y: 100 }),
      );

      scrollY = 300;
      window.dispatchEvent(new Event("scroll"));
      scrollY = 0;
      scrollX = 0;

      setRoute("/bills");
      harness.rerender();
      expect(sessionStore.get("rw:scroll:/settings")).toBe(
        JSON.stringify({ x: 0, y: 300 }),
      );

      scrollToMock.mockClear();
      window.dispatchEvent(new PopStateEvent("popstate"));
      setRoute("/settings");
      harness.rerender();

      expect(scrollToMock).toHaveBeenCalledWith(0, 300);
    } finally {
      harness.unmount();
    }
  });
});
