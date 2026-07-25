/**
 * Component test for FamilySection.
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "@/tests/react/renderWithProviders";
import { FamilySection } from "./FamilySection";

describe("FamilySection", () => {
  it("renders inside a section with the family id", () => {
    renderWithProviders(<FamilySection />);
    expect(document.getElementById("family")).toBeInTheDocument();
  });

  it("renders every family member with name and role badge", () => {
    renderWithProviders(<FamilySection />);
    expect(screen.getByText("Amara Osei")).toBeInTheDocument();
    expect(screen.getByText("Kwame Osei")).toBeInTheDocument();
    expect(screen.getByText("Esi Osei")).toBeInTheDocument();

    expect(
      screen.getByText("settings.family.roles.owner"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("settings.family.roles.member"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("settings.family.roles.viewer"),
    ).toBeInTheDocument();
  });

  it("renders an edit button per member plus the invite button", () => {
    renderWithProviders(<FamilySection />);
    expect(
      screen.getByRole("button", {
        name: "settings.family.invite_member_label",
      }),
    ).toBeInTheDocument();
    // one edit affordance per member
    expect(
      screen.getAllByLabelText(/settings\.family\.edit_member_label/),
    ).toHaveLength(3);
  });
});
