/**
 * Single source of truth for locale-aware numeric formatting in RemitWise.
 *
 * Every locale-sensitive numeric display in the frontend (currency strings,
 * decimal numbers, percentages, and short/long notations) routes through this
 * module so that rounding rules, separators, and locale handling live in one
 * place. This is the "single place to fix rounding bugs" referenced by
 * issue #732.
 *
 * Usage:
 *   - Pure functions (`formatCurrency`, `formatNumber`) for server-side code
 *     and unit tests that don't need React.
 *   - The `useFormatter` hook (`components/i18n/useFormatter.ts`) wraps these
 *     and reads the active user locale from `useClientLocale()`.
 *   - The `<FormattedCurrency>` / `<FormattedNumber>` components
 *     (`components/i18n/*`) wrap the hook for declarative JSX usage.
 *
 * The module deliberately keeps zero React and zero DOM dependencies so it
 * stays importable from server contexts, util scripts, and tests alike.
 */

import type { SupportedLocale } from "./cookie";

/**
 * Mapping from a two-letter RemitWise supported locale (`en`, `es`) to the
 * BCP-47 locale tag that `Intl.NumberFormat` expects. We always expand to a
 * regional subtag so number formatting uses the canonical symbols
 * (e.g. `"$"` for `en-US`, narrow-no-break-space thousands for `es-ES`).
 *
 * If we ever add more languages we only need to extend this map; the rest of
 * the module will transparently handle the new locale.
 */
const SUPPORTED_LOCALE_TAGS: Record<SupportedLocale, string> = {
  en: "en-US",
  es: "es-ES",
};

/**
 * Convert a RemitWise supported locale to the canonical BCP-47 locale tag.
 *
 * Accepts both the two-letter RemitWise codes (`"en"`, `"es"`) and already-
 * formed BCP-47 tags (`"en-US"`, `"es-ES"`):
 *   - Two-letter codes are mapped via {@link SUPPORTED_LOCALE_TAGS}.
 *   - BCP-47 tags that already match the canonical form (or any unknown
 *     non-empty string) are passed straight through; Intl.NumberFormat will
 *     still resolve them and fall back gracefully if it doesn't.
 *
 * Falls back to `"en-US"` only when the input is nullish, so callers do not
 * crash when a stale user preference arrives before the locale system has
 * propagated.
 */
export function toBcp47Locale(locale: string | null | undefined): string {
  if (!locale) return "en-US";
  if (locale in SUPPORTED_LOCALE_TAGS) {
    return SUPPORTED_LOCALE_TAGS[locale as SupportedLocale];
  }
  // Already a BCP-47 tag (or any non-empty tag Intl can decide on):
  // trust Intl to honor it. This is required so callers can pass an
  // explicit `locale="es-ES"` override and get Spanish formatting even if
  // the cookie-led default is `"en"`.
  return locale;
}

/** Format used for {@link formatNumericValue}'s `style` option. */
export type NumericStyle = "decimal" | "currency" | "percent" | "unit";

/** Options accepted by {@link formatNumericValue}. */
export interface NumericFormatOptions {
  /**
   * Locale to format with. Accepts either a RemitWise supported locale code
   * (`"en"`, `"es"`) or a full BCP-47 tag (`"en-US"`, `"es-ES"`). Unknown
   * values fall back to `"en-US"`.
   */
  locale?: string | null;
  /** Style of formatting. Defaults to `"decimal"`. */
  style?: NumericStyle;
  /**
   * Currency code (ISO 4217 or a RemitWise asset code such as `"USDC"`).
   *
   * If `style` is provided explicitly, that wins. Otherwise, when `currency`
   * is set (even to an unknown code like `"USDC"`) the formatter
   * auto-promotes the style to `"currency"` so callers don't have to repeat
   * it. This mirrors the contract of the legacy `lib/utils/format-currency.ts`
   * helper.
   *
   * When the code isn't recognized by `Intl.NumberFormat` we fall back to a
   * `<localized-number> <CODE>` representation so callers see a sensible
   * string rather than an exception.
   */
  currency?: string;
  /**
   * Minimum number of fraction digits. Defaults to 0 for `decimal` /
   * `percent` and 2 for `currency`.
   */
  minimumFractionDigits?: number;
  /** Maximum number of fraction digits. Defaults to `minimumFractionDigits`. */
  maximumFractionDigits?: number;
  /**
   * When true, trim trailing zeros from the fractional portion (e.g. `"5.00"`
   * becomes `"5"`, `"5.10"` becomes `"5.1"`). Only applies to `decimal`
   * styling; other styles preserve `Intl`'s stable output for correctness.
   */
  stripTrailingZeros?: boolean;
}

/**
 * Core formatting primitive. All higher-level helpers, hooks, and React
 * components in the RemitWise frontend funnel through this function so a
 * future rounding bug only has to be patched here.
 *
 * @param value  The numeric value to format. `NaN` renders as the localized
 *               `"NaN"` string.
 * @param options Formatting options; see {@link NumericFormatOptions}.
 */
