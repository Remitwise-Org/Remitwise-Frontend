import React from "react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import ShortcutsCheatSheet from "@/components/ShortcutsCheatSheet";
import { KEYBOARD_SHORTCUTS } from "@/lib/config/shortcuts";

vi.mock("@/lib/hooks/useSeo", () => ({
  useSeo: vi.fn(),
}));

vi.mock("@/lib/context/ToastContext", () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

describe("ShortcutsCheatSheet", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the full shortcut list on screen", () => {
    render(<ShortcutsCheatSheet />);

    expect(
      screen.getByRole("heading", { name: "Keyboard Shortcuts" }),
    ).toBeInTheDocument();

    for (const entry of KEYBOARD_SHORTCUTS) {
      expect(screen.getAllByText(entry.label).length).toBeGreaterThan(0);
    }
  });

  it("exposes a Print control that calls window.print", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<ShortcutsCheatSheet />);

    fireEvent.click(screen.getByRole("button", { name: /print/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);

    printSpy.mockRestore();
  });

  it("includes a print-only RemitWise cheat sheet heading", () => {
    const { container } = render(<ShortcutsCheatSheet />);
    expect(container.querySelector(".print\\:block")).toBeTruthy();
    expect(screen.getByText("RemitWise")).toBeInTheDocument();
  });
});
