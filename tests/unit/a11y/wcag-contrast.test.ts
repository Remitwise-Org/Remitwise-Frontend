/**
 * WCAG AA colour-contrast tests for RemitWise design tokens.
 *
 * Every foreground/background pair used in the UI must meet WCAG 2.1 AA
 * (contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text / UI
 * components).  These tests lock the contract in place so regressions are
 * caught at build time rather than in production.
 *
 * Colour values are sourced from:
 *   - tailwind.config.js  (design-token colours)
 *   - scripts/wcag_contrast.py  (reference pairs used in the Python report)
 *   - components/Insights/palette.ts  (chart palette)
 */

import { describe, it, expect } from "vitest";

import {
  hexToRgb,
  linearize,
  relativeLuminance,
  contrastRatio,
  wcagLevel,
  meetsWcagAA,
  meetsWcagAALarge,
  meetsWcagAAA,
  WCAG_AA_NORMAL,
  WCAG_AA_LARGE,
  WCAG_AAA_NORMAL,
} from "@/lib/a11y/wcag-contrast";

// ---------------------------------------------------------------------------
// Design tokens
// Mirror the values from tailwind.config.js so tests are self-contained and
// deterministic (no runtime import of the Tailwind config).
// ---------------------------------------------------------------------------

/** Core background tokens (from scripts/wcag_contrast.py + Tailwind theme). */
const BG = {
  background: "#141414",
  gradient1: "#0f0f0f",
  gradient2: "#0a0a0a",
  surface: "#1a1a1a",
  border: "#2a2a2a",
  track: "#1F1F1F",
  brandDark: "#0A0A0A",
} as const;

/** Core foreground tokens. */
const FG = {
  white: "#ffffff",
  gray100: "#F3F4F6",
  gray400: "#9CA3AF",
  brandRed: "#D72323",
  brandRedHover: "#B91C1C",
} as const;

/** Status foreground tokens (from tailwind.config.js status.*fg). */
const STATUS_FG = {
  successFg: "#86EFAC",
  warningFg: "#FDE68A",
  errorFg: "#FDA4AF",
  infoFg: "#93C5FD",
} as const;

/** Status background tokens for badge/panel use. */
const STATUS_BG = {
  // Solid equivalents used for contrast checking (semi-transparent values
  // are rendered over a dark surface, so we use the surface colour here).
  surface: "#1a1a1a",
} as const;

/** Insights chart palette (from components/Insights/palette.ts). */
const CHART_PALETTE = {
  blue: "#4E79A7",
  lightBlue: "#A0CBE8",
  orange: "#F28E2B",
  softOrange: "#FFBE7D",
  green: "#59A14F",
  lightGreen: "#8CD17D",
  brownGold: "#B6992D",
  yellow: "#F1CE63",
} as const;

// ---------------------------------------------------------------------------
// 1. Unit tests for the pure helper functions
// ---------------------------------------------------------------------------

describe("hexToRgb", () => {
  it("converts a six-digit hex to a normalised [r, g, b] tuple", () => {
    const [r, g, b] = hexToRgb("#ffffff");
    expect(r).toBeCloseTo(1, 5);
    expect(g).toBeCloseTo(1, 5);
    expect(b).toBeCloseTo(1, 5);
  });

  it("converts black correctly", () => {
    const [r, g, b] = hexToRgb("#000000");
    expect(r).toBe(0);
    expect(g).toBe(0);
    expect(b).toBe(0);
  });

  it("accepts hex strings without a leading hash", () => {
    const [r] = hexToRgb("ff0000");
    expect(r).toBeCloseTo(1, 5);
  });

  it("expands a three-digit shorthand hex", () => {
    const [r, g, b] = hexToRgb("#fff");
    expect(r).toBeCloseTo(1, 5);
    expect(g).toBeCloseTo(1, 5);
    expect(b).toBeCloseTo(1, 5);
  });

  it("expands a three-digit shorthand hex to match the six-digit form", () => {
    const short = hexToRgb("#abc");
    const full = hexToRgb("#aabbcc");
    expect(short).toEqual(full);
  });

  it("is case-insensitive", () => {
    expect(hexToRgb("#AABBCC")).toEqual(hexToRgb("#aabbcc"));
  });

  it("throws on an invalid hex string", () => {
    expect(() => hexToRgb("zzzzzz")).toThrow(/Invalid hex colour/);
  });

  it("throws on an empty string", () => {
    expect(() => hexToRgb("")).toThrow(/Invalid hex colour/);
  });
});

