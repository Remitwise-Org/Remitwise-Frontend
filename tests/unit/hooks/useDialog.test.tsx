import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDialog } from "@/lib/hooks/useDialog";

function TestDialog({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const { isOpen, open, close, dialogProps } = useDialog({ onOpenChange });

  return (
    <>
      <button type="button" onClick={open}>
        Open dialog
      </button>
      {isOpen && (
        <div {...dialogProps} aria-labelledby="dialog-title">
          <h2 id="dialog-title">Dialog title</h2>
          <button type="button" onClick={close}>
            Close dialog
          </button>
        </div>
      )}
    </>
  );
}

describe("useDialog", () => {
  it("opens the dialog and moves focus into it", () => {
    render(<TestDialog />);

    const openButton = screen.getByRole("button", { name: "Open dialog" });
    act(() => openButton.focus());
    fireEvent.click(openButton);

    const dialog = screen.getByRole("dialog", { name: "Dialog title" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(document.activeElement).toBe(dialog);
  });

  it("closes on Escape and restores focus to the opener", () => {
    const onOpenChange = vi.fn();
    render(<TestDialog onOpenChange={onOpenChange} />);

    const openButton = screen.getByRole("button", { name: "Open dialog" });
    fireEvent.click(openButton);
    expect(screen.getByRole("dialog", { name: "Dialog title" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(openButton);
    expect(onOpenChange).toHaveBeenCalledTimes(2);
    expect(onOpenChange).toHaveBeenNthCalledWith(1, true);
    expect(onOpenChange).toHaveBeenNthCalledWith(2, false);
  });

  it("does not close for other keys", () => {
    render(<TestDialog />);

    fireEvent.click(screen.getByRole("button", { name: "Open dialog" }));
    fireEvent.keyDown(document, { key: "Enter" });

    expect(screen.getByRole("dialog", { name: "Dialog title" })).toBeInTheDocument();
  });
});
