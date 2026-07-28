/**
 * Typed tutorials catalog — single source of truth for all tutorial routes.
 *
 * Mirrors the structure of {@link lib/changelog.ts} so contributors can follow
 * the same pattern when adding new tutorials.
 *
 * User-facing strings are grouped under the `title` and `description` fields.
 * When i18n is wired up, replace these string literals with translation-key
 * lookups (e.g. `t('tutorials.getting-started.title')`).
 *
 * @module lib/tutorials
 */

/** A single tutorial entry in the catalog. */
export interface Tutorial {
  /** URL-safe identifier; matches the `[tutorialId]` route segment. */
  id: string;
  /**
   * Display title.
   * i18n-ready: key `tutorials.<id>.title`
   */
  title: string;
  /**
   * Short description shown in the list view.
   * i18n-ready: key `tutorials.<id>.description`
   */
  description: string;
  /** Approximate read/watch time shown to the user (e.g. "5 min"). */
  duration: string;
  /** Number of chapters in this tutorial. */
  chaptersCount: number;
  /** User's current progress percentage (0-100). Defaults to 0 for new users. */
  progress: number;
}

/** Complete catalog of RemitWise tutorials. */
export const TUTORIALS: Tutorial[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with RemitWise',
    description: 'Learn the basics of sending money and managing your account',
    duration: '5 min',
    chaptersCount: 5,
    progress: 0,
  },
  {
    id: 'family-wallets',
    title: 'Setting Up Family Wallets',
    description: 'Connect and manage family member wallets for easy transfers',
    duration: '3 min',
    chaptersCount: 5,
    progress: 20,
  },
  {
    id: 'savings-goals',
    title: 'Creating Savings Goals',
    description: 'Set up and track your financial goals with RemitWise',
    duration: '4 min',
    chaptersCount: 5,
    progress: 60,
  },
  {
    id: 'emergency-transfers',
    title: 'Emergency Transfers',
    description: 'How to use emergency transfer for urgent situations',
    duration: '2 min',
    chaptersCount: 5,
    progress: 0,
  },
  {
    id: 'bill-payments',
    title: 'Bill Payments',
    description: 'Pay bills directly from your RemitWise wallet',
    duration: '3 min',
    chaptersCount: 5,
    progress: 0,
  },
];

/**
 * Look up a tutorial by its id segment.
 *
 * @param id - The `[tutorialId]` route segment (e.g. `"getting-started"`).
 * @returns The matching {@link Tutorial}, or `undefined` when not found.
 *
 * @example
 * ```ts
 * const tutorial = getTutorialById('savings-goals');
 * if (!tutorial) notFound();
 * ```
 */
export function getTutorialById(id: string): Tutorial | undefined {
  return TUTORIALS.find((t) => t.id === id);
}
