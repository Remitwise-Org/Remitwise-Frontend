/**
 * Tests for keyboard navigation in lib/hooks/useFocusTrap.ts
 *
 * Coverage targets:
 *  - Tab on the last focusable element wraps to the first (last → first)
 *  - Shift+Tab on the first focusable element wraps to the last (first → last)
 *  - Escape key fires the onEscape callback
 *  - Focus is restored to the previously focused element on cleanup
 *  - Hook is inactive when isActive === false
 */
import React, { useRef } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fireKeyDown(key: string, shiftKey = false) {
  const event = new KeyboardEvent("keydown", { key, shiftKey, bubbles: true });
  document.dispatchEvent(event);
  return event;
}

/**
 * Renders a container with N buttons and activates the focus trap.
 * Returns the container element and its button elements.
 */
function TestHarness({
  buttonCount,
  isActive,
  onEscape,
  extraProps = {},
}: {
  buttonCount: number;
  isActive: boolean;
  onEscape?: () => void;
  extraProps?: Record<string, unknown>;
}) {
  const containerRef = useFocusTrap({ isActive, onEscape, ...extraProps } as any);
  return (
    <div ref={containerRef as React.Ref<HTMLDivElement>} data-testid="trap-container">
      {Array.from({ length: buttonCount }, (_, i) => (
        <button key={i} data-testid={`btn-${i}`}>
          Button {i}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Reset focus to document body before each test
  document.body.focus();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useFocusTrap (lib/hooks)", () => {
  describe("first ↔ last stop wrapping", () => {
    it("wraps_focus_to_first_when_tab_pressed_on_last_focusable_element", () => {
      const { getByTestId } = render(
        <TestHarness buttonCount={3} isActive={true} />
      );

      const btn0 = getByTestId("btn-0");
      const btn2 = getByTestId("btn-2");

      // Manually move focus to the last button to simulate being there
      act(() => btn2.focus());
      expect(document.activeElement).toBe(btn2);

      // Tab from the last element should wrap to the first
      act(() => fireKeyDown("Tab", false));

      expect(document.activeElement).toBe(btn0);
    });

    it("wraps_focus_to_last_when_shift_tab_pressed_on_first_focusable_element", () => {
      const { getByTestId } = render(
        <TestHarness buttonCount={3} isActive={true} />
      );

      const btn0 = getByTestId("btn-0");
      const btn2 = getByTestId("btn-2");

      // Focus is initially moved to btn0 by the hook when it activates
      act(() => btn0.focus());
      expect(document.activeElement).toBe(btn0);

      // Shift+Tab from the first element should wrap to the last
      act(() => fireKeyDown("Tab", true));

      expect(document.activeElement).toBe(btn2);
    });

    it("does_not_intercept_tab_when_focus_is_on_a_middle_element", () => {
      const { getByTestId } = render(
        <TestHarness buttonCount={3} isActive={true} />
      );

      const btn1 = getByTestId("btn-1");
      const btn2 = getByTestId("btn-2");

      act(() => btn1.focus());
      expect(document.activeElement).toBe(btn1);

      // Tab from a middle element should NOT wrap — focus moves naturally.
      // The hook only intercepts when on first/last, so active element should
      // stay on btn1 (browser would move it, but jsdom doesn't simulate
      // natural Tab movement — so we just verify no forced jump to btn0 or btn2).
      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: false,
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(tabEvent, "preventDefault");
      document.dispatchEvent(tabEvent);

      // preventDefault must NOT have been called since we're not at the boundary
      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });

    it("wraps_correctly_with_only_two_focusable_elements", () => {
      const { getByTestId } = render(
        <TestHarness buttonCount={2} isActive={true} />
      );

      const btn0 = getByTestId("btn-0");
      const btn1 = getByTestId("btn-1");

      // Forward wrap: last → first
      act(() => btn1.focus());
      act(() => fireKeyDown("Tab", false));
      expect(document.activeElement).toBe(btn0);

      // Backward wrap: first → last
      act(() => btn0.focus());
      act(() => fireKeyDown("Tab", true));
      expect(document.activeElement).toBe(btn1);
    });
  });

  describe("Escape key handling", () => {
    it("calls_onEscape_callback_when_escape_key_is_pressed", () => {
      const onEscape = vi.fn();
      render(<TestHarness buttonCount={2} isActive={true} onEscape={onEscape} />);

      act(() => fireKeyDown("Escape"));

      expect(onEscape).toHaveBeenCalledTimes(1);
    });

    it("does_not_call_onEscape_when_trap_is_inactive", () => {
      const onEscape = vi.fn();
      render(<TestHarness buttonCount={2} isActive={false} onEscape={onEscape} />);

      act(() => fireKeyDown("Escape"));

      expect(onEscape).not.toHaveBeenCalled();
    });
  });

  describe("inactive trap", () => {
    it("does_not_intercept_tab_when_isActive_is_false", () => {
      const { getByTestId } = render(
        <TestHarness buttonCount={2} isActive={false} />
      );

      const btn1 = getByTestId("btn-1");
      act(() => btn1.focus());

      const tabEvent = new KeyboardEvent("keydown", {
        key: "Tab",
        shiftKey: false,
        bubbles: true,
        cancelable: true,
      });
      const preventDefaultSpy = vi.spyOn(tabEvent, "preventDefault");
      document.dispatchEvent(tabEvent);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
    });
  });

  describe("focus restoration", () => {
    it("restores_focus_to_trigger_element_when_trap_is_deactivated", () => {
      // Create a trigger button that will receive restored focus
      const trigger = document.createElement("button");
      trigger.textContent = "Open Modal";
      document.body.appendChild(trigger);
      trigger.focus();
      expect(document.activeElement).toBe(trigger);

      let setActiveState: (val: boolean) => void = () => {};

      function ControllableHarness() {
        const [active, setActive] = React.useState(true);
        setActiveState = setActive;
        return (
          <div ref={useFocusTrap({ isActive: active }) as React.Ref<HTMLDivElement>} data-testid="trap">
            <button data-testid="inner-btn">Inner</button>
          </div>
        );
      }

      render(<ControllableHarness />);

      // Deactivate the trap — should restore focus to trigger
      act(() => setActiveState(false));

      expect(document.activeElement).toBe(trigger);

      // Cleanup
      document.body.removeChild(trigger);
    });
  });
});
