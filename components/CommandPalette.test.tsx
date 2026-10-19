/**
 * Component tests for CommandPalette combobox keyboard behaviour.
 *
 * Covers type-to-select, arrow keys, Escape, Enter, and toggle (Cmd+K / Ctrl+K).
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ── Mocks ────────────────────────────────────────────────────────────────────

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("@/lib/i18n/client", () => ({
  useClientTranslator: () => ({
    t: (key: string) => key,
    locale: "en",
  }),
  useClientLocale: () => "en",
}));

import CommandPalette from "./CommandPalette";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Open the palette via Ctrl+K (same as Cmd+K in non-Mac tests). */
function openPalette() {
  fireEvent.keyDown(document, { key: "k", ctrlKey: true });
}

/** Type into the command palette search input. */
function typeInSearch(text: string) {
  const input = screen.getByPlaceholderText("Search commands...");
  fireEvent.change(input, { target: { value: text } });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("CommandPalette", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Open / Close ──────────────────────────────────────────────────────────

  describe("open and close", () => {
    it("renders_nothing_when_closed", () => {
      const { container } = render(<CommandPalette />);
      expect(container.firstChild).toBeNull();
    });

    it("opens_palette_with_ctrl_k", () => {
      render(<CommandPalette />);
      fireEvent.keyDown(document, { key: "k", ctrlKey: true });
      expect(screen.getByPlaceholderText("Search commands...")).toBeInTheDocument();
    });

    it("opens_palette_with_meta_k", () => {
      render(<CommandPalette />);
      fireEvent.keyDown(document, { key: "k", metaKey: true });
      expect(screen.getByPlaceholderText("Search commands...")).toBeInTheDocument();
    });

    it("toggles_palette_closed_when_ctrl_k_is_pressed_again", () => {
      render(<CommandPalette />);
      openPalette();
      expect(screen.getByPlaceholderText("Search commands...")).toBeInTheDocument();
      fireEvent.keyDown(document, { key: "k", ctrlKey: true });
      expect(screen.queryByPlaceholderText("Search commands...")).not.toBeInTheDocument();
    });

    it("toggles_palette_closed_when_meta_k_is_pressed_again", () => {
      render(<CommandPalette />);
      fireEvent.keyDown(document, { key: "k", metaKey: true });
      expect(screen.getByPlaceholderText("Search commands...")).toBeInTheDocument();
      fireEvent.keyDown(document, { key: "k", metaKey: true });
      expect(screen.queryByPlaceholderText("Search commands...")).not.toBeInTheDocument();
    });

    it("closes_palette_when_backdrop_is_clicked", () => {
      render(<CommandPalette />);
      openPalette();
      const backdrop = screen.getByTestId("command-palette-backdrop");
      fireEvent.click(backdrop);
      expect(screen.queryByPlaceholderText("Search commands...")).not.toBeInTheDocument();
    });
  });

  // ── Type-to-select (filtering) ─────────────────────────────────────────────

  describe("type-to-select filtering", () => {
    it("renders_all_commands_when_search_is_empty", () => {
      render(<CommandPalette />);
      openPalette();
      // 7 commands total: Send Money, Dashboard, Bills, Insurance, Family, Settings, Connect Wallet
      const routeButtons = screen.getAllByText(/Send Money|Dashboard|Bills|Insurance|Family|Settings/);
      expect(routeButtons.length).toBe(6);
      expect(screen.getByText("Connect Wallet")).toBeInTheDocument();
    });

    it("filters_commands_when_user_types_partial_match", () => {
      render(<CommandPalette />);
      openPalette();
      typeInSearch("send");
      expect(screen.getByText("Send Money")).toBeInTheDocument();
      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
      expect(screen.queryByText("Bills")).not.toBeInTheDocument();
    });

    it("filters_commands_by_description_match", () => {
      render(<CommandPalette />);
      openPalette();
      typeInSearch("recipients");
      expect(screen.getByText("Send Money")).toBeInTheDocument();
      expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
    });

    it("filters_case_insensitively", () => {
      render(<CommandPalette />);
      openPalette();
      typeInSearch("SEND");
      expect(screen.getByText("Send Money")).toBeInTheDocument();
      expect(screen.queryByText("Bills")).not.toBeInTheDocument();
    });

    it("shows_empty_state_when_no_commands_match_search", () => {
      render(<CommandPalette />);
      openPalette();
      typeInSearch("zzz_nonexistent_zzz");
      expect(screen.getByText("No commands found")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Send Money/ })).not.toBeInTheDocument();
    });

    it("resets_selected_index_when_search_query_changes", () => {
      render(<CommandPalette />);
      openPalette();
      // Navigate down to highlight the second item
      fireEvent.keyDown(document, { key: "ArrowDown" });
      typeInSearch("fa");
      // The first match should be highlighted
      const familyButton = screen.getByText("Family").closest("button");
      expect(familyButton?.className).toContain("bg-white/10");
    });
  });

  // ── Arrow key navigation ───────────────────────────────────────────────────

  describe("arrow key navigation", () => {
    it("moves_selection_down_with_arrow_down", () => {
      render(<CommandPalette />);
      openPalette();
      fireEvent.keyDown(document, { key: "ArrowDown" });

      const buttons = screen.getAllByTestId("command-item");

      // Second item (index 1) should be highlighted
      expect(buttons[1].className).toContain("bg-white/10");
    });

    it("moves_selection_up_with_arrow_up", () => {
      render(<CommandPalette />);
      openPalette();
      // Move down twice then up once
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "ArrowUp" });

      const buttons = screen.getAllByTestId("command-item");

      // Second item should be highlighted again
      expect(buttons[1].className).toContain("bg-white/10");
    });

    it("wraps_selection_from_last_to_first_with_arrow_down", () => {
      render(<CommandPalette />);
      openPalette();
      const allCommandButtons = screen.getAllByTestId("command-item");
      const totalItems = allCommandButtons.length;

      // Press ArrowDown totalItems times to wrap around
      for (let i = 0; i < totalItems; i++) {
        fireEvent.keyDown(document, { key: "ArrowDown" });
      }

      // First item should be highlighted
      const buttonsAfter = screen.getAllByTestId("command-item");
      expect(buttonsAfter[0].className).toContain("bg-white/10");
    });

    it("wraps_selection_from_first_to_last_with_arrow_up", () => {
      render(<CommandPalette />);
      openPalette();
      fireEvent.keyDown(document, { key: "ArrowUp" });

      const buttons = screen.getAllByTestId("command-item");

      // Last item should be highlighted
      expect(buttons[buttons.length - 1].className).toContain("bg-white/10");
    });

    it("does_not_error_when_arrow_pressed_and_command_list_is_empty", () => {
      render(<CommandPalette />);
      openPalette();
      typeInSearch("zzz_nonexistent_zzz");

      // Should not throw when navigating empty list
      expect(() => {
        fireEvent.keyDown(document, { key: "ArrowDown" });
        fireEvent.keyDown(document, { key: "ArrowUp" });
      }).not.toThrow();
    });
  });

  // ── Escape key ─────────────────────────────────────────────────────────────

  describe("escape key", () => {
    it("closes_palette_when_escape_is_pressed", () => {
      render(<CommandPalette />);
      openPalette();
      expect(screen.getByPlaceholderText("Search commands...")).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByPlaceholderText("Search commands...")).not.toBeInTheDocument();
    });

    it("does_not_close_when_escape_is_pressed_and_palette_is_closed", () => {
      render(<CommandPalette />);
      // Palette is already closed — Escape should not cause an error
      expect(() => {
        fireEvent.keyDown(document, { key: "Escape" });
      }).not.toThrow();
    });
  });

  // ── Enter to execute ───────────────────────────────────────────────────────

  describe("enter key executes command", () => {
    it("executes_selected_command_and_closes_palette_on_enter", () => {
      render(<CommandPalette />);
      openPalette();

      // Navigate to "Send Money" (first item is already selected)
      fireEvent.keyDown(document, { key: "Enter" });

      expect(routerPush).toHaveBeenCalledWith("/send");
      expect(screen.queryByPlaceholderText("Search commands...")).not.toBeInTheDocument();
    });

    it("executes_correctly_after_arrow_navigation", () => {
      render(<CommandPalette />);
      openPalette();

      // Navigate to "Bills" (third item, index 2)
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "ArrowDown" });
      fireEvent.keyDown(document, { key: "Enter" });

      expect(routerPush).toHaveBeenCalledWith("/bills");
    });

    it("does_nothing_when_enter_pressed_on_empty_command_list", () => {
      render(<CommandPalette />);
      openPalette();
      typeInSearch("zzz_nonexistent_zzz");

      fireEvent.keyDown(document, { key: "Enter" });
      expect(routerPush).not.toHaveBeenCalled();
      // Palette should remain open so the user can adjust their search
      expect(screen.getByText("No commands found")).toBeInTheDocument();
    });
  });

  // ── Click to execute ───────────────────────────────────────────────────────

  describe("click to execute", () => {
    it("executes_command_and_closes_when_button_is_clicked", () => {
      render(<CommandPalette />);
      openPalette();

      fireEvent.click(screen.getByText("Dashboard"));
      expect(routerPush).toHaveBeenCalledWith("/dashboard");
      expect(screen.queryByPlaceholderText("Search commands...")).not.toBeInTheDocument();
    });

    it("executes_filtered_command_on_click", () => {
      render(<CommandPalette />);
      openPalette();
      typeInSearch("connect");

      fireEvent.click(screen.getByText("Connect Wallet"));
      // Connect Wallet action does not call router.push — it just closes
      expect(screen.queryByPlaceholderText("Search commands...")).not.toBeInTheDocument();
    });
  });

  // ── Keyboard shortcut does not interfere with other keys ───────────────────

  describe("keyboard shortcut isolation", () => {
    it("does_not_open_palette_for_regular_k_keypress", () => {
      render(<CommandPalette />);
      fireEvent.keyDown(document, { key: "k" });
      expect(screen.queryByPlaceholderText("Search commands...")).not.toBeInTheDocument();
    });

    it("does_not_open_palette_for_other_modifier_plus_k", () => {
      render(<CommandPalette />);
      fireEvent.keyDown(document, { key: "k", altKey: true });
      expect(screen.queryByPlaceholderText("Search commands...")).not.toBeInTheDocument();
    });

    it("does_not_close_palette_when_other_keys_are_pressed", () => {
      render(<CommandPalette />);
      openPalette();
      fireEvent.keyDown(document, { key: "a" });
      expect(screen.getByPlaceholderText("Search commands...")).toBeInTheDocument();
    });
  });

  // ── Accessibility ──────────────────────────────────────────────────────────

  describe("accessibility", () => {
    it("autofocuses_the_search_input_when_opened", () => {
      render(<CommandPalette />);
      openPalette();
      const input = screen.getByPlaceholderText("Search commands...");
      expect(document.activeElement).toBe(input);
    });

    it("renders_keyboard_shortcut_hints_in_the_footer", () => {
      render(<CommandPalette />);
      openPalette();
      expect(screen.getByText("to navigate")).toBeInTheDocument();
      expect(screen.getByText("to select")).toBeInTheDocument();
      expect(screen.getByText("to open")).toBeInTheDocument();
    });
  });
});
