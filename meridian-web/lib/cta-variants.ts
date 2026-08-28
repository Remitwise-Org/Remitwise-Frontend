/**
 * CTA variant registry.
 *
 * Each entry fully describes the copy, links, and button emphasis for one
 * CTA rendering. Adding a new A/B test arm is a data change only — add an
 * entry here and it becomes selectable via the `variant` prop or the
 * `?cta=<id>` query string, with no component changes required.
 */

export type CtaButtonStyle = 'solid' | 'outline' | 'ghost';

export interface CtaAction {
  label: string;
  href: string;
  style: CtaButtonStyle;
  /** Show the animated arrow icon after the label. */
  withArrow?: boolean;
}

export interface CtaVariant {
  id: string;
  /** Optional eyebrow badge rendered above the heading. */
  badge?: string;
  heading: string;
  description: string;
  actions: CtaAction[];
  footnote?: string;
}

export const CTA_VARIANTS = {
  /** Fallback marketing CTA — shown to anonymous / unknown visitors. */
  marketing: {
    id: 'marketing',
    heading: 'Ready to Transform Your Productivity?',
    description:
      'Join thousands of users earning real value from their focus. Start your journey today and begin earning with every productive moment.',
    actions: [
      {
        label: 'Start Earning Now',
        href: '/auth/sign-in',
        style: 'solid',
        withArrow: true,
      },
      {
        label: 'Learn More',
        href: '#features',
        style: 'outline',
      },
    ],
    footnote: 'No credit card required. Free to start. Premium features available.',
  },
  /** Member-focused onboarding CTA — shown to signed-in / returning users. */
  member: {
    id: 'member',
    badge: 'Welcome back',
    heading: 'Pick Up Where You Left Off',
    description:
      'Your companion is waiting. Start a focus session to keep your streak alive, earn XP, and grow your on-chain progression.',
    actions: [
      {
        label: 'Start a Focus Session',
        href: '#focus',
        style: 'solid',
        withArrow: true,
      },
      {
        label: 'Explore Yield Pools',
        href: '#pool',
        style: 'ghost',
      },
    ],
    footnote: 'Every session counts toward your streak. Night owl bonus active midnight–6 AM.',
  },
} as const satisfies Record<string, CtaVariant>;

export type CtaVariantId = keyof typeof CTA_VARIANTS;

export const DEFAULT_CTA_VARIANT: CtaVariantId = 'marketing';

/** Query-string key used to select a variant, e.g. `/?cta=member`. */
export const CTA_QUERY_PARAM = 'cta';

export function isCtaVariantId(value: string | null | undefined): value is CtaVariantId {
  return typeof value === 'string' && value in CTA_VARIANTS;
}

/**
 * Resolve which variant to render. An explicit prop wins (for direct reuse
 * of the component elsewhere); otherwise the URL param is honoured (for
 * A/B experiment links); otherwise fall back to the marketing variant.
 */
export function resolveCtaVariant(
  prop: CtaVariantId | undefined,
  queryValue: string | null | undefined
): CtaVariant {
  if (prop && isCtaVariantId(prop)) return CTA_VARIANTS[prop];
  if (isCtaVariantId(queryValue)) return CTA_VARIANTS[queryValue];
  return CTA_VARIANTS[DEFAULT_CTA_VARIANT];
}
