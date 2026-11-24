/**
 * Component tests for ConfirmDialog
 *
 * Covers: rendering title/message, confirm and cancel callbacks fire once,
 * Escape cancels, focus moves into the dialog and returns to the trigger,
 * role="dialog" with aria-modal/labelled-by present, and destructive
 * variant styling hook.
 *
 * The dialog is controlled by ConfirmProvider, so we wrap it with a small
 * test consumer that calls `confirm()` to open the dialog.
 */

import React, { useState } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConfirmProvider, useConfirm } from "@/lib/context/ConfirmContext";
import ConfirmDialog from "./ConfirmDialog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RenderOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  intent?: "primary" | "danger";
}

/**
 * Renders a ConfirmProvider + ConfirmDialog with a trigger button that calls
 * `confirm(options)` and captures the resolved value.
 *
 * Returns the captured results array so tests can assert on the promise
 * resolution.
 */
function renderDialog(options: RenderOptions = {}) {
  const results: boolean[] = [];

  function TestConsumer() {
    const { confirm } = useConfirm();
    const [status, setStatus] = useState<string>("idle");

    const handleClick = async () => {
      setStatus("pending");
      const result = await confirm(options);
      results.push(result);
      setStatus(result ? "confirmed" : "cancelled");
    };

    return (
      <>
        <button onClick={handleClick} data-testid="trigger">
          Open confirm
        </button>
        <span data-testid="status">{status}</span>
      </>
    );
  }

  const utils = render(
    <ConfirmProvider>
      <TestConsumer />
      <ConfirmDialog />
    </ConfirmProvider>,
  );

  return { ...utils, results };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

describe("ConfirmDialog — Rendering", () => {
  beforeEach(() => vi.useRealTimers());
  afterEach(() => vi.restoreAllMocks());

  it("does not render before confirm() is called", () => {
    renderDialog();
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
  });

  it("renders the title when the dialog opens", async () => {
    const user = userEvent.setup();
    renderDialog({ title: "Delete account?" });
    await user.click(screen.getByTestId("trigger"));
    expect(await screen.findByText("Delete account?")).toBeInTheDocument();
  });

  it("renders the description when provided", async () => {
    const user = userEvent.setup();
    renderDialog({ title: "Delete account?", description: "This cannot be undone." });
    await user.click(screen.getByTestId("trigger"));
    expect(await screen.findByText("This cannot be undone.")).toBeInTheDocument();
  });

  it("does not render a description element when description is empty", async () => {
    const user = userEvent.setup();
    renderDialog({ title: "No description", description: "" });
    await user.click(screen.getByTestId("trigger"));
    await screen.findByTestId("confirm-dialog");
    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
  });

  it("renders custom confirm and cancel labels", async () => {
    const user = userEvent.setup();
    renderDialog({ confirmLabel: "Yes, delete", cancelLabel: "Keep it" });
    await user.click(screen.getByTestId("trigger"));
    expect(await screen.findByText("Yes, delete")).toBeInTheDocument();
    expect(screen.getByText("Keep it")).toBeInTheDocument();
  });

  it("uses default labels when none are provided", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByTestId("trigger"));
    expect(await screen.findByText("Are you sure?")).toBeInTheDocument();
    expect(screen.getByText("Confirm")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Callbacks fire exactly once
// ---------------------------------------------------------------------------

describe("ConfirmDialog — Callbacks", () => {
  beforeEach(() => vi.useRealTimers());
  afterEach(() => vi.restoreAllMocks());

  it("confirm resolves true exactly once when Confirm is clicked", async () => {
    const user = userEvent.setup();
    const { results } = renderDialog();
    await user.click(screen.getByTestId("trigger"));
    await user.click(await screen.findByTestId("confirm-dialog-confirm"));
    await waitFor(() => expect(results).toEqual([true]));
    expect(screen.getByTestId("status")).toHaveTextContent("confirmed");
  });

  it("cancel resolves false exactly once when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const { results } = renderDialog();
    await user.click(screen.getByTestId("trigger"));
    await user.click(await screen.findByTestId("confirm-dialog-cancel"));
    await waitFor(() => expect(results).toEqual([false]));
    expect(screen.getByTestId("status")).toHaveTextContent("cancelled");
  });

  it("close (X) button resolves false exactly once", async () => {
    const user = userEvent.setup();
    const { results } = renderDialog();
    await user.click(screen.getByTestId("trigger"));
    await user.click(await screen.findByTestId("confirm-dialog-close"));
    await waitFor(() => expect(results).toEqual([false]));
  });

  it("backdrop click resolves false exactly once", async () => {
    const user = userEvent.setup();
    const { results } = renderDialog();
    await user.click(screen.getByTestId("trigger"));
    await screen.findByTestId("confirm-dialog");
    await user.click(screen.getByTestId("confirm-dialog-backdrop"));
    await waitFor(() => expect(results).toEqual([false]));
  });
});

// ---------------------------------------------------------------------------
// Keyboard behaviour
// ---------------------------------------------------------------------------

describe("ConfirmDialog — Keyboard", () => {
  beforeEach(() => vi.useRealTimers());
  afterEach(() => vi.restoreAllMocks());

  it("Escape cancels the dialog", async () => {
    const user = userEvent.setup();
    const { results } = renderDialog();
    await user.click(screen.getByTestId("trigger"));
    await screen.findByTestId("confirm-dialog");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(results).toEqual([false]));
  });

  it("dialog is not visible after Escape", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByTestId("trigger"));
    await screen.findByTestId("confirm-dialog");
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument(),
    );
  });

  it("Tab cycles through the dialog focusable elements (focus trap)", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByTestId("trigger"));
    const dialog = await screen.findByTestId("confirm-dialog");

    // Focus should start inside the dialog (on the confirm button after the
    // focus-trap timer fires).  Wait for focus to land.
    const confirmBtn = screen.getByTestId("confirm-dialog-confirm");
    await waitFor(() => expect(document.activeElement).toBe(confirmBtn));

    // Tab forward should cycle back to the first focusable element
    await user.tab();
    // The close button is the first focusable element in the dialog header
    const closeBtn = screen.getByTestId("confirm-dialog-close");
    expect(document.activeElement).toBe(closeBtn);

    // Tab backward from close should wrap to the last focusable element
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(confirmBtn);
  });
});

