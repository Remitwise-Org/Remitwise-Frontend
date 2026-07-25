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
});
