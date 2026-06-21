import React from "react";
import { render } from "@testing-library/react";
import { DensityProvider, type Density } from "@/lib/context/DensityContext";

export function renderWithProviders(
  ui: React.ReactElement,
  {
    density = "comfortable",
  }: {
    density?: Density;
  } = {},
) {
  // DensityProvider reads from localStorage on mount; keep deterministic.
  // jsdom localStorage is available.
  window.localStorage.setItem("display-density", density);

  return render(<DensityProvider>{ui}</DensityProvider>);
}
