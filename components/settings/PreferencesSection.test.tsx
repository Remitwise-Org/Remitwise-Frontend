/**
 * Component test for PreferencesSection — covers theme selection and the
 * useDensity() integration (button group + select stay in sync).
 */

import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/tests/react/renderWithProviders";
import { PreferencesSection } from "./PreferencesSection";
import { DEV_TELEMETRY_STORAGE_KEY } from "@/lib/config/developer";

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

  it("restores the persisted theme preference and highlights the selected theme", () => {
    renderWithProviders(<PreferencesSection />, { theme: "dark" });
    const dark = screen.getByRole("button", {
      name: "settings.preferences.theme_dark",
    });
    expect(dark).toHaveAttribute("aria-pressed", "true");
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

  describe("developer telemetry toggle", () => {
    beforeEach(() => {
      // Start each test with a clean localStorage so the toggle is off.
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(DEV_TELEMETRY_STORAGE_KEY);
      }
    });

    it("renders the developer telemetry toggle as off by default", () => {
      renderWithProviders(<PreferencesSection />);
      const toggle = screen.getByRole("switch", {
        name: "settings.preferences.developer_telemetry_label",
      });
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveAttribute("aria-checked", "false");
    });

    it("turns on the telemetry toggle when clicked and persists to localStorage", () => {
      renderWithProviders(<PreferencesSection />);
      const toggle = screen.getByRole("switch", {
        name: "settings.preferences.developer_telemetry_label",
      });

      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-checked", "true");

      const stored = window.localStorage.getItem(DEV_TELEMETRY_STORAGE_KEY);
      expect(stored).toBe("true");
    });

    it("reflects a pre-existing enabled preference from localStorage", () => {
      window.localStorage.setItem(DEV_TELEMETRY_STORAGE_KEY, "true");
      renderWithProviders(<PreferencesSection />);
      const toggle = screen.getByRole("switch", {
        name: "settings.preferences.developer_telemetry_label",
      });
      // The TelemetryProvider hydrates from localStorage on mount.
      expect(toggle).toHaveAttribute("aria-checked", "true");
    });
  });
});
