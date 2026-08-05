import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchResultsPage } from "@/app/search/page";

describe("SearchResultsPage", () => {
  it("renders a grouped invoice result for a matching query", () => {
    render(<SearchResultsPage searchParams={{ q: "invoice" }} />);

    expect(screen.getByRole("heading", { name: /global search results/i })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { name: /invoice/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /invoice #b-1048/i })).toBeInTheDocument();
  });

  it("shows an empty-state prompt when no query is provided", () => {
    render(<SearchResultsPage searchParams={{}} />);

    expect(screen.getByText(/search for invoices, addresses, or settings to surface relevant results/i)).toBeInTheDocument();
  });

  it("strips control characters from the ?q= param before rendering (Issue #1419)", () => {
    // A query with embedded CRLF — without sanitization this would reach the
    // rendered output and could corrupt HTTP log lines or smuggle forged entries.
    render(<SearchResultsPage searchParams={{ q: "invoice\r\n\x00" }} />);

    // The displayed query must not contain the raw control characters.
    const headings = screen.getAllByRole("heading");
    const allText = headings.map((h) => h.textContent).join(" ");
    expect(allText).not.toMatch(/\r|\n|\x00/);
  });

  it("caps an overlong ?q= param at 200 characters (Issue #1419)", () => {
    const longQuery = "a".repeat(500);
    render(<SearchResultsPage searchParams={{ q: longQuery }} />);

    // The displayed query in the result-count text must be capped, not the full 500 chars.
    const paragraph = screen.getByText(/showing/i);
    expect(paragraph.textContent?.length).toBeLessThan(300);
  });
});
