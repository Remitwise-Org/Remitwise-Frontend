/**
 * Canonical widget IDs used by the `?widget=` deep-link query parameter.
 *
 * These values are part of the public URL surface — do NOT rename them without
 * a deprecation period, as support teams share links that include them.
 *
 * Usage:
 *   /dashboard?widget=six-month-trends   → scrolls to & highlights that widget
 *   /dashboard?widget=money-distribution → same for the distribution pie
 *
 * @see docs/architecture.md — "Deep-link support" section
 */
export const WIDGET_IDS = {
  SIX_MONTH_TRENDS:      'six-month-trends',
  MONEY_DISTRIBUTION:    'money-distribution',
  RECENT_TRANSACTIONS:   'recent-transactions',
  SAVINGS_BY_GOAL:       'savings-by-goal',
} as const;

export type WidgetId = (typeof WIDGET_IDS)[keyof typeof WIDGET_IDS];

/** All valid widget IDs as a Set — used for validation in the hook. */
export const VALID_WIDGET_IDS = new Set<string>(Object.values(WIDGET_IDS));