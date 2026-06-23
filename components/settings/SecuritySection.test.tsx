/**
 * Component test for SecuritySection.
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/tests/react/renderWithProviders";
import { SecuritySection } from "./SecuritySection";

describe("SecuritySection", () => {
  it("renders inside a section with the security id", () => {
    renderWithProviders(<SecuritySection />);
    expect(document.getElementById("security")).toBeInTheDocument();
  });

  it("renders the security toggles and session timeout select", () => {
    renderWithProviders(<SecuritySection />);
    expect(screen.getAllByRole("switch")).toHaveLength(3);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("does not show the alert initially", () => {
    renderWithProviders(<SecuritySection />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the alert after clicking sign out of all sessions", () => {
    renderWithProviders(<SecuritySection />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "settings.security.sign_out_all_label",
      }),
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(
      screen.getByText("settings.security.two_factor_alert"),
    ).toBeInTheDocument();
  });

  it("dismisses the alert via the dismiss button", () => {
    renderWithProviders(<SecuritySection />);
    fireEvent.click(
      screen.getByRole("button", {
        name: "settings.security.sign_out_all_label",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "settings.security.dismiss_alert",
      }),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
