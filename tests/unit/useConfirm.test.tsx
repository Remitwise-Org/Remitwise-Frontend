/**
 * @vitest-environment jsdom
 *
 * Unit tests for:
 *  - useConfirm hook (via ConfirmProvider)
 *  - ConfirmDialog component
 *
 * These tests verify that the custom confirm dialog correctly:
 *  1. Opens when `confirm()` is called
 *  2. Resolves `true` when the user clicks the Confirm button
 *  3. Resolves `false` when the user clicks the Cancel button
 *  4. Resolves `false` when the user presses Escape
 *  5. Resolves `false` when the user clicks the backdrop
 *  6. Resolves `false` when the close (×) button is clicked
 *  7. Renders custom title, description, and button labels
 *  8. Renders danger intent styling on the confirm button
 *  9. Throws when useConfirm is used outside a ConfirmProvider
 */

import React, { act, useState } from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import { ConfirmProvider, useConfirm } from "@/lib/context/ConfirmContext";
import ConfirmDialog from "@/components/ConfirmDialog";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Renders a test component that exposes a button to trigger `confirm()` and
 * captures its resolved value.
 */
function renderConfirmSetup(options?: Parameters<ReturnType<typeof useConfirm>["confirm"]>[0]) {
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

  const rendered = render(
    <ConfirmProvider>
      <TestConsumer />
      <ConfirmDialog />
    </ConfirmProvider>,
  );

  return { rendered, results };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ConfirmProvider + useConfirm", () => {
  it("dialog is hidden before confirm() is called", () => {
    renderConfirmSetup();
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
  });

  it("dialog is shown after confirm() is called", async () => {
    const user = userEvent.setup();
    renderConfirmSetup();

    await user.click(screen.getByTestId("trigger"));

    expect(await screen.findByTestId("confirm-dialog")).toBeInTheDocument();
  });

  it("resolves true when Confirm button is clicked", async () => {
    const user = userEvent.setup();
    const { results } = renderConfirmSetup();

    await user.click(screen.getByTestId("trigger"));
    await user.click(await screen.findByTestId("confirm-dialog-confirm"));

    await waitFor(() => expect(results).toEqual([true]));
    expect(screen.getByTestId("status")).toHaveTextContent("confirmed");
  });

  it("resolves false when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    const { results } = renderConfirmSetup();

    await user.click(screen.getByTestId("trigger"));
    await user.click(await screen.findByTestId("confirm-dialog-cancel"));

    await waitFor(() => expect(results).toEqual([false]));
    expect(screen.getByTestId("status")).toHaveTextContent("cancelled");
  });

  it("resolves false when the close (×) button is clicked", async () => {
    const user = userEvent.setup();
    const { results } = renderConfirmSetup();

    await user.click(screen.getByTestId("trigger"));
    await user.click(await screen.findByTestId("confirm-dialog-close"));

    await waitFor(() => expect(results).toEqual([false]));
  });

  it("resolves false when Escape is pressed", async () => {
    const user = userEvent.setup();
    const { results } = renderConfirmSetup();

    await user.click(screen.getByTestId("trigger"));
    await screen.findByTestId("confirm-dialog");

    await user.keyboard("{Escape}");

    await waitFor(() => expect(results).toEqual([false]));
  });

  it("resolves false when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const { results } = renderConfirmSetup();

    await user.click(screen.getByTestId("trigger"));
    await screen.findByTestId("confirm-dialog");

    // The backdrop is the element with data-testid="confirm-dialog-backdrop"
    await user.click(screen.getByTestId("confirm-dialog-backdrop"));

    await waitFor(() => expect(results).toEqual([false]));
  });

  it("dialog closes after resolving", async () => {
    const user = userEvent.setup();
    renderConfirmSetup();

    await user.click(screen.getByTestId("trigger"));
    await user.click(await screen.findByTestId("confirm-dialog-confirm"));

    await waitFor(() =>
      expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument(),
    );
  });

  it("can be called multiple times sequentially", async () => {
    const user = userEvent.setup();
    const { results } = renderConfirmSetup();

    // First call – confirm
    await user.click(screen.getByTestId("trigger"));
    await user.click(await screen.findByTestId("confirm-dialog-confirm"));
    await waitFor(() => expect(results.length).toBe(1));

    // Second call – cancel
    await user.click(screen.getByTestId("trigger"));
    await user.click(await screen.findByTestId("confirm-dialog-cancel"));
    await waitFor(() => expect(results.length).toBe(2));

    expect(results).toEqual([true, false]);
  });
});

