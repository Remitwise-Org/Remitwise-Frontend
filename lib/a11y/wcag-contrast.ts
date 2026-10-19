/**
 * WCAG AA / AAA colour-contrast helpers.
 *
 * Implements the WCAG 2.1 relative-luminance and contrast-ratio algorithms
 * described at https://www.w3.org/TR/WCAG21/#dfn-contrast-ratio.
 *
 * All functions accept hex colour strings (`#rrggbb` or `#rgb`) and return
 * plain numbers so they are trivially testable without any DOM dependency.
 */

/** Minimum contrast ratio required for WCAG AA normal text (< 18 pt / 14 pt bold). */
export const WCAG_AA_NORMAL = 4.5 as const;

/** Minimum contrast ratio required for WCAG AA large text (≥ 18 pt / 14 pt bold). */
export const WCAG_AA_LARGE = 3.0 as const;

/** Minimum contrast ratio required for WCAG AAA normal text. */
export const WCAG_AAA_NORMAL = 7.0 as const;

/** Minimum contrast ratio required for WCAG AAA large text. */
export const WCAG_AAA_LARGE = 4.5 as const;

export type WcagLevel = "AA" | "AAA" | "AA_LARGE" | "AAA_LARGE" | "FAIL";

/**
 * Expands a 3-digit hex colour to 6 digits.
 * e.g. `#abc` → `#aabbcc`
 */
function expandShortHex(hex: string): string {
  const cleaned = hex.replace(/^#/, "");
  if (cleaned.length === 3) {
    return (
      "#" +
      cleaned
        .split("")
        .map((c) => c + c)
        .join("")
    );
  }
  return "#" + cleaned;
}

/**
 * Converts a 6-digit hex colour string to an `[r, g, b]` tuple in the range
 * `[0, 1]`.
 *
 * @throws {Error} when the input is not a valid hex colour.
 */
export function hexToRgb(hex: string): [number, number, number] {
  const expanded = expandShortHex(hex);
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(expanded);
  if (!match) {
    throw new Error(`Invalid hex colour: "${hex}"`);
  }
  return [
    parseInt(match[1], 16) / 255,
    parseInt(match[2], 16) / 255,
    parseInt(match[3], 16) / 255,
  ];
}

/**
 * Linearises a single 8-bit colour channel value (already normalised to [0,1])
 * according to the sRGB transfer function defined in WCAG 2.1.
 */
export function linearize(c: number): number {
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Computes the WCAG 2.1 relative luminance of a hex colour.
 *
 * The returned value is in `[0, 1]` where 0 is absolute black and 1 is
 * absolute white.
 *
 * @param hex - Six-digit (or three-digit) hex colour string, with or without
 *   the leading `#`.
 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return (
    0.2126 * linearize(r) +
    0.7152 * linearize(g) +
    0.0722 * linearize(b)
  );
}

/**
 * Computes the WCAG 2.1 contrast ratio between two hex colours.
 *
 * The ratio is always ≥ 1 (white-on-white = 1:1, black-on-white ≈ 21:1).
 *
 * @param foreground - Hex colour of the foreground (text / icon).
 * @param background - Hex colour of the background.
 * @returns Contrast ratio as a plain number.
 */
export function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Classifies the contrast ratio between two colours against every WCAG
 * conformance level.
 *
 * Returns the *highest* level met:
 * - `"AAA"`      – ≥ 7:1   (normal text / UI components)
 * - `"AA"`       – ≥ 4.5:1 (normal text / UI components)
 * - `"AA_LARGE"` – ≥ 3:1   (large text only)
 * - `"FAIL"`     – < 3:1
 */
export function wcagLevel(
  foreground: string,
  background: string
): WcagLevel {
  const ratio = contrastRatio(foreground, background);
  if (ratio >= WCAG_AAA_NORMAL) return "AAA";
  if (ratio >= WCAG_AA_NORMAL) return "AA";
  if (ratio >= WCAG_AA_LARGE) return "AA_LARGE";
  return "FAIL";
}

/**
 * Returns `true` when the foreground / background pair meets WCAG AA for
 * *normal* body text (contrast ratio ≥ 4.5:1).
 */
export function meetsWcagAA(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= WCAG_AA_NORMAL;
}

/**
 * Returns `true` when the foreground / background pair meets WCAG AA for
 * *large* text (contrast ratio ≥ 3:1).
 */
export function meetsWcagAALarge(
  foreground: string,
  background: string
): boolean {
  return contrastRatio(foreground, background) >= WCAG_AA_LARGE;
}

/**
 * Returns `true` when the foreground / background pair meets WCAG AAA for
 * normal text (contrast ratio ≥ 7:1).
 */
export function meetsWcagAAA(foreground: string, background: string): boolean {
  return contrastRatio(foreground, background) >= WCAG_AAA_NORMAL;
}
