import {
  formatNumericValue,
  type NumericFormatOptions,
} from "@/lib/i18n/formatters";

/**
 * @deprecated This thin wrapper is kept only for backwards compatibility.
 *
 * The legacy signature treats the `currency` option as informational and
 * always renders as a decimal-style number, so we preserve that behaviour
 * here. New code should import `formatCurrency` / `formatNumber` from
 * `@/lib/i18n/formatters` directly, or use the `<FormattedCurrency>` /
 * `<FormattedNumber>` components (or the `useFormatter` hook) when consuming
 * the active user locale. All entry points route through the same shared
 * formatter so rounding rules live in one place — see issue #732.
 * @see formatCurrency in `@/lib/i18n/formatters` for the modern API.
 */

interface LegacyFormatOptions
  extends Omit<NumericFormatOptions, "style" | "stripTrailingZeros" | "currency"> {
  /**
   * Currency hint. Accepted for signature compatibility but not used: the
   * legacy formatter always renders as a plain localized decimal so callers
   * can keep passing `currency` without changing the rendered output.
   */
  currency?: string;
  /**
   * @deprecated Legacy alias for `stripTrailingZeros`. Use
   * `stripTrailingZeros` in `@/lib/i18n/formatters`. Only honoured here for
   * `decimal` style.
   */
  stripZeros?: boolean;
  /**
   * @deprecated Legacy alias for `minimumFractionDigits`. Retained so the
   * pre-existing `utils/currency.test.ts` callers keep compiling.
   */
  minDecimalPlaces?: number;
  /**
   * @deprecated Legacy alias for `maximumFractionDigits`. Retained so the
   * pre-existing `utils/currency.test.ts` callers keep compiling.
   */
  maxDecimalPlaces?: number;
}

export function formatCurrency(value: number, options: LegacyFormatOptions = {}): string {
  const {
    stripZeros,
    minimumFractionDigits,
    maximumFractionDigits,
    minDecimalPlaces,
    maxDecimalPlaces,
    locale,
  } = options;

  const min = minimumFractionDigits ?? minDecimalPlaces ?? 2;
  const max = maximumFractionDigits ?? maxDecimalPlaces ?? min;

  return formatNumericValue(value, {
    locale,
    style: "decimal",
    minimumFractionDigits: min,
    maximumFractionDigits: max,
    stripTrailingZeros: stripZeros,
  });
}
