/**
 * Component test for PreferencesSection — covers theme selection and the
 * useDensity() integration (button group + select stay in sync).
 */

import React from "react";
import { describe, it, expect } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/tests/react/renderWithProviders";
import { PreferencesSection } from "./PreferencesSection";

describe("PreferencesSection", () => {
  it("renders inside a section with the preferences id", () => {
    renderWithProviders(<PreferencesSection />);
    expect(document.getElementById("preferences")).toBeInTheDocument();
  });

  it("defaults the theme to system and switches on click", () => {
    renderWithProviders(<PreferencesSection />);
    const system = screen.getByRole("button", {
      name: "settings.preferences.theme_system",
    });
    const light = screen.getByRole("button", {
      name: "settings.preferences.theme_light",
    });
    expect(system).toHaveAttribute("aria-pressed", "true");
    expect(light).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(light);
    expect(light).toHaveAttribute("aria-pressed", "true");
    expect(system).toHaveAttribute("aria-pressed", "false");
  });

  it("reflects the density from context (comfortable by default)", () => {
    renderWithProviders(<PreferencesSection />, { density: "comfortable" });
    const comfortable = screen.getByRole("button", {
      name: "settings.preferences.density_comfortable",
    });
    expect(comfortable).toHaveAttribute("aria-pressed", "true");
  });

  it("updates density when the compact button is clicked", () => {
    renderWithProviders(<PreferencesSection />, { density: "comfortable" });
    const compact = screen.getByRole("button", {
      name: "settings.preferences.density_compact",
    });
    expect(compact).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(compact);
    expect(compact).toHaveAttribute("aria-pressed", "true");
    // The mirrored density <select> stays in sync with context.
    const densitySelect = screen
      .getAllByRole("combobox")
      .find((el) => (el as HTMLSelectElement).value === "compact");
    expect(densitySelect).toBeDefined();
  });

  it("renders language and timezone selects", () => {
    renderWithProviders(<PreferencesSection />);
    expect(
      screen.getByRole("option", {
        name: "settings.preferences.language_french",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", {
        name: "settings.preferences.timezone_lagos",
      }),
    ).toBeInTheDocument();
  });

  it("renders the date-format radios with DD/MM/YYYY default", () => {
    renderWithProviders(<PreferencesSection />);
    expect(screen.getByRole("radio", { name: "DD/MM/YYYY" })).toBeChecked();
  });
});