// ---------------------------------------------------------------------------
// Focus management
// ---------------------------------------------------------------------------

describe("ConfirmDialog — Focus management", () => {
  beforeEach(() => vi.useRealTimers());
  afterEach(() => vi.restoreAllMocks());

  it("moves focus into the dialog when it opens", async () => {
    const user = userEvent.setup();
    renderDialog();

    const trigger = screen.getByTestId("trigger");
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    await user.click(trigger);
    const confirmBtn = await screen.findByTestId("confirm-dialog-confirm");

    // The focus trap moves focus to the confirm button after a short delay
    await waitFor(() => expect(document.activeElement).toBe(confirmBtn), {
      timeout: 1000,
    });
  });

  it("restores focus to the trigger after the dialog closes", async () => {
    const user = userEvent.setup();
    renderDialog();

    const trigger = screen.getByTestId("trigger");
    trigger.focus();
    await user.click(trigger);
    await screen.findByTestId("confirm-dialog");

    // Close via Confirm
    await user.click(screen.getByTestId("confirm-dialog-confirm"));

    // Focus should return to the trigger after a short delay
    await waitFor(
      () => expect(document.activeElement).toBe(trigger),
      { timeout: 1000 },
    );
  });
});

// ---------------------------------------------------------------------------
// ARIA attributes
// ---------------------------------------------------------------------------

