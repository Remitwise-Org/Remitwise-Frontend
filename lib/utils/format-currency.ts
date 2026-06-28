import { formatNumericValue, type NumericFormatOptions } from "@/lib/i18n/formatters";

/**
 * @deprecated This thin wrapper is kept only for backwards compatibility.
 *
 * New code should import `formatCurrency` from `@/lib/i18n/formatters`
 * directly, or use the React components / hooks exported from
 * `@/components/i18n`. The shared implementation is the single source of
 * truth for locale-aware rounding — see issue #732.
 */

export type FormatCurrencyOptions = Omit<
  NumericFormatOptions,
  "style" | "stripTrailingZeros"
>;

const DEFAULT_MINIMUM_FRACTION_DIGITS = 2;
const DEFAULT_MAXIMUM_FRACTION_DIGITS = 2;

/**
 * Formats a numeric amount for a given locale and currency/asset code.
 *
 * Falls back to a plain localized number with a currency suffix when Intl
 * does not recognize the currency code (for example, stablecoin codes such
 * as `"USDC"`).
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale = "en",
  options: FormatCurrencyOptions = {}
): string {
  const {
    minimumFractionDigits = DEFAULT_MINIMUM_FRACTION_DIGITS,
    maximumFractionDigits = DEFAULT_MAXIMUM_FRACTION_DIGITS,
  } = options;

  return formatNumericValue(amount, {
    locale,
    currency,
    style: "currency",
    minimumFractionDigits,
    maximumFractionDigits,
  });
}

export const formatAmount = formatCurrency;
