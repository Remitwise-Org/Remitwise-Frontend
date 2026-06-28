"use client";

import * as React from "react";
import { formatCurrency } from "@/lib/i18n/formatters";
import { useFormatter } from "./useFormatter";
import { localeTag } from "./internal";

/**
 * Props accepted by `<FormattedCurrency>`.
 *
 * `className` is passed straight through to the rendered `<span>` so callers
 * can adopt Tailwind design tokens without bypassing the component. The
 * underlying `<span>` exposes a `data-i18n-locale` attribute for tests and
 * design reviewers but is otherwise a plain inline element.
 */
export interface FormattedCurrencyProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** Numeric value to render. */
  value: number;
  /**
   * Currency code (ISO 4217 or a RemitWise asset code such as `"USDC"`).
   * Unknown codes render as `<localized-number> <CODE>` via the shared
   * formatter at `lib/i18n/formatters.ts`.
   */
  currency: string;
  /**
   * Override the user locale for this single render. Accepts either a
   * RemitWise supported locale (`"en"`, `"es"`) or a BCP-47 tag.
   */
  locale?: string;
  /**
   * Minimum number of fraction digits. Defaults to `2` for currency style.
   */
  minimumFractionDigits?: number;
  /** Maximum number of fraction digits. */
  maximumFractionDigits?: number;
  /**
   * Render children as the visible content instead of the formatted value.
   * Useful when you want to wrap the formatted text with a tooltip or
   * additional markup while keeping the formatter as the source of truth.
   */
  children?: (formatted: string) => React.ReactNode;
}

/**
 * Render a value as a localized currency string. This is the React-tree
 * counterpart of {@link formatCurrency}; in fact, it forwards directly to
 * the shared pure utility so a rounding fix in `lib/i18n/formatters.ts`
 * automatically benefits every call site.
 *
 * Reserved RemitWise design tokens should be applied via `className`
 * (e.g. `text-primary-600`). No color, spacing, or radii are hard-coded
 * inside the component.
 *
 * @example
 *   <FormattedCurrency value={1234.5} currency="USD" />
 *   // → "$1,234.50"
 *
 * @example
 *   <FormattedCurrency value={1234.5} currency="USDC" />
 *   // → "1,234.50 USDC"
 *
 * @example
 *   // Override the user locale for a single render (e.g. cross-region receipt).
 *   <FormattedCurrency value={1234.5} currency="USD" locale="es-ES" />
 */
export function FormattedCurrency({
  value,
  currency,
  locale,
  minimumFractionDigits,
  maximumFractionDigits,
  children,
  className,
  ...rest
}: FormattedCurrencyProps) {
  const { formatCurrency: formatFromLocale, bcp47Locale } = useFormatter();

  const formatted = React.useMemo(() => {
    try {
      return formatCurrency(value, {
        currency,
        locale: locale ?? bcp47Locale,
        minimumFractionDigits,
        maximumFractionDigits,
      });
    } catch {
      return formatFromLocale(value, {
        currency,
        minimumFractionDigits,
        maximumFractionDigits,
      });
    }
  }, [
    formatFromLocale,
    value,
    currency,
    locale,
    bcp47Locale,
    minimumFractionDigits,
    maximumFractionDigits,
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
