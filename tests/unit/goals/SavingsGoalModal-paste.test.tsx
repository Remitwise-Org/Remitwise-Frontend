import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SavingsGoalModal from "@/app/dashboard/goals/components/SavingsGoalModal";

function pasteEvent(plainText: string, types: string[]) {
  return {
    clipboardData: {
      types,
      getData: (type: string) => (type === "text/plain" ? plainText : ""),
    },
  };
}

describe("SavingsGoalModal description paste handling", () => {
  it("strips HTML tags when the clipboard carries an HTML payload", () => {
    render(
      <SavingsGoalModal isOpen onClose={vi.fn()} onSave={vi.fn()} editingGoal={null} />
    );

    const textarea = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
    fireEvent.paste(textarea, pasteEvent("<b>rich</b> text", ["text/html", "text/plain"]));

    expect(textarea.value).toBe("rich text");
  });

  it("leaves a plain-text-only paste to the browser's default handling", () => {
    render(
      <SavingsGoalModal isOpen onClose={vi.fn()} onSave={vi.fn()} editingGoal={null} />
    );

    const textarea = screen.getByLabelText(/description/i) as HTMLTextAreaElement;
    const event = pasteEvent("plain text only", ["text/plain"]);
    const defaultPrevented = !fireEvent.paste(textarea, event);

    // No text/html type present -- the handler should not have called
    // preventDefault, leaving the paste to the browser (jsdom doesn't
    // actually insert text on a synthetic paste, so we only assert the
    // handler declined to intercept it).
    expect(defaultPrevented).toBe(false);
  });
});
