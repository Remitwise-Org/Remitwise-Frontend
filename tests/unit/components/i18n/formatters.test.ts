import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatNumber,
  formatNumericValue,
  formatPercent,
  stripTrailingZeroFraction,
  toBcp47Locale,
} from "@/lib/i18n/formatters";

// ---------------------------------------------------------------------------
// toBcp47Locale
// ---------------------------------------------------------------------------

describe("toBcp47Locale", () => {
  it("maps 'en' to 'en-US'", () => {
    expect(toBcp47Locale("en")).toBe("en-US");
  });

  it("maps 'es' to 'es-ES'", () => {
    expect(toBcp47Locale("es")).toBe("es-ES");
  });

  it("passes any non-empty BCP-47 tag through to Intl (no silent fallback)", () => {
    // Non-RemitWise BCG-47 tags (e.g. "fr-FR") are passed through so the
    // caller can rely on `Intl.NumberFormat`'s own resolution rather than
    // being silently coerced to en-US.
    expect(toBcp47Locale("fr-FR")).toBe("fr-FR");
    expect(toBcp47Locale("pt-BR")).toBe("pt-BR");
  });

  it("falls back to 'en-US' for null/undefined", () => {
    expect(toBcp47Locale(null)).toBe("en-US");
    expect(toBcp47Locale(undefined)).toBe("en-US");
  });
});

// ---------------------------------------------------------------------------
// formatNumericValue (decimal)
// ---------------------------------------------------------------------------

describe("formatNumericValue — decimal style", () => {
  it("uses en-US thousand separators", () => {
    // `style='decimal'` defaults to 0 fraction digits, so specify
    // maximumFractionDigits: 2 to preserve the fractional part we're
    // asserting on.
    expect(
      formatNumericValue(1234567.89, { locale: "en", maximumFractionDigits: 2 })
    ).toBe("1,234,567.89");
  });

  it("uses Spanish thousand separators (Narrow No-Break Space or dot)", () => {
    // `style='decimal'` defaults to 0 fraction digits, so specify
    // maximumFractionDigits: 2 to keep the fractional part. Recent Node
    // Intl implementations emit NNBSP (\u202F) for es-ES thousands; older
    // ones emitted `.`. Accept either to stay implementation-agnostic.
    const out = formatNumericValue(1234567.89, {
      locale: "es",
      maximumFractionDigits: 2,
    });
    expect(out).toMatch(/1[\s.\u202F]234[\s.\u202F]567[,.]89/);
  });

  it("respects minimumFractionDigits", () => {
    expect(formatNumericValue(5, { locale: "en", minimumFractionDigits: 2 })).toBe("5.00");
  });

  it("respects maximumFractionDigits", () => {
    expect(formatNumericValue(3.14159, { locale: "en", maximumFractionDigits: 2 })).toBe("3.14");
  });

  it("strips trailing zeros when stripTrailingZeros is true", () => {
    // minimumFractionDigits defaults to 0 for decimal style, so specify
    // maximumFractionDigits: 1 to keep ".5" in the assertion.
    expect(
      formatNumericValue(120.5, {
        locale: "en",
        stripTrailingZeros: true,
        maximumFractionDigits: 1,
      })
    ).toBe("120.5");
    expect(formatNumericValue(500, { locale: "en", stripTrailingZeros: true })).toBe("500");
  });

  it("does not strip zeros when stripTrailingZeros is false", () => {
    expect(formatNumericValue(120.5, { locale: "en", maximumFractionDigits: 2 })).toBe("120.5");
    expect(formatNumericValue(500, { locale: "en" })).toBe("500");
  });
});

// ---------------------------------------------------------------------------
// formatNumericValue (currency)
// ---------------------------------------------------------------------------

