"use client";

import { useMemo } from "react";
import {
  formatCurrency,
  formatNumber,
  formatNumericValue,
  formatPercent,
  toBcp47Locale,
  type NumericFormatOptions,
} from "@/lib/i18n/formatters";
import { useClientLocale } from "@/lib/i18n/client";
import type { SupportedLocale } from "@/lib/i18n/cookie";

/**
 * Shape of the bundle returned by {@link useFormatter}.
 *
 * Every helper is stable for the lifetime of a given locale, so calling code
 * can safely hand them to `useEffect` dependency arrays or memoized children
 * without causing spurious re-renders.
 */
export interface FormatterHelpers {
  /** Active locale tag (`"en"` or `"es"`) used for downstream formatting. */
  locale: SupportedLocale;
  /** BCP-47 locale tag (e.g. `"en-US"`) used for `Intl.NumberFormat`. */
  bcp47Locale: string;
  /** Generic numeric formatter. */
  formatNumeric: (
    value: number,
    options?: Omit<NumericFormatOptions, "locale">
  ) => string;
  /** Currency-style formatter. Defaults `style` to `"currency"`. */
  formatCurrency: (
    value: number,
    options?: Omit<NumericFormatOptions, "locale" | "style">
  ) => string;
  /** Decimal-style formatter. Defaults `style` to `"decimal"`. */
  formatNumber: (
    value: number,
    options?: Omit<NumericFormatOptions, "locale" | "style">
  ) => string;
  /** Percent-style formatter. Defaults `style` to `"percent"`. */
  formatPercent: (
    value: number,
    options?: Omit<NumericFormatOptions, "locale" | "style">
  ) => string;
}

/**
 * React hook that returns locale-aware numeric helpers bound to the active
 * user's locale. This is the programmatic equivalent of rendering
 * `<FormattedCurrency>` / `<FormattedNumber>`; use it when you need the
 * formatted string outside of React's tree (chart tooltips, ARIA labels,
 * toast descriptions, etc.).
 *
 * The hook:
 *   - reads the locale through {@link useClientLocale}, so it respects the
 *     cookie/preference/navigator resolution order defined in
 *     `lib/i18n/resolve-locale.ts`;
 *   - routes every helper through the shared pure formatter at
 *     `lib/i18n/formatters.ts` so a rounding rule lives in one place
 *     (issue #732);
 *   - re-binds the helpers only when the locale changes (the returned
 *     functions are stable across re-renders);
 *   - never crashes on SSR — `useClientLocale` defaults to `"en"` until the
 *     client-side effect resolves.
 *
 * @example
 *   const { formatCurrency, locale } = useFormatter();
 *   <div aria-label={`Balance in ${locale}: ${formatCurrency(1234.5, { currency: "USD" })}`}>
 *     {formatCurrency(1234.5, { currency: "USD" })}
 *   </div>
 */
export function useFormatter(): FormatterHelpers {
  const locale = useClientLocale();

  return useMemo<FormatterHelpers>(() => {
    return {
      locale,
      bcp47Locale: toBcp47Locale(locale),
      formatNumeric: (value, options = {}) =>
        formatNumericValue(value, { ...options, locale }),
      formatCurrency: (value, options = {}) =>
        formatCurrency(value, { ...options, locale }),
      formatNumber: (value, options = {}) =>
        formatNumber(value, { ...options, locale }),
      formatPercent: (value, options = {}) =>
        formatPercent(value, { ...options, locale }),
    };
  }, [locale]);
}