describe("ConfirmDialog — ARIA attributes", () => {
  beforeEach(() => vi.useRealTimers());
  afterEach(() => vi.restoreAllMocks());

  it('has role="dialog"', async () => {
    const user = userEvent.setup();
    renderDialog({ title: "Test title" });
    await user.click(screen.getByTestId("trigger"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
  });

  it('has aria-modal="true"', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByTestId("trigger"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("has aria-labelledby pointing to the title element", async () => {
    const user = userEvent.setup();
    renderDialog({ title: "Accessibility test" });
    await user.click(screen.getByTestId("trigger"));
    const dialog = await screen.findByRole("dialog");
    const labelledBy = dialog.getAttribute("aria-labelledby");
    expect(labelledBy).toBeTruthy();
    const titleEl = document.getElementById(labelledBy!);
    expect(titleEl).toHaveTextContent("Accessibility test");
  });

  it("has aria-describedby when a description is provided", async () => {
    const user = userEvent.setup();
    renderDialog({ description: "Some description" });
    await user.click(screen.getByTestId("trigger"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-describedby", "confirm-dialog-description");
  });

  it("does not have aria-describedby when description is empty", async () => {
    const user = userEvent.setup();
    renderDialog({ description: "" });
    await user.click(screen.getByTestId("trigger"));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).not.toHaveAttribute("aria-describedby");
  });

  it("close button has aria-label='Cancel'", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByTestId("trigger"));
    await screen.findByTestId("confirm-dialog");
    const closeBtn = screen.getByTestId("confirm-dialog-close");
    expect(closeBtn).toHaveAttribute("aria-label", "Cancel");
  });

  it("icons have aria-hidden", async () => {
    const user = userEvent.setup();
    renderDialog({ intent: "danger" });
    await user.click(screen.getByTestId("trigger"));
    const dialog = await screen.findByTestId("confirm-dialog");
    const svgs = dialog.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
    }
  });
});

// ---------------------------------------------------------------------------
// Destructive variant styling
// ---------------------------------------------------------------------------

describe("ConfirmDialog — Destructive variant", () => {
  beforeEach(() => vi.useRealTimers());
  afterEach(() => vi.restoreAllMocks());

  it("confirm button has red background for danger intent", async () => {
    const user = userEvent.setup();
    renderDialog({ intent: "danger" });
    await user.click(screen.getByTestId("trigger"));
    const confirmBtn = await screen.findByTestId("confirm-dialog-confirm");
    expect(confirmBtn.className).toMatch(/bg-red-600/);
  });

  it("confirm button has primary-600 background for primary intent", async () => {
    const user = userEvent.setup();
    renderDialog({ intent: "primary" });
    await user.click(screen.getByTestId("trigger"));
    const confirmBtn = await screen.findByTestId("confirm-dialog-confirm");
    expect(confirmBtn.className).toMatch(/bg-primary-600/);
  });

  it("defaults to primary intent when not specified", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByTestId("trigger"));
    const confirmBtn = await screen.findByTestId("confirm-dialog-confirm");
    expect(confirmBtn.className).toMatch(/bg-primary-600/);
  });

  it("icon container uses red background for danger intent", async () => {
    const user = userEvent.setup();
    renderDialog({ intent: "danger" });
    await user.click(screen.getByTestId("trigger"));
    await screen.findByTestId("confirm-dialog");
    // The icon container div uses bg-red-600/20 for danger
    const alertTriangle = screen.getByTestId("confirm-dialog").querySelector(".text-red-500");
    expect(alertTriangle).toBeInTheDocument();
  });

  it("icon container uses primary background for primary intent", async () => {
    const user = userEvent.setup();
    renderDialog({ intent: "primary" });
    await user.click(screen.getByTestId("trigger"));
    await screen.findByTestId("confirm-dialog");
    const helpIcon = screen.getByTestId("confirm-dialog").querySelector(".text-primary-400");
    expect(helpIcon).toBeInTheDocument();
  });
});
