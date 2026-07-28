import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReviewStep from "./ReviewStep";

vi.mock("@/lib/i18n/client", () => ({
  useClientLocale: () => "en",
  useClientTranslator: () => ({
    locale: "en",
    t: (key: string) => key,
  }),
}));

vi.mock("@/lib/utils/format-currency", () => ({
  formatCurrency: () => "$100.00",
}));

vi.mock("@/lib/context/RatesContext", () => ({
  useExchangeRates: () => ({
    loading: false,
    stale: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

describe("ReviewStep", () => {
  it("exposes a busy status region and disables confirm actions while pending", () => {
    const onConfirm = vi.fn();

    render(
      <ReviewStep
        recipient="GB123"
        amount={100}
        currency="USD"
        onConfirm={onConfirm}
        onBack={vi.fn()}
        onEmergencyAction={vi.fn()}
        isPending
      />,
    );

    const busyRegion = screen.getByRole("status");
    expect(busyRegion).toHaveAttribute("aria-busy", "true");

    const confirmButton = screen.getByRole("button", {
      name: /processing your transfer/i,
    });
    expect(confirmButton).toBeDisabled();

    fireEvent.click(confirmButton);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
