/**
 * Component test for ProfileSection.
 * Translations are absent, so t() returns the key path verbatim.
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/tests/react/renderWithProviders";
import { ProfileSection } from "./ProfileSection";

describe("ProfileSection", () => {
  it("renders inside a section with the profile id (scroll-spy target)", () => {
    renderWithProviders(<ProfileSection />);
    expect(document.getElementById("profile")).toBeInTheDocument();
  });

  it("renders the header and avatar controls", () => {
    renderWithProviders(<ProfileSection />);
    expect(
      screen.getByRole("heading", { name: "settings.profile.title" }),
    ).toBeInTheDocument();
    expect(screen.getByText("AO")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "settings.profile.change_avatar_label" }),
    ).toBeInTheDocument();
  });

  it("renders the prefilled profile fields including the disabled stellar key", () => {
    renderWithProviders(<ProfileSection />);
    expect(screen.getByDisplayValue("Amara Osei")).toBeInTheDocument();
    expect(screen.getByDisplayValue("amara@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("+234 801 234 5678")).toBeInTheDocument();
    expect(screen.getByDisplayValue("GBQWY...K3PT")).toBeDisabled();
  });

  it("renders a save button", () => {
    renderWithProviders(<ProfileSection />);
    expect(
      screen.getByRole("button", { name: "settings.save_changes" }),
    ).toBeInTheDocument();
  });
});
