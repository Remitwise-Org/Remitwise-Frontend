/**
 * Tests for the Accessible Focus Baseline documented in docs/ACCESSIBLE_FOCUS_BASELINE.md.
 *
 * Validates the core focus management contract:
 *  - Keyboard focus triggers focus-visible ring (data-focus-visible attribute)
 *  - Mouse click does NOT leave a stray focus ring
 *  - Focus trap wraps Tab/Shift+Tab within container boundaries
 */
import React, { useRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";

// ---------------------------------------------------------------------------
// Minimal focus-visible polyfill (mirrors the WICG approach from
// tests/unit/ui/focus-visible-polyfill.test.tsx)
// ---------------------------------------------------------------------------
function useFocusVisiblePolyfill(ref: React.RefObject<HTMLElement | null>) {
  const mouseDown = React.useRef(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMouseDown = () => {
      mouseDown.current = true;
      if (el.hasAttribute("data-focus-visible")) {
        el.removeAttribute("data-focus-visible");
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        mouseDown.current = false;
      }
    };

    const onFocus = () => {
      if (mouseDown.current) {
        el.removeAttribute("data-focus-visible");
        mouseDown.current = false;
      } else {
        el.setAttribute("data-focus-visible", "");
      }
    };

    const onBlur = () => {
      el.removeAttribute("data-focus-visible");
    };

    el.addEventListener("mousedown", onMouseDown);
    el.addEventListener("keydown", onKeyDown);
    el.addEventListener("focus", onFocus);
    el.addEventListener("blur", onBlur);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("focus", onFocus);
      el.removeEventListener("blur", onBlur);
    };
  }, [ref]);
}

function FocusVisibleButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const ref = useRef<HTMLButtonElement>(null);
  useFocusVisiblePolyfill(ref);

  return (
    <button
      ref={ref}
      type="button"
      className="focus-visible:outline-2 focus-visible:outline-red-500"
      {...props}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Minimal focus trap (mirrors lib/hooks/useFocusTrap.ts contract)
// ---------------------------------------------------------------------------
function FocusTrapModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousRef = useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    previousRef.current = document.activeElement as HTMLElement;

    const focusable = containerRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusable[0]?.focus();

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose?.();
        return;
      }
      if (e.key !== "Tab") return;

      const els = containerRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!els || els.length === 0) return;

      const first = els[0];
      const last = els[els.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      previousRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={containerRef} role="dialog" aria-modal="true" data-testid="focus-trap">
      <button data-testid="trap-first">First</button>
      <input data-testid="trap-middle" placeholder="Middle" />
      <button data-testid="trap-last">Last</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Accessible Focus Baseline", () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /* ---------- happy path: keyboard focus is visible ---------- */

  describe("keyboard focus visibility (focus-visible)", () => {
    it("sets data-focus-visible when button is tabbed to", async () => {
      render(
        <>
          <FocusVisibleButton data-testid="btn-1">Target</FocusVisibleButton>
          <FocusVisibleButton data-testid="btn-2">Other</FocusVisibleButton>
        </>,
      );
      await user.tab();
      expect(screen.getByTestId("btn-1")).toHaveAttribute("data-focus-visible");
    });

    it("removes data-focus-visible on blur and re-applies on re-focus via keyboard", async () => {
      render(
        <>
          <button type="button" />
          <FocusVisibleButton data-testid="btn-target">Target</FocusVisibleButton>
          <FocusVisibleButton data-testid="btn-next">Next</FocusVisibleButton>
        </>,
      );
      const target = screen.getByTestId("btn-target");

      await user.tab();
      await user.tab();
      expect(target).toHaveAttribute("data-focus-visible");

      await user.tab();
      expect(target).not.toHaveAttribute("data-focus-visible");
    });
  });

  /* ---------- happy path: focus trap wraps correctly ---------- */

  describe("focus trap Tab/Shift+Tab cycling", () => {
    it("traps Tab within the modal and wraps from last to first", async () => {
      render(
        <div>
          <button data-testid="outside">Outside</button>
          <FocusTrapModal isOpen onClose={vi.fn()} />
        </div>,
      );

      const first = screen.getByTestId("trap-first");
      const middle = screen.getByTestId("trap-middle");
      const last = screen.getByTestId("trap-last");

      expect(first).toHaveFocus();

      await user.tab();
      expect(middle).toHaveFocus();

      await user.tab();
      expect(last).toHaveFocus();

      await user.tab();
      expect(first).toHaveFocus();
    });

    it("wraps Shift+Tab from first element to last", () => {
      render(<FocusTrapModal isOpen onClose={vi.fn()} />);

      const first = screen.getByTestId("trap-first");
      const last = screen.getByTestId("trap-last");

      expect(first).toHaveFocus();

      fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
      expect(last).toHaveFocus();
    });

    it("calls onEscape when Escape is pressed", async () => {
      const onClose = vi.fn();
      render(<FocusTrapModal isOpen onClose={onClose} />);

      await user.keyboard("{Escape}");
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not trap focus when inactive", async () => {
      render(
        <div>
          <button data-testid="outside">Outside</button>
          <FocusTrapModal isOpen={false} onClose={vi.fn()} />
        </div>,
      );

      const outside = screen.getByTestId("outside");
      outside.focus();
      expect(outside).toHaveFocus();
      expect(screen.queryByTestId("focus-trap")).not.toBeInTheDocument();
    });
  });

  /* ---------- failure mode: mouse click does not leave stray ring ---------- */

  describe("mouse click does not leave stray focus ring", () => {
    it("does not set data-focus-visible on mouse click", async () => {
      render(
        <>
          <FocusVisibleButton data-testid="btn-a">First</FocusVisibleButton>
          <FocusVisibleButton data-testid="btn-b">Second</FocusVisibleButton>
        </>,
      );

      const first = screen.getByTestId("btn-a");
      await user.click(first);

      expect(first).not.toHaveAttribute("data-focus-visible");
    });

    it("removes data-focus-visible when a keyboard-focused element is clicked", async () => {
      render(
        <>
          <FocusVisibleButton data-testid="btn-x">Target</FocusVisibleButton>
          <FocusVisibleButton data-testid="btn-y">Other</FocusVisibleButton>
        </>,
      );

      const target = screen.getByTestId("btn-x");

      await user.tab();
      expect(target).toHaveAttribute("data-focus-visible");

      await user.click(target);
      expect(target).not.toHaveAttribute("data-focus-visible");
    });
  });

  /* ---------- failure mode: focus does not escape trap ---------- */

  describe("focus trap prevents focus escape", () => {
    it("prevents focus from reaching elements outside the trap", async () => {
      render(
        <div>
          <button data-testid="before-trap">Before</button>
          <FocusTrapModal isOpen onClose={vi.fn()} />
          <button data-testid="after-trap">After</button>
        </div>,
      );

      const beforeTrap = screen.getByTestId("before-trap");
      const afterTrap = screen.getByTestId("after-trap");
      const first = screen.getByTestId("trap-first");
      const last = screen.getByTestId("trap-last");

      expect(first).toHaveFocus();

      // Multiple Tab presses should stay within the trap
      await user.tab();
      await user.tab();
      await user.tab();
      expect(first).toHaveFocus();
      expect(afterTrap).not.toHaveFocus();
      expect(beforeTrap).not.toHaveFocus();

      // Shift+Tab should also stay within the trap
      fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
      expect(last).toHaveFocus();
      expect(beforeTrap).not.toHaveFocus();
      expect(afterTrap).not.toHaveFocus();
    });
  });
});
