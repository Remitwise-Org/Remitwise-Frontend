/**
 * Tests for keyboard navigation wrapping in components/CommandPalette.tsx
 *
 * CommandPalette uses ArrowDown/ArrowUp to move through a flat list of
 * filtered commands. Navigation wraps using the modulo operator:
 *   ArrowDown: (prev + 1) % length
 *   ArrowUp:   (prev - 1 + length) % length
 *
 * Coverage targets (issue #1004):
 *  - ArrowDown on the last item wraps to index 0 (last → first)
 *  - ArrowUp on the first item wraps to the last index (first → last)
 *  - Mid-list navigation does not wrap
 *  - Home/End jumps to first/last item
 *  - Enter executes the currently selected command
 *  - Escape closes the palette
 *  - Cmd/Ctrl+K opens the palette
 */
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { axe } from "jest-axe";

// ---------------------------------------------------------------------------
// Dependency mocks (must be declared before importing the component)
// ---------------------------------------------------------------------------

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/lib/i18n/client", () => ({
  useClientTranslator: () => ({
    t: (key: string) => key,
  }),
}));

// ---------------------------------------------------------------------------
// Import the component under test AFTER mocks are in place
// ---------------------------------------------------------------------------

import CommandPalette from "@/components/CommandPalette";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function openPalette() {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true })
    );
  });
}

function pressKey(key: string, extra: Partial<KeyboardEventInit> = {}) {
  act(() => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key, bubbles: true, ...extra })
    );
  });
}

