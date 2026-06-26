import React from "react";
import { render } from "@testing-library/react";
import { DensityProvider, type Density } from "@/lib/context/DensityContext";
import { ThemeProvider } from "@/lib/context/ThemeContext";
import { ToastProvider } from "@/lib/context/ToastContext";

export function renderWithProviders(
  ui: React.ReactElement,
  {
    density = "comfortable",
    theme = "system",
  }: {
    density?: Density;
    theme?: "system" | "light" | "dark";
  } = {},
) {
  // DensityProvider reads from localStorage on mount; keep deterministic.
  // jsdom localStorage is available.
  window.localStorage.setItem("display-density", density);
  window.localStorage.setItem("theme-preference", theme);

  return render(
    <ThemeProvider>
      <DensityProvider>
        <ToastProvider>{ui}</ToastProvider>
      </DensityProvider>
    </ThemeProvider>,
  );
}
