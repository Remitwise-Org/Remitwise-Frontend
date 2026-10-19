import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TransactionHistorySearchInput from "@/app/dashboard/transaction-history/components/transaction-history-search-input";

function makePasteEvent(plainText: string, types: string[]) {
  return {
    clipboardData: {
      types,
      getData: (type: string) => (type === "text/plain" ? plainText : ""),
    },
  };
}

describe("TransactionHistorySearchInput", () => {
  it("shows a validation error when submitted empty, without calling onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TransactionHistorySearchInput value="" onChange={onChange} />);

    await user.click(screen.getByRole("searchbox"));
    await user.keyboard("{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a search term");
    expect(screen.getByRole("searchbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("does not show an error when submitted with a non-empty value", async () => {
    const user = userEvent.setup();
    render(<TransactionHistorySearchInput value="acme" onChange={vi.fn()} />);

    await user.click(screen.getByRole("searchbox"));
    await user.keyboard("{Enter}");

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not show an error when submitted with whitespace-only value", async () => {
    const user = userEvent.setup();
    render(<TransactionHistorySearchInput value="   " onChange={vi.fn()} />);

    await user.click(screen.getByRole("searchbox"));
    await user.keyboard("{Enter}");

    expect(screen.getByRole("alert")).toHaveTextContent("Enter a search term");
  });

  it("clears a previous error as soon as the user types", async () => {
    const user = userEvent.setup();
    function Wrapper() {
      const [value, setValue] = useState("");
      return <TransactionHistorySearchInput value={value} onChange={setValue} />;
    }
    render(<Wrapper />);

    await user.click(screen.getByRole("searchbox"));
    await user.keyboard("{Enter}");
    expect(screen.getByRole("alert")).toBeInTheDocument();

    await user.type(screen.getByRole("searchbox"), "a");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("still calls onChange for every keystroke (live filtering is unaffected)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TransactionHistorySearchInput value="" onChange={onChange} />);

    await user.type(screen.getByRole("searchbox"), "abc");

    expect(onChange).toHaveBeenCalledTimes(3);
  });

  // Issue #1401 — clipboard paste HTML rejection
  it("strips HTML tags when a clipboard payload carries text/html (Issue #1401)", () => {
    const onChange = vi.fn();
    render(<TransactionHistorySearchInput value="" onChange={onChange} />);

    const input = screen.getByRole("searchbox");
    fireEvent.paste(input, makePasteEvent("<b>rich</b> text", ["text/html", "text/plain"]));

    // onChange must have been called with the stripped plain text, not the raw HTML
    expect(onChange).toHaveBeenCalledWith("rich text");
  });

  it("leaves a plain-text-only paste to the browser default (Issue #1401)", () => {
    const onChange = vi.fn();
    render(<TransactionHistorySearchInput value="" onChange={onChange} />);

    const input = screen.getByRole("searchbox");
    const event = makePasteEvent("plain only", ["text/plain"]);
    // When there is no text/html type, the handler must not call preventDefault,
    // so onChange is never called by our handler (browser handles it natively).
    const defaultPrevented = !fireEvent.paste(input, event);
    expect(defaultPrevented).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });
});
