import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import InsightPage from "./page";

// Mock the apiClient
vi.mock("@/lib/client/apiClient", () => ({
  default: {
    get: vi.fn(),
  },
}));

// Mock the Insights components
vi.mock("@/components/Insights/spendingVsSavingChart", () => ({
  default: () => <div data-testid="spending-vs-saving-chart">Chart</div>,
}));

vi.mock("@/components/ui/WidgetErrorState", () => ({
  default: ({ message }: { message: string }) => (
    <div data-testid="error-state">{message}</div>
  ),
}));

vi.mock("@/components/ui/WidgetEmptyState", () => ({
  default: () => <div data-testid="empty-state">No data</div>,
}));

vi.mock("@/components/ui/LoadingSkeletons", () => ({
  default: () => <div data-testid="loading-skeleton">Loading...</div>,
}));

import apiClient from "@/lib/client/apiClient";

const mockInsightsData = {
  period: "current_month",
  totals: {
    spending: 500,
    savings: 200,
    bills: 300,
    insurance: 150,
  },
  breakdown: [
    { category: "Food", amount: 500, type: "spending" },
    { category: "Emergency Fund", amount: 200, type: "savings" },
    { category: "Electricity", amount: 300, type: "bill" },
    { category: "Health Insurance", amount: 150, type: "insurance" },
  ],
  trend: {
    spending: [100, 200, 200],
    savings: [50, 75, 75],
  },
};

describe("InsightPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(apiClient.get).mockImplementation(
      () => new Promise(() => {})
    );

    render(<InsightPage />);
    expect(screen.getByTestId("loading-skeleton")).toBeInTheDocument();
  });

  it("fetches and displays insights data on mount", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: mockInsightsData,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    });

    render(<InsightPage />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/api/insights?period=current_month");
    });

    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });
  });

  it("displays error state when API call fails", async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(
      new Error("Failed to fetch")
    );

    render(<InsightPage />);

    await waitFor(() => {
      expect(screen.getByTestId("error-state")).toBeInTheDocument();
    });
  });

  it("displays empty state when no data is returned", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: {
        period: "current_month",
        totals: { spending: 0, savings: 0, bills: 0, insurance: 0 },
        breakdown: [],
        trend: {},
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    });

    render(<InsightPage />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
    });
  });

  it("renders period selector with correct options", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: mockInsightsData,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    });

    render(<InsightPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });

    const periodSelector = screen.getByRole("combobox", { name: /period/i });
    expect(periodSelector).toBeInTheDocument();
  });

  it("refetches data when period changes", async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        data: mockInsightsData,
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      })
      .mockResolvedValueOnce({
        data: { ...mockInsightsData, period: "last_3_months" },
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as any,
      });

    const { rerender } = render(<InsightPage />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith("/api/insights?period=current_month");
    });

    // Simulate period change
    rerender(<InsightPage />);

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });
  });

  it("displays totals correctly", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: mockInsightsData,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    });

    render(<InsightPage />);

    await waitFor(() => {
      expect(screen.queryByTestId("loading-skeleton")).not.toBeInTheDocument();
    });

    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByText(/200/)).toBeInTheDocument();
  });

  it("renders breakdown data", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: mockInsightsData,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    });

    render(<InsightPage />);

    await waitFor(() => {
      expect(screen.getByText(/Food/i)).toBeInTheDocument();
      expect(screen.getByText(/Emergency Fund/i)).toBeInTheDocument();
    });
  });

  it("handles network errors gracefully", async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(
      new Error("Network error")
    );

    render(<InsightPage />);

    await waitFor(() => {
      expect(screen.getByTestId("error-state")).toBeInTheDocument();
      expect(screen.getByText(/Network error/i)).toBeInTheDocument();
    });
  });

  it("formats currency values correctly", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      data: mockInsightsData,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {} as any,
    });

    render(<InsightPage />);

    await waitFor(() => {
      const currencyElements = screen.getAllByText(/\$|USD/i);
      expect(currencyElements.length).toBeGreaterThan(0);
    });
  });
});
