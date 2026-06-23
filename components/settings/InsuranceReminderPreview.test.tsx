/**
 * Component test for InsuranceReminderPreview — exercises the load/empty/error/
 * unauthorized states by mocking apiClient.get.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/tests/react/renderWithProviders";

const getMock = vi.fn();

vi.mock("@/lib/client/apiClient", () => ({
  apiClient: { get: (...args: unknown[]) => getMock(...args) },
}));

import { InsuranceReminderPreview } from "./InsuranceReminderPreview";

describe("InsuranceReminderPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the title/description shell immediately", () => {
    getMock.mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    renderWithProviders(<InsuranceReminderPreview />);
    expect(
      screen.getByText("settings.insurance_reminders.title"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("settings.insurance_reminders.description"),
    ).toBeInTheDocument();
  });

  it("shows the empty status when no reminders are returned", async () => {
    getMock.mockResolvedValue({ ok: true, status: 200, json: async () => [] });
    renderWithProviders(<InsuranceReminderPreview />);
    await waitFor(() =>
      expect(
        screen.getByText("settings.insurance_reminders.empty"),
      ).toBeInTheDocument(),
    );
  });

  it("renders reminder cards when reminders are returned", async () => {
    getMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [
        {
          policyId: "p1",
          name: "Health Cover",
          nextPaymentDate: "2026-07-01",
          monthlyPremium: 12.5,
        },
      ],
    });
    renderWithProviders(<InsuranceReminderPreview />);
    await waitFor(() =>
      expect(screen.getByText("Health Cover")).toBeInTheDocument(),
    );
  });

  it("shows the unauthorized message on a 401 response", async () => {
    getMock.mockResolvedValue({ ok: false, status: 401, json: async () => [] });
    renderWithProviders(<InsuranceReminderPreview />);
    await waitFor(() =>
      expect(
        screen.getByText("settings.insurance_reminders.unauthorized_error"),
      ).toBeInTheDocument(),
    );
  });

  it("shows an error message when the request throws", async () => {
    getMock.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Server Error",
      text: async () => "boom",
    });
    renderWithProviders(<InsuranceReminderPreview />);
    await waitFor(() =>
      expect(screen.getByText("boom")).toBeInTheDocument(),
    );
  });

  it("bails out silently when apiClient returns nothing (session expiry)", async () => {
    getMock.mockResolvedValue(undefined);
    renderWithProviders(<InsuranceReminderPreview />);
    // Stays on the loading status since the flow is handed off elsewhere.
    await waitFor(() =>
      expect(
        screen.getByText("settings.insurance_reminders.loading"),
      ).toBeInTheDocument(),
    );
  });
});