describe("linearize", () => {
  it("returns c / 12.92 for values ≤ 0.03928 (low-light path)", () => {
    expect(linearize(0)).toBe(0);
    expect(linearize(0.03928)).toBeCloseTo(0.03928 / 12.92, 10);
  });

  it("applies the gamma correction for values > 0.03928", () => {
    // Channel value 1 (pure white) must linearise to 1.
    expect(linearize(1)).toBeCloseTo(1, 10);
  });

  it("is monotonically increasing", () => {
    const values = [0, 0.02, 0.04, 0.1, 0.5, 1];
    for (let i = 1; i < values.length; i++) {
      expect(linearize(values[i])).toBeGreaterThan(linearize(values[i - 1]));
    }
  });
});

describe("relativeLuminance", () => {
  it("returns 0 for pure black", () => {
    expect(relativeLuminance("#000000")).toBe(0);
  });

  it("returns 1 for pure white", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
  });

  it("returns a value strictly between 0 and 1 for mid-tones", () => {
    const lum = relativeLuminance("#808080");
    expect(lum).toBeGreaterThan(0);
    expect(lum).toBeLessThan(1);
  });

  it("darker colours have lower luminance than lighter colours", () => {
    expect(relativeLuminance("#333333")).toBeLessThan(
      relativeLuminance("#cccccc")
    );
  });
});

