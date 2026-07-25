/**
 * Component test for NotificationsSection.
 * apiClient is mocked because the embedded InsuranceReminderPreview fetches on mount.
 */

import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/tests/react/renderWithProviders";

vi.mock("@/lib/client/apiClient", () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    }),
  },
}));

import { NotificationsSection } from "./NotificationsSection";

describe("NotificationsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders inside a section with the notifications id", () => {
    renderWithProviders(<NotificationsSection />);
    expect(document.getElementById("notifications")).toBeInTheDocument();
  });

  it("renders the grouped notification headings", () => {
    renderWithProviders(<NotificationsSection />);
    expect(
      screen.getByText("settings.notifications.remittances_section"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("settings.notifications.bills_section"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("settings.notifications.channels_section"),
    ).toBeInTheDocument();
  });

  it("renders a switch for every notification toggle", () => {
    renderWithProviders(<NotificationsSection />);
    // 6 preference toggles + 3 channel toggles = 9 switches
    expect(screen.getAllByRole("switch")).toHaveLength(9);
  });

  it("toggles an individual notification switch", () => {
    renderWithProviders(<NotificationsSection />);
    const smsToggle = screen.getByRole("switch", {
      name: "settings.notifications.sms_channel",
    });
    expect(smsToggle).toHaveAttribute("aria-checked", "false");
    fireEvent.click(smsToggle);
    expect(smsToggle).toHaveAttribute("aria-checked", "true");
  });

  it("embeds the insurance reminder preview", () => {
    renderWithProviders(<NotificationsSection />);
    expect(
      screen.getByText("settings.insurance_reminders.title"),
    ).toBeInTheDocument();
  });
});
