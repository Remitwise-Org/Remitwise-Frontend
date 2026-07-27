/**
 * Tests for keyboard navigation in src/lib/hooks/useFocusTrap.ts
 *
 * This is the advanced focus-trap hook that:
 *  - Filters out :disabled elements from the focusable set
 *  - Filters out elements with aria-hidden="true"
 *  - Wraps Tab on the last focusable element back to the first
 *  - Wraps Shift+Tab on the first focusable element to the last
 *
 * Coverage targets (issue #1004):
 *  - first → last wrap via Shift+Tab
 *  - last → first wrap via Tab
 *  - disabled buttons are excluded from the focusable set (skipped)
 *  - aria-hidden elements are excluded from the focusable set (skipped)
 *  - mixed: some disabled + some enabled, wrapping still correct
 *  - Escape key fires onEscape
 *  - Inactive trap does not intercept keyboard events
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Import the advanced hook from src/
// We use a relative path because the src/ tree is not covered by the @/ alias.
// ---------------------------------------------------------------------------
import useFocusTrap from "@/lib/hooks/useFocusTrap";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fireDocumentKeyDown(key: string, shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent("keydown", {
    key,
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  document.dispatchEvent(event);
  return event;
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  document.body.focus();
});

afterEach(() => {
  vi.restoreAllMocks();
  // Restore body scroll that the hook may have locked
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
});

// ---------------------------------------------------------------------------
// Test harness component that renders a configurable set of buttons
// ---------------------------------------------------------------------------

interface ButtonSpec {
  label: string;
  disabled?: boolean;
  ariaHidden?: boolean;
  tabIndex?: number;
}

function AdvancedTrapHarness({
  buttons,
  isActive,
  onEscape,
}: {
  buttons: ButtonSpec[];
  isActive: boolean;
  onEscape?: () => void;
}) {
  const ref = useFocusTrap({ isActive, onEscape }) as React.RefObject<HTMLDivElement>;
  return (
    <div ref={ref} data-testid="trap-root">
      {buttons.map(({ label, disabled, ariaHidden, tabIndex }, i) => (
        <button
          key={i}
          data-testid={`btn-${i}`}
          disabled={disabled}
          aria-hidden={ariaHidden ? "true" : undefined}
          tabIndex={tabIndex}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useFocusTrap (src/lib/hooks) – keyboard navigation", () => {
  describe("first ↔ last stop wrapping with all buttons enabled", () => {
    it("wraps_focus_from_last_to_first_when_tab_is_pressed_on_last_element", () => {
      const buttons: ButtonSpec[] = [
        { label: "First" },
        { label: "Middle" },
        { label: "Last" },
      ];
      const { getByTestId } = render(
        <AdvancedTrapHarness buttons={buttons} isActive={true} />
      );

      const first = getByTestId("btn-0");
      const last = getByTestId("btn-2");

      act(() => last.focus());
      expect(document.activeElement).toBe(last);

      act(() => fireDocumentKeyDown("Tab", false));

      expect(document.activeElement).toBe(first);
    });

    it("wraps_focus_from_first_to_last_when_shift_tab_is_pressed_on_first_element", () => {
      const buttons: ButtonSpec[] = [
        { label: "First" },
        { label: "Middle" },
        { label: "Last" },
      ];
      const { getByTestId } = render(
        <AdvancedTrapHarness buttons={buttons} isActive={true} />
      );

      const first = getByTestId("btn-0");
      const last = getByTestId("btn-2");

      act(() => first.focus());
      expect(document.activeElement).toBe(first);

      act(() => fireDocumentKeyDown("Tab", true));

      expect(document.activeElement).toBe(last);
    });

    it("wraps_correctly_with_exactly_two_focusable_elements", () => {
      const buttons: ButtonSpec[] = [{ label: "A" }, { label: "B" }];
      const { getByTestId } = render(
        <AdvancedTrapHarness buttons={buttons} isActive={true} />
      );

      const btnA = getByTestId("btn-0");
      const btnB = getByTestId("btn-1");

      // Forward wrap
      act(() => btnB.focus());
      act(() => fireDocumentKeyDown("Tab", false));
      expect(document.activeElement).toBe(btnA);

      // Backward wrap
      act(() => btnA.focus());
      act(() => fireDocumentKeyDown("Tab", true));
      expect(document.activeElement).toBe(btnB);
    });
  });

  describe("disabled items are skipped (excluded from focusable set)", () => {
    it("skips_disabled_button_at_end_so_tab_from_last_enabled_wraps_to_first", () => {
      // Layout: [enabled, enabled, DISABLED]
      // The last enabled element is btn-1; Tab from it should wrap to btn-0.
      const buttons: ButtonSpec[] = [
        { label: "First" },
        { label: "Second" },
        { label: "Disabled Last", disabled: true },
      ];
      const { getByTestId } = render(
        <AdvancedTrapHarness buttons={buttons} isActive={true} />
      );

      const first = getByTestId("btn-0");
      const second = getByTestId("btn-1");

      act(() => second.focus());
      expect(document.activeElement).toBe(second);

      // Tab from the last *enabled* element (btn-1) should wrap to first
      act(() => fireDocumentKeyDown("Tab", false));

      expect(document.activeElement).toBe(first);
    });

    it("skips_disabled_button_at_start_so_shift_tab_from_first_enabled_wraps_to_last", () => {
      // Layout: [DISABLED, enabled, enabled]
      // The first enabled element is btn-1; Shift+Tab from it should wrap to btn-2.
      const buttons: ButtonSpec[] = [
        { label: "Disabled First", disabled: true },
        { label: "Second" },
        { label: "Third" },
      ];
      const { getByTestId } = render(
        <AdvancedTrapHarness buttons={buttons} isActive={true} />
      );

      const second = getByTestId("btn-1"); // first enabled
      const third = getByTestId("btn-2"); // last enabled

      act(() => second.focus());
      expect(document.activeElement).toBe(second);

      act(() => fireDocumentKeyDown("Tab", true));

      expect(document.activeElement).toBe(third);
    });

    it("disabled_button_in_the_middle_is_not_in_focusable_set_so_wrapping_ignores_it", () => {
      // Layout: [enabled, DISABLED, enabled]
      // Tab from btn-2 (last enabled) wraps to btn-0 (first enabled).
      const buttons: ButtonSpec[] = [
        { label: "First" },
        { label: "Disabled Middle", disabled: true },
        { label: "Last" },
      ];
      const { getByTestId } = render(
        <AdvancedTrapHarness buttons={buttons} isActive={true} />
      );

      const first = getByTestId("btn-0");
      const last = getByTestId("btn-2");

      act(() => last.focus());
      expect(document.activeElement).toBe(last);

      act(() => fireDocumentKeyDown("Tab", false));

      expect(document.activeElement).toBe(first);
    });

    it("all_middle_buttons_disabled_wrapping_between_first_and_last_enabled_works", () => {
      // Layout: [enabled, DISABLED, DISABLED, enabled]
      const buttons: ButtonSpec[] = [
        { label: "First" },
        { label: "Disabled A", disabled: true },
        { label: "Disabled B", disabled: true },
        { label: "Last" },
      ];
      const { getByTestId } = render(
        <AdvancedTrapHarness buttons={buttons} isActive={true} />
      );

      const first = getByTestId("btn-0");
      const last = getByTestId("btn-3");

      // Forward wrap: last enabled → first enabled
      act(() => last.focus());
      act(() => fireDocumentKeyDown("Tab", false));
      expect(document.activeElement).toBe(first);

      // Backward wrap: first enabled → last enabled
      act(() => first.focus());
      act(() => fireDocumentKeyDown("Tab", true));
      expect(document.activeElement).toBe(last);
    });
  });

  describe("aria-hidden items are excluded from the focusable set", () => {
    it("aria_hidden_button_is_excluded_so_tab_from_second_enabled_wraps_to_first", () => {
      // Layout: [enabled, enabled, aria-hidden]
      const buttons: ButtonSpec[] = [
        { label: "First" },
        { label: "Second" },
        { label: "Hidden Last", ariaHidden: true },
      ];
      const { getByTestId } = render(
        <AdvancedTrapHarness buttons={buttons} isActive={true} />
      );

      const first = getByTestId("btn-0");
      const second = getByTestId("btn-1");

      act(() => second.focus());
      expect(document.activeElement).toBe(second);

      act(() => fireDocumentKeyDown("Tab", false));

      expect(document.activeElement).toBe(first);
    });
  });

  describe("Escape key handling", () => {
    it("calls_onEscape_when_escape_key_is_pressed_while_trap_is_active", async () => {
      const onEscape = vi.fn();
      render(
        <AdvancedTrapHarness
          buttons={[{ label: "Button" }]}
          isActive={true}
          onEscape={onEscape}
        />
      );

      await act(async () => {
        fireDocumentKeyDown("Escape");
        // The advanced hook uses requestAnimationFrame for the escape callback
        await new Promise((r) => setTimeout(r, 20));
      });

      expect(onEscape).toHaveBeenCalledTimes(1);
    });

    it("does_not_call_onEscape_when_trap_is_inactive", async () => {
      const onEscape = vi.fn();
      render(
        <AdvancedTrapHarness
          buttons={[{ label: "Button" }]}
          isActive={false}
          onEscape={onEscape}
        />
      );

      act(() => fireDocumentKeyDown("Escape"));

      expect(onEscape).not.toHaveBeenCalled();
    });
  });

  describe("inactive trap does not intercept keyboard events", () => {
    it("does_not_prevent_default_on_tab_when_trap_is_inactive", () => {
      const { getByTestId } = render(
        <AdvancedTrapHarness
          buttons={[{ label: "A" }, { label: "B" }]}
          isActive={false}
        />
      );

      const btnB = getByTestId("btn-1");
      act(() => btnB.focus());

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
});
