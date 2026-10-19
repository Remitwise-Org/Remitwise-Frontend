import React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ShortcutHelpProvider, useShortcutHelp } from "@/lib/context/ShortcutHelpContext";
import ShortcutHelpModal from "@/components/ShortcutHelpModal";

function TestApp() {
  const { open } = useShortcutHelp();
  return (
    <div>
      <button onClick={open}>Open Shortcuts</button>
      <ShortcutHelpModal />
    </div>
  );
}

describe("ShortcutHelpModal", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not render modal by default", () => {
    render(
      <ShortcutHelpProvider>
        <TestApp />
      </ShortcutHelpProvider>
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens modal when trigger button is clicked", () => {
    render(
      <ShortcutHelpProvider>
        <TestApp />
      </ShortcutHelpProvider>
    );

    const button = screen.getByRole("button", { name: "Open Shortcuts" });
    fireEvent.click(button);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Keyboard Shortcuts" })).toBeInTheDocument();
  });

  it("closes modal when close button is clicked", () => {
    render(
      <ShortcutHelpProvider>
        <TestApp />
      </ShortcutHelpProvider>
    );

    const openButton = screen.getByRole("button", { name: "Open Shortcuts" });
    fireEvent.click(openButton);

    const closeButton = screen.getByRole("button", { name: "Close keyboard shortcuts help modal" });
    fireEvent.click(closeButton);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens modal when pressing '?' key", () => {
    render(
      <ShortcutHelpProvider>
        <TestApp />
      </ShortcutHelpProvider>
    );

    fireEvent.keyDown(window, { key: "?" });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("does not open modal when pressing '?' key inside an input element", () => {
    render(
      <ShortcutHelpProvider>
        <div>
          <input data-testid="test-input" type="text" />
          <TestApp />
        </div>
      </ShortcutHelpProvider>
    );

    const input = screen.getByTestId("test-input");
    input.focus();

    fireEvent.keyDown(input, { key: "?" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not open modal when pressing '?' key inside a textarea element", () => {
    render(
      <ShortcutHelpProvider>
        <div>
          <textarea data-testid="test-textarea" />
          <TestApp />
        </div>
      </ShortcutHelpProvider>
    );

    const textarea = screen.getByTestId("test-textarea");
    textarea.focus();

    fireEvent.keyDown(textarea, { key: "?" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("links to the printable shortcuts page", () => {
    render(
      <ShortcutHelpProvider>
        <TestApp />
      </ShortcutHelpProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Open Shortcuts" }));

    const printableLink = screen.getByRole("link", {
      name: /view printable cheat sheet/i,
    });
    expect(printableLink).toHaveAttribute("href", "/shortcuts");
  });
});
