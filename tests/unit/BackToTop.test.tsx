import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import BackToTop from "@/components/BackToTop";

describe("BackToTop", () => {
  const originalScrollY = window.scrollY;
  let scrollListeners: Array<(event: Event) => void> = [];
  let rafCallbacks: Array<() => void> = [];

  beforeEach(() => {
    scrollListeners = [];
    rafCallbacks = [];

    vi.spyOn(window, "addEventListener").mockImplementation(
      (_event: string, handler: EventListenerOrEventListenerObject) => {
        if (_event === "scroll") {
          scrollListeners.push(handler as (event: Event) => void);
        }
      },
    );

    vi.spyOn(window, "removeEventListener").mockImplementation(
      (_event: string, handler: EventListenerOrEventListenerObject) => {
        if (_event === "scroll") {
          scrollListeners = scrollListeners.filter((h) => h !== handler);
        }
      },
    );

    vi.spyOn(window, "scrollTo").mockImplementation(() => {});

    vi.spyOn(window, "requestAnimationFrame").mockImplementation(
      (cb: FrameRequestCallback) => {
        rafCallbacks.push(cb);
        return 0;
      },
    );

    Object.defineProperty(window, "scrollY", {
      writable: true,
      value: 0,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "scrollY", {
      writable: true,
      value: originalScrollY,
    });
  });

  function triggerScroll(scrollY: number) {
    Object.defineProperty(window, "scrollY", {
      writable: true,
      value: scrollY,
    });
    scrollListeners.forEach((handler) =>
      handler(new Event("scroll")),
    );
  }

  function flushRafCallbacks() {
    while (rafCallbacks.length > 0) {
      const cb = rafCallbacks.shift()!;
      cb(0);
    }
  }

  it("is hidden when scroll position is 0", () => {
    render(<BackToTop />);

    const button = screen.getByLabelText("Back to top");
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("opacity-0");
    expect(button.className).toContain("pointer-events-none");
  });

  it("is hidden when scroll position is below threshold", () => {
    render(<BackToTop />);

    act(() => {
      triggerScroll(500);
    });

    const button = screen.getByLabelText("Back to top");
    expect(button.className).toContain("opacity-0");
    expect(button.className).toContain("pointer-events-none");
  });

  it("becomes visible when scroll position exceeds 800px threshold", () => {
    render(<BackToTop />);

    act(() => {
      triggerScroll(801);
    });

    const button = screen.getByLabelText("Back to top");
    expect(button.className).toContain("opacity-100");
    expect(button.className).not.toContain("pointer-events-none");
  });

  it("becomes hidden again when scrolling back below threshold", () => {
    render(<BackToTop />);

    act(() => {
      triggerScroll(1000);
    });

    let button = screen.getByLabelText("Back to top");
    expect(button.className).toContain("opacity-100");

    act(() => {
      triggerScroll(400);
    });

    button = screen.getByLabelText("Back to top");
    expect(button.className).toContain("opacity-0");
    expect(button.className).toContain("pointer-events-none");
  });

  it("calls window.scrollTo with smooth behavior on click", () => {
    render(<BackToTop />);

    act(() => {
      triggerScroll(1000);
    });

    const button = screen.getByLabelText("Back to top");
    fireEvent.click(button);

    expect(window.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth",
    });
  });

  it("focuses the page h1 after scrolling completes", () => {
    render(<BackToTop />);

    // Place an h1 in the DOM
    const h1 = document.createElement("h1");
    h1.textContent = "Page Title";
    document.body.appendChild(h1);

    act(() => {
      triggerScroll(1000);
    });

    const button = screen.getByLabelText("Back to top");
    fireEvent.click(button);

    // Simulate scroll completing by setting scrollY to 0 and flushing rAF
    Object.defineProperty(window, "scrollY", {
      writable: true,
      value: 0,
    });

    act(() => {
      flushRafCallbacks();
    });

    expect(h1.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(h1);

    document.body.removeChild(h1);
  });

  it("cleans up scroll listener on unmount", () => {
    const { unmount } = render(<BackToTop />);
    expect(scrollListeners.length).toBe(1);

    unmount();
    expect(scrollListeners.length).toBe(0);
  });

  it("has accessible label", () => {
    render(<BackToTop />);
    const button = screen.getByLabelText("Back to top");
    expect(button).toHaveAttribute("aria-label", "Back to top");
  });

  it("has icon with aria-hidden", () => {
    render(<BackToTop />);
    const icon = document.querySelector("svg");
    expect(icon).toHaveAttribute("aria-hidden", "true");
  });
});