describe("formatNumericValue — currency style", () => {
  it("formats USD with the locale's currency symbol", () => {
    expect(formatNumericValue(1234.5, { locale: "en", currency: "USD" })).toBe("$1,234.50");
    expect(formatNumericValue(1234.5, { locale: "en-US", currency: "USD" })).toBe("$1,234.50");
  });

  it("formats EUR using the European conventions", () => {
    const out = formatNumericValue(1234.5, { locale: "es", currency: "EUR" });
    expect(out).toMatch(/1[.,\u202F]?234[.,]50/);
    expect(out).toContain("€");
  });

  it("falls back to '<number> <CODE>' for unknown currency codes", () => {
    expect(formatNumericValue(1234.5, { locale: "en", currency: "USDC" })).toBe("1,234.50 USDC");
  });

  it("falls back to plain decimal when currency is empty string", () => {
    // Empty currency string is falsy, so no auto-promotion fires; the
    // effective style is decimal. Decimal style defaults to 0 fraction
    // digits, so specify maximumFractionDigits: 1.
    expect(
      formatNumericValue(1234.5, {
        locale: "en",
        currency: "",
        maximumFractionDigits: 1,
      })
    ).toBe("1,234.5");
  });

  it("falls back to Spanish formatting when given 'es'", () => {
    const out = formatNumericValue(1234.5, { locale: "es", currency: "USD" });
    expect(out).toMatch(/1[.,\u202F]?234[.,]50/);
    expect(out).toContain("$");
  });

  it("renders zero with the configured fraction digits", () => {
    expect(formatNumericValue(0, { locale: "en", currency: "USD" })).toBe("$0.00");
  });

  it("renders negative USD values consistently", () => {
    expect(formatNumericValue(-45.67, { locale: "en", currency: "USD" })).toBe("-$45.67");
  });
});

// ---------------------------------------------------------------------------
// formatNumericValue (percent)
// ---------------------------------------------------------------------------

describe("formatNumericValue — percent style", () => {
  it("renders a 0.42 fraction as '42%' style", () => {
    const out = formatPercent(0.42, { locale: "en" });
    expect(out).toMatch(/42\s?%/);
  });
});

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

describe("formatCurrency", () => {
  it("is the same as formatNumericValue with style='currency'", () => {
    expect(formatCurrency(1234.5, { locale: "en", currency: "USD" })).toBe(
      "$1,234.50"
    );
  });
});

describe("formatNumber", () => {
  it("matches formatNumericValue with style='decimal' and explicit fraction digits", () => {
    // `formatNumber` defaults style='decimal' (min/max fraction digits = 0),
    // so Intl would round 1234.5 to "1,234"/"1,235". Consumers who want to
    // preserve the fractional part must specify `maximumFractionDigits`
    // explicitly; this test exercises that path.
    expect(formatNumber(1234.5, { locale: "en", maximumFractionDigits: 1 })).toBe(
      "1,234.5"
    );
  });
});

// ---------------------------------------------------------------------------
// stripTrailingZeroFraction
// ---------------------------------------------------------------------------

describe("stripTrailingZeroFraction", () => {
  it("removes trailing zeros after a dot", () => {
    expect(stripTrailingZeroFraction("120.500")).toBe("120.5");
  });

  it("removes dangling decimal separators", () => {
    expect(stripTrailingZeroFraction("120.00")).toBe("120");
  });

  it("removes trailing zeros after a comma (European style)", () => {
    expect(stripTrailingZeroFraction("120,500")).toBe("120,5");
  });

  it("removes trailing zeros after narrow-no-break-space", () => {
    expect(stripTrailingZeroFraction("120\u202F500")).toBe("120\u202F5");
  });

  it("leaves 3-digit all-zero thousand-group integers untouched (regression guard)", () => {
    // Regression: an earlier implementation matched `[.,\u202F]0+$` greedily
    // and pruned the `,000` in `"1,000"`. Anchor on the LAST separator and
    // treat a run of exactly 3 zeros as Intl's natural thousands grouping.
    expect(stripTrailingZeroFraction("1,000")).toBe("1,000");
    expect(stripTrailingZeroFraction("$1,000")).toBe("$1,000");
    expect(stripTrailingZeroFraction("1.000")).toBe("1.000");
    expect(stripTrailingZeroFraction("1,000,000")).toBe("1,000,000");
  });

  it("strips shorter all-zero fraction runs (zero-padded minFractionDigits)", () => {
    expect(stripTrailingZeroFraction("120.00")).toBe("120");
    expect(stripTrailingZeroFraction("1.0")).toBe("1");
  });

  it("leaves strings without a fractional part untouched", () => {
    expect(stripTrailingZeroFraction("1,234")).toBe("1,234");
  });
});
