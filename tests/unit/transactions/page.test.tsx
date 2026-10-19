import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { DensityProvider } from "@/lib/context/DensityContext";
import { ToastProvider } from "@/lib/context/ToastContext";
import TransactionsPage from "@/app/transactions/page";

// Mock URL methods
const createObjectURLMock = vi.fn(() => "blob:mock-url");
const revokeObjectURLMock = vi.fn();

describe("TransactionsPage Export Component Integration", () => {
  beforeEach(() => {
    createObjectURLMock.mockClear();
    revokeObjectURLMock.mockClear();
    vi.spyOn(URL, "createObjectURL").mockImplementation(createObjectURLMock);
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(revokeObjectURLMock);
    // Mock anchor click behavior
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.useFakeTimers();
    // Wednesday so sample rows land in Today / This Week / Earlier
    vi.setSystemTime(new Date(2026, 6, 22, 15, 0, 0));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const renderComponent = () => {
    return render(
      <ToastProvider>
        <DensityProvider>
          <TransactionsPage />
        </DensityProvider>
      </ToastProvider>
    );
  };

  it("should render the export button enabled when there are transactions", () => {
    renderComponent();
    const exportButton = screen.getByRole("button", {
      name: /export filtered transactions/i,
    });
    expect(exportButton).toBeInTheDocument();
    expect(exportButton).not.toBeDisabled();
  });

  it("should open export dropdown on click and trigger download on clicking CSV", () => {
    renderComponent();
    const exportButton = screen.getByRole("button", {
      name: /export filtered transactions/i,
    });

    // Dropdown should not be visible initially
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    // Click to open
    fireEvent.click(exportButton);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    // Click Export as CSV option
    const csvButton = screen.getByRole("menuitem", { name: /export as csv/i });
    fireEvent.click(csvButton);

    // Verify it triggered URL.createObjectURL
    expect(createObjectURLMock).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();

    // Dropdown should close after click
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should trigger JSON download on clicking JSON export option", () => {
    renderComponent();
    const exportButton = screen.getByRole("button", {
      name: /export filtered transactions/i,
    });

    fireEvent.click(exportButton);
    const jsonButton = screen.getByRole("menuitem", { name: /export as json/i });
    fireEvent.click(jsonButton);

    expect(createObjectURLMock).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
  });

  it("should disable export button when filtered results are empty", () => {
    renderComponent();
    
    // Type query that matches nothing in the search input
    const searchInput = screen.getByPlaceholderText(/search id, recipient, type, status, amount/i);
    fireEvent.change(searchInput, { target: { value: "NonExistentTransactionXYZ" } });

    // Advance timer to trigger debounced filter update
    act(() => {
      vi.advanceTimersByTime(300);
    });

    const exportButton = screen.getByRole("button", {
      name: /export filtered transactions/i,
    });
    expect(exportButton).toBeDisabled();

    // Dropdown should not be opened if clicked while disabled
    fireEvent.click(exportButton);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("keeps ascending date sort when a type filter changes", () => {
    renderComponent();

    const dateSort = screen.getByRole("button", { name: /date descending/i });
    fireEvent.click(dateSort);
    expect(screen.getByRole("button", { name: /date ascending/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Completed" }));

    // Within Earlier, ascending date keeps older TX010 before newer TX007
    const older = screen.getByText("#TX010");
    const newer = screen.getByText("#TX007");
    expect(older.compareDocumentPosition(newer)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it("keeps descending amount sort when a status filter changes", () => {
    renderComponent();

    const amountSort = screen.getByRole("button", { name: /^amount$/i });
    fireEvent.click(amountSort);
    fireEvent.click(screen.getByRole("button", { name: /amount ascending/i }));
    expect(screen.getByRole("button", { name: /amount descending/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Completed" }));

    // Within Earlier, descending amount keeps TX007 (+75) before TX010 (-800)
    const received = screen.getByText("#TX007");
    const split = screen.getByText("#TX010");
    expect(received.compareDocumentPosition(split)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it("closes dropdown when Escape key is pressed", () => {
    renderComponent();
    const exportButton = screen.getByRole("button", {
      name: /export filtered transactions/i,
    });

    fireEvent.click(exportButton);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    // Fire Escape key down
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("closes dropdown when clicking outside", () => {
    renderComponent();
    const exportButton = screen.getByRole("button", {
      name: /export filtered transactions/i,
    });

    fireEvent.click(exportButton);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("groups results into Today, This Week, and Earlier", () => {
    renderComponent();
    expect(screen.getByRole("heading", { name: "Today" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "This Week" })
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Earlier" })).toBeInTheDocument();
  });

  it("shows a distinct no-results state when filters match nothing", () => {
    renderComponent();
    const searchInput = screen.getByPlaceholderText(
      /search id, recipient, type, status, amount/i
    );
    fireEvent.change(searchInput, {
      target: { value: "NonExistentTransactionXYZ" },
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(
      screen.getByText("No matching transactions")
    ).toBeInTheDocument();
    expect(screen.queryByText("No transactions yet")).not.toBeInTheDocument();
  });

  it("preserves date sort order when clearing all filters", () => {
    renderComponent();

    // Sort by date ascending
    const dateSort = screen.getByRole("button", { name: /date descending/i });
    fireEvent.click(dateSort);
    expect(screen.getByRole("button", { name: /date ascending/i })).toBeInTheDocument();

    // Apply a filter
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(screen.getByRole("button", { name: /date ascending/i })).toBeInTheDocument();

    // Clear all filters
    fireEvent.click(screen.getByRole("button", { name: /clear all/i }));

    // Sort should still be ascending
    expect(screen.getByRole("button", { name: /date ascending/i })).toBeInTheDocument();
  });

  it("preserves amount sort when search query changes", () => {
    renderComponent();

    // Sort by amount ascending
    const amountSort = screen.getByRole("button", { name: /^amount$/i });
    fireEvent.click(amountSort);

    // Now add a search query
    const searchInput = screen.getByPlaceholderText(
      /search id, recipient, type, status, amount/i
    );
    fireEvent.change(searchInput, { target: { value: "TX00" } });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Sort should still be ascending
    expect(screen.getByRole("button", { name: /amount ascending/i })).toBeInTheDocument();
  });

  it("preserves date sort when date range filter is applied", () => {
    renderComponent();

    // Sort by date ascending
    const dateSort = screen.getByRole("button", { name: /date descending/i });
    fireEvent.click(dateSort);
    expect(screen.getByRole("button", { name: /date ascending/i })).toBeInTheDocument();

    // Apply a date range filter
    const fromInput = screen.getByLabelText(/from/i);
    fireEvent.change(fromInput, { target: { value: "2026-07-01" } });

    // Sort should still be ascending
    expect(screen.getByRole("button", { name: /date ascending/i })).toBeInTheDocument();
  });
});
