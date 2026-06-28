/**
 * Barrel export for the locale-aware formatting components and hook.
 *
 * Importing from `@/components/i18n` keeps call sites tidy and provides a
 * single entry point that downstream code-reviewers can search for to
 * review locale-related changes in one place.
 */

// Public exports. Internal helpers live in `./internal` and are not re-exported.
export { FormattedCurrency, type FormattedCurrencyProps } from "./FormattedCurrency";
export { FormattedNumber, type FormattedNumberProps } from "./FormattedNumber";
export { useFormatter, type FormatterHelpers } from "./useFormatter";
