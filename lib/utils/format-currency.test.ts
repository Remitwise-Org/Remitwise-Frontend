import { formatAmount, formatCurrency } from "./format-currency";

describe("formatCurrency", () => {
  it("formats USD with en-US locale", () => {
    expect(formatCurrency(1234.5, "USD", "en-US")).toBe("$1,234.50");
  });

  it("formats negative values consistently", () => {
    expect(formatCurrency(-9876.543, "USD", "en-US")).toBe("-$9,876.54");
  });

  it("formats zero values correctly", () => {
    expect(formatCurrency(0, "USD", "en-US")).toBe("$0.00");
  });

  it("falls back for unknown stablecoin codes", () => {
    expect(formatCurrency(1234.5, "USDC", "en-US")).toBe("1,234.50 USDC");
  });

  it("formats es locale using locale-specific separators", () => {
    const result = formatCurrency(1234.5, "USD", "es-ES");
    expect(result).toMatch(/1[.,\u202F]?234[.,]50/);
  });
});

describe("formatAmount alias", () => {
  it("behaves the same as formatCurrency", () => {
    expect(formatAmount(1234.5, "USD", "en-US")).toBe(formatCurrency(1234.5, "USD", "en-US"));
  });
});
