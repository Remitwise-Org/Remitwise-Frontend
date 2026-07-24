"use client";

import * as React from "react";
import { formatNumericValue } from "@/lib/i18n/formatters";
import { useFormatter } from "./useFormatter";
import { localeTag } from "./internal";

/**
 * Allowed `style` values for `<FormattedNumber>`.
 *
 * The `"currency"` style is intentionally excluded so currency strings always
 * route through `<FormattedCurrency>`, which enforces a `currency` prop and
 * applies the stablecoin/asset fallback. Use `<FormattedCurrency>` for any
 * monetary display.
 */
export type FormattedNumberStyle = "decimal" | "percent" | "unit";

/**
 * Props accepted by `<FormattedNumber>`.
 *
 * Use this component for plain decimals, percents, and unit-aware numbers
 * (e.g. `"3.5 kg"`). For currency strings, prefer `<FormattedCurrency>` so
 * the `currency` prop is enforced.
 */
export interface FormattedNumberProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Numeric value to render. */
  value: number;
  /** Style of formatting. Defaults to `"decimal"`. */
  style?: FormattedNumberStyle;
  /**
   * Override the user locale for this single render. Accepts either a
   * RemitWise supported locale (`"en"`, `"es"`) or a BCP-47 tag.
   */
  locale?: string;
  /**
   * Minimum number of fraction digits. Defaults to `0` for non-currency
   * styles.
   */
  minimumFractionDigits?: number;
  /** Maximum number of fraction digits. */
  maximumFractionDigits?: number;
  /**
   * Trim trailing zeros from the fractional part (e.g. `"5.00"` → `"5"`).
   * Only applies to `style === "decimal"`.
   */
  stripTrailingZeros?: boolean;
  /**
   * Render children as the visible content instead of the formatted value.
   * Mirrors the children-as-function pattern of `<FormattedCurrency>`.
   */
  children?: (formatted: string) => React.ReactNode;
}

/**
 * Render a value as a localized number string.
 *
 * Like `<FormattedCurrency>`, this component is a thin JSX wrapper around the
 * shared pure formatter at `lib/i18n/formatters.ts`. It:
 *   - reads the active user locale by default,
 *   - accepts an explicit `locale` override for per-render exceptions,
 *   - passes `className` straight to the underlying `<span>` so callers
 *     keep using design tokens rather than hard-coded styles.
 *
 * Note: `style="decimal"` defaults to 0 fraction digits, so callers who want
 * to preserve a fractional render must pass `maximumFractionDigits`
 * explicitly.
 *
 * @example
 *   // Default: rounds the fractional part away (0 fraction digits).
 *   <FormattedNumber value={1234567.89} />            // → "1,234,568"
 *   // Preserve the fractional part:
 *   <FormattedNumber value={1234567.89} maximumFractionDigits={2} />  // → "1,234,567.89"
 *   <FormattedNumber value={0.42} style="percent" /> // → "42%"
 *   <FormattedNumber value={5} stripTrailingZeros maximumFractionDigits={4} /> // → "5"
 */
export function FormattedNumber({
  value,
  style = "decimal",
  locale,
  minimumFractionDigits,
  maximumFractionDigits,
  stripTrailingZeros,
  children,
  className,
  ...rest
}: FormattedNumberProps) {
  const { formatNumber: formatFromLocale, bcp47Locale } = useFormatter();

  const formatted = React.useMemo(() => {
    try {
      return formatNumericValue(value, {
        style,
        locale: locale ?? bcp47Locale,
        minimumFractionDigits,
        maximumFractionDigits,
        stripTrailingZeros,
      });
    } catch {
      return formatFromLocale(value, {
        style,
        minimumFractionDigits,
        maximumFractionDigits,
        stripTrailingZeros,
      });
    }
  }, [
    formatFromLocale,
    value,
    style,
    locale,
    bcp47Locale,
    minimumFractionDigits,
    maximumFractionDigits,
    stripTrailingZeros,
  ]);

  return (
    <span
      className={className}
      data-i18n-locale={localeTag(locale ?? bcp47Locale)}
      {...rest}
    >
      {children ? children(formatted) : formatted}
    </span>
  );
}