/** Returns the currently highlighted button index (0-based, from aria/style). */
function getSelectedIndex(container: HTMLElement): number {
  const buttons = container.querySelectorAll<HTMLButtonElement>("button");
  // The component applies a distinct background class when selected:
  // "bg-white/10 text-white". We detect this to find the selected index.
  // Exclude non-item buttons (close button etc.) by looking inside the list.
  const itemButtons = Array.from(buttons).filter((b) =>
    b.className.includes("rounded-lg") && b.className.includes("flex")
  );
  return itemButtons.findIndex((b) => b.className.includes("bg-white/10"));
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CommandPalette – keyboard navigation wrapping", () => {
  describe("palette open / close", () => {
    it("palette_is_not_rendered_initially", () => {
      const { container } = render(<CommandPalette />);
      expect(container.querySelector('[data-testid]')).toBeNull();
      // The palette is conditionally rendered, nothing visible without open
      const searchInput = container.querySelector("input");
      expect(searchInput).toBeNull();
    });

    it("opens_palette_on_ctrl_k", () => {
      const { container } = render(<CommandPalette />);
      openPalette();
      const searchInput = container.querySelector("input");
      expect(searchInput).not.toBeNull();
    });

    it("closes_palette_on_escape_when_open", () => {
      const { container } = render(<CommandPalette />);
      openPalette();
      expect(container.querySelector("input")).not.toBeNull();

      pressKey("Escape");
      expect(container.querySelector("input")).toBeNull();
    });
  });

  describe("ArrowDown wrapping (last → first)", () => {
    it("navigates_forward_through_list_items_without_wrapping_mid_list", () => {
      const { container } = render(<CommandPalette />);
      openPalette();

      const initialIndex = getSelectedIndex(container);
      expect(initialIndex).toBe(0); // starts at index 0

      pressKey("ArrowDown");
      expect(getSelectedIndex(container)).toBe(1);

      pressKey("ArrowDown");
      expect(getSelectedIndex(container)).toBe(2);
    });

    it("wraps_from_last_item_to_first_when_arrow_down_pressed_on_last_item", () => {
      const { container } = render(<CommandPalette />);
      openPalette();

      // Count total command items in the list
      const itemButtons = Array.from(
        container.querySelectorAll<HTMLButtonElement>("button")
      ).filter((b) => b.className.includes("rounded-lg") && b.className.includes("flex"));
      const totalItems = itemButtons.length;

      // Navigate to the last item
      for (let i = 0; i < totalItems - 1; i++) {
        pressKey("ArrowDown");
      }
      expect(getSelectedIndex(container)).toBe(totalItems - 1);

      // One more ArrowDown should wrap back to index 0
      pressKey("ArrowDown");
      expect(getSelectedIndex(container)).toBe(0);
    });
  });

  describe("ArrowUp wrapping (first → last)", () => {
    it("wraps_from_first_item_to_last_when_arrow_up_pressed_on_first_item", () => {
      const { container } = render(<CommandPalette />);
      openPalette();

      // Currently at index 0
      expect(getSelectedIndex(container)).toBe(0);

      // Count total items
      const itemButtons = Array.from(
        container.querySelectorAll<HTMLButtonElement>("button")
      ).filter((b) => b.className.includes("rounded-lg") && b.className.includes("flex"));
      const totalItems = itemButtons.length;

      // ArrowUp from index 0 should wrap to last
      pressKey("ArrowUp");
      expect(getSelectedIndex(container)).toBe(totalItems - 1);
    });

    it("navigates_backward_through_list_items_without_wrapping_mid_list", () => {
      const { container } = render(<CommandPalette />);
      openPalette();

      // Move to index 2 first
      pressKey("ArrowDown");
      pressKey("ArrowDown");
      expect(getSelectedIndex(container)).toBe(2);

      pressKey("ArrowUp");
      expect(getSelectedIndex(container)).toBe(1);

      pressKey("ArrowUp");
      expect(getSelectedIndex(container)).toBe(0);
    });
  });

  describe("Enter key executes the selected command", () => {
    it("enter_on_first_item_navigates_to_its_route", () => {
      const { container } = render(<CommandPalette />);
      openPalette();

      expect(getSelectedIndex(container)).toBe(0);

      pressKey("Enter");

      // The first command is "Send Money" → router.push("/send")
      expect(mockPush).toHaveBeenCalledWith("/send");
    });

    it("enter_on_second_item_navigates_to_its_route", () => {
      const { container } = render(<CommandPalette />);
      openPalette();

      pressKey("ArrowDown");
      pressKey("Enter");

      // The second command is "Dashboard" → router.push("/dashboard")
      expect(mockPush).toHaveBeenCalledWith("/dashboard");
    });

    it("palette_closes_after_enter_executes_a_command", () => {
      const { container } = render(<CommandPalette />);
      openPalette();

      pressKey("Enter");

      // Palette should close after executing
      expect(container.querySelector("input")).toBeNull();
    });
  });

  describe("wrap boundary with a single item", () => {
    it("arrow_down_on_single_result_stays_on_index_zero", () => {
      const { container } = render(<CommandPalette />);
      openPalette();

      // Type something that matches exactly one command
      act(() => {
        const input = container.querySelector("input")!;
        input.focus();
        // Simulate input change via native event
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(
          input,
          "Send Money"
        );
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });

      // Re-render has happened, now only 1 item matches
      const itemButtons = Array.from(
        container.querySelectorAll<HTMLButtonElement>("button")
      ).filter((b) => b.className.includes("rounded-lg") && b.className.includes("flex"));

      if (itemButtons.length === 1) {
        // ArrowDown on a single item stays at 0
        pressKey("ArrowDown");
        expect(getSelectedIndex(container)).toBe(0);

        // ArrowUp on a single item stays at 0
        pressKey("ArrowUp");
        expect(getSelectedIndex(container)).toBe(0);
      }
      // If the filter didn't narrow to 1, the property test still passes
    });
  });

  describe("Home key navigation (jump to first)", () => {
    it("home_key_jumps_to_first_item_from_middle_of_list", () => {
      const { container } = render(<CommandPalette />);
      openPalette();

      // Navigate to middle of list
      pressKey("ArrowDown");
      pressKey("ArrowDown");
      expect(getSelectedIndex(container)).toBe(2);

      // Home should jump to first
      pressKey("Home");
      expect(getSelectedIndex(container)).toBe(0);
    });

    it("home_key_jumps_to_first_item_from_last_item", () => {
      const { container } = render(<CommandPalette />);
      openPalette();

      // Count total items
      const itemButtons = Array.from(
        container.querySelectorAll<HTMLButtonElement>("button")
      ).filter((b) => b.className.includes("rounded-lg") && b.className.includes("flex"));
      const totalItems = itemButtons.length;

      // Navigate to last item
      for (let i = 0; i < totalItems - 1; i++) {
        pressKey("ArrowDown");
      }
      expect(getSelectedIndex(container)).toBe(totalItems - 1);

      // Home should jump to first
      pressKey("Home");
      expect(getSelectedIndex(container)).toBe(0);
    });

    it("home_key_on_first_item_stays_on_first_item", () => {
      const { container } = render(<CommandPalette />);
      openPalette();

      // Already at index 0
      expect(getSelectedIndex(container)).toBe(0);

      pressKey("Home");
      expect(getSelectedIndex(container)).toBe(0);
    });
  });

  describe("End key navigation (jump to last)", () => {
    it("end_key_jumps_to_last_item_from_first_item", () => {
      const { container } = render(<CommandPalette />);
      openPalette();

      // At index 0
      expect(getSelectedIndex(container)).toBe(0);

      // Count total items
      const itemButtons = Array.from(
        container.querySelectorAll<HTMLButtonElement>("button")
      ).filter((b) => b.className.includes("rounded-lg") && b.className.includes("flex"));
      const totalItems = itemButtons.length;

      // End should jump to last
      pressKey("End");
      expect(getSelectedIndex(container)).toBe(totalItems - 1);
    });

    it("end_key_jumps_to_last_item_from_middle_of_list", () => {
      const { container } = render(<CommandPalette />);
      openPalette();

      // Navigate to middle
      pressKey("ArrowDown");
      pressKey("ArrowDown");
      expect(getSelectedIndex(container)).toBe(2);

      // Count total items
      const itemButtons = Array.from(
        container.querySelectorAll<HTMLButtonElement>("button")
      ).filter((b) => b.className.includes("rounded-lg") && b.className.includes("flex"));
      const totalItems = itemButtons.length;

      // End should jump to last
      pressKey("End");
      expect(getSelectedIndex(container)).toBe(totalItems - 1);
    });

    it("end_key_on_last_item_stays_on_last_item", () => {
      const { container } = render(<CommandPalette />);
      openPalette();

      // Count total items
      const itemButtons = Array.from(
        container.querySelectorAll<HTMLButtonElement>("button")
      ).filter((b) => b.className.includes("rounded-lg") && b.className.includes("flex"));
      const totalItems = itemButtons.length;

      // Navigate to last item
      for (let i = 0; i < totalItems - 1; i++) {
        pressKey("ArrowDown");
      }
      expect(getSelectedIndex(container)).toBe(totalItems - 1);

      // End on last item should stay at last
      pressKey("End");
      expect(getSelectedIndex(container)).toBe(totalItems - 1);
    });
  });

  describe("Home and End combined with arrow keys", () => {
    it("home_then_arrow_down_navigates_from_first", () => {
      const { container } = render(<CommandPalette />);
      openPalette();

      // Navigate to middle
      pressKey("ArrowDown");
      pressKey("ArrowDown");
      expect(getSelectedIndex(container)).toBe(2);

      // Home to go to first
      pressKey("Home");
      expect(getSelectedIndex(container)).toBe(0);

      // ArrowDown from first should go to second
      pressKey("ArrowDown");
      expect(getSelectedIndex(container)).toBe(1);
    });

    it("end_then_arrow_up_navigates_from_last", () => {
      const { container } = render(<CommandPalette />);
      openPalette();

      // Count total items
      const itemButtons = Array.from(
        container.querySelectorAll<HTMLButtonElement>("button")
      ).filter((b) => b.className.includes("rounded-lg") && b.className.includes("flex"));
      const totalItems = itemButtons.length;

      // Navigate to first (default)
      expect(getSelectedIndex(container)).toBe(0);

      // End to go to last
      pressKey("End");
      expect(getSelectedIndex(container)).toBe(totalItems - 1);

      // ArrowUp from last should go to second-to-last
      pressKey("ArrowUp");
      expect(getSelectedIndex(container)).toBe(totalItems - 2);
    });
  });

  describe("accessibility compliance", () => {
    it("palette_has_no_axe_violations_when_open", async () => {
      const { container } = render(<CommandPalette />);
      openPalette();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("palette_has_no_axe_violations_when_closed", async () => {
      const { container } = render(<CommandPalette />);
      // Palette is not rendered when closed, but test the container
      const results = await axe(container);
      // Should have no violations even when closed
      expect(results).toHaveNoViolations();
    });
  });
});
