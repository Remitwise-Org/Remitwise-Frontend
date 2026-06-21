export type FormatCurrencyOptions = {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

const DEFAULT_MINIMUM_FRACTION_DIGITS = 2;
const DEFAULT_MAXIMUM_FRACTION_DIGITS = 2;

function formatNumber(
  amount: number,
  locale: string,
  minimumFractionDigits: number,
  maximumFractionDigits: number
) {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}

/**
 * Formats a numeric amount for a locale and currency/asset code.
 *
 * Falls back to a plain localized number with a currency suffix when
 * Intl does not recognize the currency code (for example, stablecoin codes).
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale = "en",
  options: FormatCurrencyOptions = {}
): string {
  const { minimumFractionDigits = DEFAULT_MINIMUM_FRACTION_DIGITS, maximumFractionDigits = DEFAULT_MAXIMUM_FRACTION_DIGITS } = options;
  const normalizedCurrency = currency?.trim();
  const resolvedLocale = locale || "en";

  if (!normalizedCurrency) {
    return formatNumber(amount, resolvedLocale, minimumFractionDigits, maximumFractionDigits);
  }

  try {
    return new Intl.NumberFormat(resolvedLocale, {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(amount);
  } catch {
    const formattedAmount = formatNumber(amount, resolvedLocale, minimumFractionDigits, maximumFractionDigits);
    return `${formattedAmount} ${normalizedCurrency}`;
  }
}

export const formatAmount = formatCurrency;
