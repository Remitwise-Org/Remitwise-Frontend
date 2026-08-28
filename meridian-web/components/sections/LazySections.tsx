'use client';

import dynamic from 'next/dynamic';
import { SectionSkeleton } from './SectionSkeleton';

/**
 * LazySections — all below-the-fold or client-heavy components are loaded
 * with `next/dynamic` so their JS is excluded from the initial HTML payload.
 *
 * Render strategy:
 *  • `ssr: false`  — skips server rendering entirely; avoids hydration cost
 *                    for components that rely on browser APIs or heavy libs.
 *  • `loading`     — returns a typed SectionSkeleton that matches the real
 *                    section's rough height, preventing CLS while JS loads.
 *
 * Why this file exists:
 *  Above-the-fold sections (Hero, FocusSection heading) are server-rendered
 *  in `app/page.tsx` for SEO and a fast LCP.  Everything else lives here.
 */

// ─── Focus pillar interactive sub-components ────────────────────────────────
// Grouped into a single chunk (FocusInteractive) to avoid three parallel
// requests for PetProgression / TimerSelector / StreakDisplay.

export const FocusInteractiveLazy = dynamic(
  () => import('./FocusInteractive').then((m) => m.FocusInteractive),
  { ssr: false, loading: () => <SectionSkeleton variant="default" /> },
);

export const SuperchargeTiersLazy = dynamic(
  () => import('./focus/SuperchargeTiers').then((m) => m.SuperchargeTiers),
  { ssr: false, loading: () => <SectionSkeleton variant="default" /> },
);

// ─── Stream pillar ──────────────────────────────────────────────────────────
// StreamChartCard depends on recharts — the largest dependency on this page.

export const StreamSectionLazy = dynamic(
  () => import('./StreamSection').then((m) => m.StreamSection),
  { ssr: false, loading: () => <SectionSkeleton variant="chart" /> },
);

// ─── Pool pillar ─────────────────────────────────────────────────────────────

export const PoolSectionLazy = dynamic(
  () => import('./PoolSection').then((m) => m.PoolSection),
  { ssr: false, loading: () => <SectionSkeleton variant="chart" /> },
);

// ─── Features grid ──────────────────────────────────────────────────────────
// Uses framer-motion whileInView stagger — defer it so initial JS is smaller.

export const FeaturesLazy = dynamic(
  () => import('./Features').then((m) => m.Features),
  { ssr: false, loading: () => <SectionSkeleton variant="grid" /> },
);

// ─── CTA ────────────────────────────────────────────────────────────────────

export const CTALazy = dynamic(
  () => import('./CTA').then((m) => m.CTA),
  { ssr: false, loading: () => <SectionSkeleton variant="cta" /> },
);