describe("ConfirmDialog – custom options", () => {
  it("renders custom title and description", async () => {
    const user = userEvent.setup();
    renderConfirmSetup({
      title: "Delete account",
      description: "This action cannot be undone.",
    });

    await user.click(screen.getByTestId("trigger"));

    expect(await screen.findByText("Delete account")).toBeInTheDocument();
    expect(screen.getByText("This action cannot be undone.")).toBeInTheDocument();
  });

  it("renders custom confirmLabel and cancelLabel", async () => {
    const user = userEvent.setup();
    renderConfirmSetup({ confirmLabel: "Yes, delete", cancelLabel: "Keep it" });

    await user.click(screen.getByTestId("trigger"));

    expect(await screen.findByText("Yes, delete")).toBeInTheDocument();
    expect(screen.getByText("Keep it")).toBeInTheDocument();
  });

  it("uses default title when none provided", async () => {
    const user = userEvent.setup();
    renderConfirmSetup();

    await user.click(screen.getByTestId("trigger"));

    expect(await screen.findByText("Are you sure?")).toBeInTheDocument();
  });

  it("does not render description element when description is empty", async () => {
    const user = userEvent.setup();
    renderConfirmSetup({ title: "No description", description: "" });

    await user.click(screen.getByTestId("trigger"));
    await screen.findByTestId("confirm-dialog");

    expect(screen.queryByRole("paragraph")).not.toBeInTheDocument();
    // No aria-describedby when description is empty
    const dialog = screen.getByRole("dialog");
    expect(dialog).not.toHaveAttribute("aria-describedby");
  });
});

describe("ConfirmDialog – accessibility", () => {
  it("has role=dialog and aria-modal=true", async () => {
    const user = userEvent.setup();
    renderConfirmSetup();

    await user.click(screen.getByTestId("trigger"));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("has aria-labelledby pointing to the title", async () => {
    const user = userEvent.setup();
    renderConfirmSetup({ title: "Accessibility test" });

    await user.click(screen.getByTestId("trigger"));

    const dialog = await screen.findByRole("dialog");
    const labelledById = dialog.getAttribute("aria-labelledby");
    expect(labelledById).toBeTruthy();
    const titleEl = document.getElementById(labelledById!);
    expect(titleEl).toHaveTextContent("Accessibility test");
  });

  it("has aria-describedby when description is provided", async () => {
    const user = userEvent.setup();
    renderConfirmSetup({ description: "Some description" });

    await user.click(screen.getByTestId("trigger"));

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-describedby", "confirm-dialog-description");
  });

  it("cancel button has accessible label", async () => {
    const user = userEvent.setup();
    renderConfirmSetup();

    await user.click(screen.getByTestId("trigger"));
    await screen.findByTestId("confirm-dialog");

    const closeBtn = screen.getByTestId("confirm-dialog-close");
    expect(closeBtn).toHaveAttribute("aria-label", "Cancel");
  });
});

describe("ConfirmDialog – intent", () => {
  it("confirm button has red background for danger intent", async () => {
    const user = userEvent.setup();
    renderConfirmSetup({ intent: "danger" });

    await user.click(screen.getByTestId("trigger"));
    const confirmBtn = await screen.findByTestId("confirm-dialog-confirm");

    // Check that the danger class is applied (bg-red-600)
    expect(confirmBtn.className).toMatch(/bg-red-600/);
  });

  it("confirm button has primary-600 background for primary intent", async () => {
    const user = userEvent.setup();
    renderConfirmSetup({ intent: "primary" });

    await user.click(screen.getByTestId("trigger"));
    const confirmBtn = await screen.findByTestId("confirm-dialog-confirm");

    expect(confirmBtn.className).toMatch(/bg-primary-600/);
  });

  it("defaults to primary intent when not specified", async () => {
    const user = userEvent.setup();
    renderConfirmSetup();

    await user.click(screen.getByTestId("trigger"));
    const confirmBtn = await screen.findByTestId("confirm-dialog-confirm");

    expect(confirmBtn.className).toMatch(/bg-primary-600/);
  });
});

describe("useConfirm – error boundary", () => {
  it("throws when used outside ConfirmProvider", () => {
    function BrokenConsumer() {
      useConfirm();
      return <div />;
    }

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<BrokenConsumer />)).toThrow(
      "useConfirm must be used within a ConfirmProvider",
    );

    spy.mockRestore();
  });
});