export function formatNumericValue(
  value: number,
  options: NumericFormatOptions = {}
): string {
  const {
    locale,
    style: explicitStyle,
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
    stripTrailingZeros = false,
  } = options;

  // Auto-promote to currency style when the caller supplies a currency
  // code without an explicit style. This mirrors the contract of the
  // pre-existing `lib/utils/format-currency.ts` helper and avoids forcing
  // every caller to repeat `style: "currency"`.
  const style: NumericStyle =
    explicitStyle ?? (currency ? "currency" : "decimal");

  const bcp47 = toBcp47Locale(locale);

  const min = minimumFractionDigits ?? defaultMinDigits(style);
  const max = maximumFractionDigits ?? min;

  // Special-case decimal styling so we can safely strip trailing zeros
  // after rounding. Other styles rely on the Intl output verbatim to avoid
  // breaking locale-correct currency/percent rendering.
  if (style === "decimal" && stripTrailingZeros) {
    const formatted = new Intl.NumberFormat(bcp47, {
      style: "decimal",
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    }).format(value);

    return stripTrailingZeroFraction(formatted);
  }

  if (style === "currency") {
    const code = currency?.trim();
    if (!code) {
      return new Intl.NumberFormat(bcp47, {
        style: "decimal",
        minimumFractionDigits: min,
        maximumFractionDigits: max,
      }).format(value);
    }
    try {
      return new Intl.NumberFormat(bcp47, {
        style: "currency",
        currency: code,
        minimumFractionDigits: min,
        maximumFractionDigits: max,
      }).format(value);
    } catch {
      // Unknown currency code (typically a RemitWise asset such as `USDC`):
      // render `<localized-number> <CODE>` so the value is still legible.
      const number = new Intl.NumberFormat(bcp47, {
        style: "decimal",
        minimumFractionDigits: min,
        maximumFractionDigits: max,
      }).format(value);
      return `${number} ${code}`;
    }
  }

  return new Intl.NumberFormat(bcp47, {
    style,
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(value);
}

function defaultMinDigits(style: NumericStyle): number {
  return style === "currency" ? 2 : 0;
}

/**
 * Strip trailing zeros from the fractional portion of a decimal-style
 * formatted string. Leaves whole numbers and non-decimal styles untouched.
 *
 * The function trusts the LAST separator character (`.`, `,`, or U+202F
 * NNBSP) in the string to be the decimal mark — matching the convention used
 * by `Intl.NumberFormat` for every locale we ship today (`en-US`,
 * `es-ES`). Anchoring on the LAST separator prevents a regex from eating a
 * legitimate thousand-separator group of zeros (e.g. `"1,000"`).
 *
 * The heuristic for the "all-zero fraction" case treats a run of exactly
 * three zero digits (`"000"`) as Intl's natural thousands-grouping integer
 * output ("1,000", "1.000", "$1,000") and preserves the format. Shorter
 * all-zero runs (`"120.00"`, `"1.0"`) are stripped because they come from
 * minimum-fraction-digits padding, not thousands grouping.
 *
 * Examples:
 *   `"5.10"`            -> `"5.1"`
 *   `"5.00"`            -> `"5"`
 *   `"120.500"`         -> `"120.5"`
 *   `"120,500"`         -> `"120,5"`
 *   `"120\u202F500"`    -> `"120\u202F5"`
 *   `"120."`            -> `"120"` (dangling separator dropped)
 *   `"120.00"`          -> `"120"` (zero-padded fraction dropped)
 *   `"1,000"`           -> `"1,000"` (thousands grouping preserved)
 *   `"$1,000"`          -> `"$1,000"`
 *   `"1.000"`           -> `"1.000"` (de-DE thousands grouping preserved)
 *   `"1,000,000"`       -> `"1,000,000"` (large integer preserved)
 *   `"1,234"`           -> `"1,234"` (no trailing zeros)
 */
export function stripTrailingZeroFraction(formatted: string): string {
  const lastSepIndex = lastSeparatorIndex(formatted);
  if (lastSepIndex === -1) return formatted;

  const beforeSep = formatted.slice(0, lastSepIndex);
  const afterSep = formatted.slice(lastSepIndex + 1);
  const sep = formatted.charAt(lastSepIndex);

  // Empty fractional part: drop the dangling separator.
  if (afterSep.length === 0) return beforeSep;

  const trimmed = afterSep.replace(/0+$/, "");

  // Nothing trailing-zero to strip.
  if (trimmed === afterSep) return formatted;

  // All-zero fraction. A 3-zero-digit run is Intl's natural thousands-grouping
  // output ("1,000"); preserve the format. Shorter all-zero runs come from
  // zero-padded minimum-fraction-digits, which the caller asked us to clean.
  if (trimmed === "" && afterSep === "000") return formatted;
  if (trimmed === "") return beforeSep;

  return beforeSep + sep + trimmed;
}

function lastSeparatorIndex(formatted: string): number {
  // Find the rightmost `.`, `,`, or narrow-no-break-space.
  let lastIndex = -1;
  for (let i = formatted.length - 1; i >= 0; i--) {
    const ch = formatted[i];
    if (ch === "." || ch === "," || ch === "\u202F") {
      lastIndex = i;
      break;
    }
  }
  return lastIndex;
}

/**
 * Convenience wrapper that defaults to currency style.
 *
 * @see formatNumericValue
 */
export function formatCurrency(
  value: number,
  options: NumericFormatOptions = {}
): string {
  return formatNumericValue(value, { ...options, style: "currency" });
}

/**
 * Convenience wrapper that defaults to decimal style.
 *
 * @see formatNumericValue
 */
export function formatNumber(
  value: number,
  options: NumericFormatOptions = {}
): string {
  return formatNumericValue(value, { ...options, style: "decimal" });
}

/**
 * Convenience wrapper that defaults to percent style.
 *
 * @see formatNumericValue
 */
export function formatPercent(
  value: number,
  options: NumericFormatOptions = {}
): string {
  return formatNumericValue(value, { ...options, style: "percent" });
}