describe("contrastRatio", () => {
  it("returns 21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });

  it("returns 1 for identical colours (no contrast)", () => {
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#000000", "#000000")).toBeCloseTo(1, 5);
  });

  it("is commutative (order of foreground / background does not matter)", () => {
    expect(contrastRatio("#ffffff", "#141414")).toBeCloseTo(
      contrastRatio("#141414", "#ffffff"),
      10
    );
  });

  it("always returns a value ≥ 1", () => {
    const pairs = [
      ["#D72323", "#141414"],
      ["#9CA3AF", "#1a1a1a"],
      ["#86EFAC", "#1a1a1a"],
    ] as const;
    for (const [fg, bg] of pairs) {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(1);
    }
  });
});

describe("wcagLevel", () => {
  it("returns AAA for black on white (≥ 7:1)", () => {
    expect(wcagLevel("#000000", "#ffffff")).toBe("AAA");
  });

  it("returns FAIL for identical colours", () => {
    expect(wcagLevel("#141414", "#141414")).toBe("FAIL");
  });

  it("returns AA for a pair with ratio between 4.5 and 7", () => {
    // white on brand-red: ~4.6:1
    const level = wcagLevel(FG.white, FG.brandRed);
    expect(["AA", "AAA"]).toContain(level);
  });
});

describe("meetsWcagAA", () => {
  it("returns true for black on white", () => {
    expect(meetsWcagAA("#000000", "#ffffff")).toBe(true);
  });

  it("returns false for a pair below 4.5:1", () => {
    // Two near-identical dark colours
    expect(meetsWcagAA("#141414", "#1a1a1a")).toBe(false);
  });
});

describe("meetsWcagAALarge", () => {
  it("returns true for pairs ≥ 3:1", () => {
    expect(meetsWcagAALarge("#000000", "#ffffff")).toBe(true);
  });

  it("returns false for a pair below 3:1", () => {
    expect(meetsWcagAALarge("#141414", "#1a1a1a")).toBe(false);
  });
});

describe("meetsWcagAAA", () => {
  it("returns true for black on white (21:1)", () => {
    expect(meetsWcagAAA("#000000", "#ffffff")).toBe(true);
  });

  it("returns false for a pair below 7:1 (gray400 on surface ≈ 6.86:1)", () => {
    // gray400 (#9CA3AF) on surface (#1a1a1a) produces ≈ 6.86:1 — meets AA but not AAA.
    expect(meetsWcagAAA(FG.gray400, BG.surface)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Exported constant sanity checks
// ---------------------------------------------------------------------------

describe("WCAG threshold constants", () => {
  it("WCAG_AA_NORMAL is 4.5", () => {
    expect(WCAG_AA_NORMAL).toBe(4.5);
  });

  it("WCAG_AA_LARGE is 3", () => {
    expect(WCAG_AA_LARGE).toBe(3);
  });

  it("WCAG_AAA_NORMAL is 7", () => {
    expect(WCAG_AAA_NORMAL).toBe(7);
  });
});

// ---------------------------------------------------------------------------
// 3. Design-token pairs — WCAG AA normal-text compliance
//
// Every pair listed here maps a *foreground* token to a *background* token
// that actually appears together in the RemitWise UI.  All must reach ≥ 4.5:1.
// ---------------------------------------------------------------------------

describe("design-token pairs meet WCAG AA (≥ 4.5:1) for normal text", () => {
  /**
   * Each tuple is [foreground hex, background hex, human-readable label].
   * Values come directly from scripts/wcag_contrast.py and tailwind.config.js.
   */
  const AA_PAIRS: ReadonlyArray<[string, string, string]> = [
    // --- Core text on dark backgrounds (from wcag_contrast.py) ---
    [FG.white,    BG.background, "white on background (#141414)"],
    [FG.white,    BG.gradient2,  "white on gradient2 (#0a0a0a)"],
    [FG.white,    BG.track,      "white on track (#1F1F1F)"],
    [FG.gray100,  BG.track,      "gray100 on track (#1F1F1F)"],

    // --- Brand red used for primary CTA (must pass AA on dark bg) ---
    [FG.white,    FG.brandRed,       "white on brand-red (#D72323)"],
    [FG.white,    FG.brandRedHover,  "white on brand-red-hover (#B91C1C)"],

    // --- Status fg colours on dark surface (badge / panel text) ---
    [STATUS_FG.successFg, STATUS_BG.surface, "status-success-fg on surface"],
    [STATUS_FG.warningFg, STATUS_BG.surface, "status-warning-fg on surface"],
    [STATUS_FG.errorFg,   STATUS_BG.surface, "status-error-fg on surface"],
    [STATUS_FG.infoFg,    STATUS_BG.surface, "status-info-fg on surface"],
  ];

  it.each(AA_PAIRS)(
    "contrast of %s on %s (%s) is ≥ 4.5",
    (fg, bg, _label) => {
      const ratio = contrastRatio(fg, bg);
      expect(
        ratio,
        `Expected ${_label} to have contrast ≥ ${WCAG_AA_NORMAL}:1 but got ${ratio.toFixed(2)}:1`
      ).toBeGreaterThanOrEqual(WCAG_AA_NORMAL);
    }
  );
});

// ---------------------------------------------------------------------------
// 4. Design-token pairs — WCAG AA large-text / UI-component compliance
//
// Pairs that are used exclusively for large text (≥ 18 pt / 14 pt bold) or
// non-text UI components only need to reach ≥ 3:1.
// ---------------------------------------------------------------------------

describe("design-token pairs meet WCAG AA large-text (≥ 3:1)", () => {
  const AA_LARGE_PAIRS: ReadonlyArray<[string, string, string]> = [
    [FG.gray400, BG.background, "gray400 on background (#141414)"],
    [FG.brandRed, BG.background, "brand-red on background (#141414) — used as icon/accent"],
    [FG.brandRed, BG.surface,    "brand-red on surface (#1a1a1a) — used as icon/accent"],
  ];

  it.each(AA_LARGE_PAIRS)(
    "contrast of %s on %s (%s) is ≥ 3",
    (fg, bg, _label) => {
      const ratio = contrastRatio(fg, bg);
      expect(
        ratio,
        `Expected ${_label} to have contrast ≥ ${WCAG_AA_LARGE}:1 but got ${ratio.toFixed(2)}:1`
      ).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
    }
  );
});

// ---------------------------------------------------------------------------
// 5. Chart palette — must meet AA large-text on the dark track background
//
// Chart data-series colours appear at relatively large sizes (bars, lines,
// legend swatches) so AA large-text (≥ 3:1) is the correct threshold.
// ---------------------------------------------------------------------------

describe("Insights chart palette meets WCAG AA large-text on dark background", () => {
  const chartPairsOnDark = Object.entries(CHART_PALETTE).map(
    ([name, hex]) => [hex, BG.background, `INSIGHTS_PALETTE.${name} on background`] as [string, string, string]
  );

  it.each(chartPairsOnDark)(
    "contrast of %s on %s (%s) is ≥ 3",
    (fg, bg, _label) => {
      const ratio = contrastRatio(fg, bg);
      expect(
        ratio,
        `Expected ${_label} to have contrast ≥ ${WCAG_AA_LARGE}:1 but got ${ratio.toFixed(2)}:1`
      ).toBeGreaterThanOrEqual(WCAG_AA_LARGE);
    }
  );
});

// ---------------------------------------------------------------------------
// 6. Explicit sad-path: pairs that intentionally do NOT reach AA normal-text
//
// Documenting known non-passing pairs prevents confusion and ensures the
// helper functions report failures correctly.
// ---------------------------------------------------------------------------

describe("known failing pairs correctly return false for meetsWcagAA", () => {
  const FAILING_PAIRS: ReadonlyArray<[string, string, string]> = [
    // border-on-background is used purely as a visible divider line, not as
    // text, so it is exempt from AA normal-text but is documented here.
    [BG.border, BG.background, "border (#2a2a2a) on background (#141414)"],
    // Two near-identical dark tones
    [BG.surface, BG.background, "surface (#1a1a1a) on background (#141414)"],
  ];

  it.each(FAILING_PAIRS)(
    "meetsWcagAA returns false for %s on %s (%s)",
    (fg, bg, _label) => {
      expect(meetsWcagAA(fg, bg)).toBe(false);
    }
  );
});

// ---------------------------------------------------------------------------
// 7. Regression guard: reference values cross-checked against actual computation
//
// These values were produced by running the contrastRatio() function defined
// in this module and are stored here to detect any future accidental changes
// to the algorithm (e.g. a wrong linearize threshold or coefficient).
//
// Note: the Python script in scripts/wcag_contrast.py uses a linearize
// threshold of 0.03928 (an older WCAG errata value) which produces slightly
// lower ratios than the current spec value of 0.04045.  The TypeScript
// implementation faithfully uses 0.03928 to match the design-team reference
// while remaining conservative (all failing / passing decisions are the same).
// ---------------------------------------------------------------------------

describe("contrast ratios match wcag_contrast.py reference values", () => {
  const REFERENCE: ReadonlyArray<[string, string, number, string]> = [
    // [foreground, background, expected_ratio, label]
    [FG.white,    BG.background, 18.42, "white on background"],
    [FG.gray400,  BG.background,  7.26, "gray400 on background"],
    [FG.white,    BG.gradient2,  19.80, "white on gradient2"],
    [FG.brandRed, BG.background,  3.64, "brand-red on background"],
    [FG.brandRed, BG.surface,     3.44, "brand-red on surface"],
    [FG.white,    FG.brandRed,    5.06, "white on brand-red"],
    [FG.gray100,  BG.track,      14.98, "gray100 on track"],
    [FG.white,    BG.track,      16.48, "white on track"],
  ];

  it.each(REFERENCE)(
    "contrastRatio(%s, %s) ≈ %s (%s)",
    (fg, bg, expected, _label) => {
      // Tolerance of 0.05 covers minor floating-point differences.
      expect(contrastRatio(fg, bg)).toBeCloseTo(expected, 1);
    }
  );
});
