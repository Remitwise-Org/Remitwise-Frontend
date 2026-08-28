import { SectionSkeleton } from '@/components/sections/SectionSkeleton';

/**
 * Root loading boundary — shown during full-page route transitions.
 *
 * Uses the existing SectionSkeleton components so the layout structure
 * is identical to the final rendered page, preventing Cumulative Layout
 * Shift (CLS). Each skeleton variant matches the height of the real
 * section it is replacing.
 *
 * Strategy:
 *  • Above-the-fold sections (Hero + FocusSection) are SSR'd with their
 *    final markup — no skeleton needed.
 *  • Below-the-fold sections are deferred via React.Suspense with
 *    SectionSkeleton fallbacks already (see app/page.tsx).
 *  • This loading state covers the brief interval before those Suspense
 *    boundaries pick up, ensuring zero layout gaps.
 */
export default function RootLoading() {
  return (
    <div className="w-full">
      {/* The Header is SSR'd immediately — no skeleton needed. */}

      {/* Mirrors the app/page.tsx Suspense boundary structure */}
      <div className="space-y-24 pb-24">
        {/* Stream section skeleton */}
        <SectionSkeleton variant="chart" />

        {/* Pool section skeleton */}
        <SectionSkeleton variant="chart" />

        {/* Features grid skeleton */}
        <SectionSkeleton variant="grid" />

        {/* CTA skeleton */}
        <SectionSkeleton variant="cta" />
      </div>
    </div>
  );
}