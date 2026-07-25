import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { DensityProvider } from "@/lib/context/DensityContext";
import TransactionsPage from "@/app/transactions/page";

// Mock URL methods
const createObjectURLMock = vi.fn(() => "blob:mock-url");
const revokeObjectURLMock = vi.fn();

describe("TransactionsPage Export Component Integration", () => {
  beforeEach(() => {
    vi.stubGlobal("URL", {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });
    // Mock anchor click behavior
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  const renderComponent = () => {
    return render(
      <DensityProvider>
        <TransactionsPage />
      </DensityProvider>
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
});
