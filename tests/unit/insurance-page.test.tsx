import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("@/lib/client/apiClient", () => ({
  apiClient: { get: vi.fn() },
}));

vi.mock("@/components/ui/Skeleton", () => ({
  SkeletonList: () => <div data-testid="skeleton" />,
}));

vi.mock("@/components/insurance/PolicyDetail", () => ({
  default: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid="policy-detail">
        <button onClick={onClose}>close</button>
      </div>
    ) : null,
}));

vi.mock("@/components/forms/NewPolicyForm", () => ({
  default: () => <div data-testid="new-policy-form" />,
}));

vi.mock("@/lib/ui/status-semantics", () => ({
  getPolicyPaymentPresentation: () => ({
    label: "Current",
    emphasis: "On time",
    badgeClassName: "bg-green-500",
    panelClassName: "bg-green-100",
    icon: ({ className }: { className?: string }) => (
      <span data-testid="status-icon" className={className} />
    ),
  }),
}));

vi.mock("lucide-react", () => ({
  Shield: ({ className }: { className?: string }) => (
    <svg data-testid="shield-icon" className={className} />
  ),
  Plus: ({ className }: { className?: string }) => (
    <svg data-testid="plus-icon" className={className} />
  ),
}));

import InsurancePage from "../../app/insurance/page";
import { apiClient } from "@/lib/client/apiClient";

const mockGet = apiClient.get as ReturnType<typeof vi.fn>;

const POLICIES = [
  {
    id: "p1",
    name: "Health Basic",
    coverageType: "Health",
    monthlyPremium: 15.0,
    coverageAmount: 5000.0,
    nextPaymentDate: "2026-07-01T00:00:00Z",
    active: true,
  },
  {
    id: "p2",
    name: "Life Cover",
    coverageType: "Life",
    monthlyPremium: 8.5,
    coverageAmount: 10000.0,
    nextPaymentDate: "2026-07-15T00:00:00Z",
    active: true,
  },
];

function makeResponse(ok: boolean, data: unknown) {
  return { ok, json: vi.fn().mockResolvedValue(data) };
}

describe("InsurancePage", () => {
  beforeEach(() => {
    mockGet.mockReset();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, reload: vi.fn() },
    });
  });

  it("shows skeleton while fetch is in-flight", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<InsurancePage />);
    expect(screen.getByTestId("skeleton")).toBeDefined();
  });

  it("renders policy names after successful fetch", async () => {
    mockGet.mockResolvedValue(makeResponse(true, { policies: POLICIES }));
    render(<InsurancePage />);
    await waitFor(() => {
      expect(screen.getByText("Health Basic")).toBeDefined();
      expect(screen.getByText("Life Cover")).toBeDefined();
    });
    expect(screen.queryByTestId("skeleton")).toBeNull();
  });

  it("shows Total Monthly Premium label when policies exist", async () => {
    mockGet.mockResolvedValue(makeResponse(true, { policies: POLICIES }));
    render(<InsurancePage />);
    await waitFor(() => {
      expect(screen.getByText(/Total Monthly Premium/i)).toBeDefined();
    });
  });

  it("hides Total Monthly Premium while loading", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    render(<InsurancePage />);
    expect(screen.queryByText(/Total Monthly Premium/i)).toBeNull();
  });

  it("shows error message when response is not ok", async () => {
    mockGet.mockResolvedValue(makeResponse(false, {}));
    render(<InsurancePage />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load policies/i)).toBeDefined();
    });
  });

  it("shows error message when fetch throws", async () => {
    mockGet.mockRejectedValue(new Error("network error"));
    render(<InsurancePage />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load policies/i)).toBeDefined();
    });
  });

  it("shows retry button in error state", async () => {
    mockGet.mockResolvedValue(makeResponse(false, {}));
    render(<InsurancePage />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /retry/i })).toBeDefined();
    });
  });

  it("shows empty state title when policies array is empty", async () => {
    mockGet.mockResolvedValue(makeResponse(true, { policies: [] }));
    render(<InsurancePage />);
    await waitFor(() => {
      expect(screen.getByText(/No active policies yet/i)).toBeDefined();
    });
  });

  it("shows empty state when response is null", async () => {
    mockGet.mockResolvedValue(null);
    render(<InsurancePage />);
    await waitFor(() => {
      expect(screen.queryByTestId("skeleton")).toBeNull();
      expect(screen.getByText(/No active policies yet/i)).toBeDefined();
    });
  });

  it("toggles new policy form on header button click", async () => {
    mockGet.mockResolvedValue(makeResponse(true, { policies: POLICIES }));
    render(<InsurancePage />);
    await waitFor(() => screen.getByText("Health Basic"));

    const btn = screen.getByRole("button", { name: /New Policy/i });
    fireEvent.click(btn);
    expect(screen.getByTestId("new-policy-form")).toBeDefined();

    fireEvent.click(btn);
    await waitFor(() =>
      expect(screen.queryByTestId("new-policy-form")).toBeNull()
    );
  });

  it("opens policy detail panel on View Details click", async () => {
    mockGet.mockResolvedValue(
      makeResponse(true, { policies: [POLICIES[0]] })
    );
    render(<InsurancePage />);
    await waitFor(() => screen.getByText("Health Basic"));

    fireEvent.click(screen.getByText(/View Details/i));
    expect(screen.getByTestId("policy-detail")).toBeDefined();
  });

  it("closes policy detail panel on close action", async () => {
    mockGet.mockResolvedValue(
      makeResponse(true, { policies: [POLICIES[0]] })
    );
    render(<InsurancePage />);
    await waitFor(() => screen.getByText("Health Basic"));

    fireEvent.click(screen.getByText(/View Details/i));
    fireEvent.click(screen.getByText("close"));

    await waitFor(() =>
      expect(screen.queryByTestId("policy-detail")).toBeNull()
    );
  });
});
