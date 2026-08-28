import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { MotionProvider } from '@/components/animations/MotionProvider';
// Hero and FocusSection are pure Server Components — zero JS for LCP.
import { Hero } from '@/components/sections/Hero';
import { FocusSection } from '@/components/sections/FocusSection';
// All below-the-fold sections are lazy-loaded on the client only.
// Their JS (recharts, framer-motion, etc.) is excluded from the initial
// payload and fetched only when the browser is idle / the section scrolls
// into view.  Each lazy export uses a sized SectionSkeleton to prevent CLS.
import {
  StreamSectionLazy,
  PoolSectionLazy,
  FeaturesLazy,
  CTALazy,
} from '@/components/sections/LazySections';
import { SectionSkeleton } from '@/components/sections/SectionSkeleton';

export default function Page() {
  return (
    <MotionProvider>
      <Header />
      <main className="pt-16">
        {/* ── Above the fold ── server-rendered for SEO and fast LCP ──────── */}
        {/*
         * Hero is a pure RSC — no JS shipped, CSS-only animations.
         * FocusSection SSR-renders its heading; interactive sub-components
         * are deferred via Suspense + dynamic() inside FocusSection.
         */}
        <Hero />
        <FocusSection />

        {/* ── Below the fold ── React.Suspense + ssr:false dynamic imports ── */}
        {/*
         * Each Suspense boundary is independent: one slow chunk doesn't
         * block the others from rendering their skeletons/content.
         * The `loading` prop on dynamic() also covers the client-side
         * transition; Suspense handles the server-side boundary.
         */}
        <Suspense fallback={<SectionSkeleton variant="chart" />}>
          <StreamSectionLazy />
        </Suspense>

        <Suspense fallback={<SectionSkeleton variant="chart" />}>
          <PoolSectionLazy />
        </Suspense>

        <Suspense fallback={<SectionSkeleton variant="grid" />}>
          <FeaturesLazy />
        </Suspense>

        <Suspense fallback={<SectionSkeleton variant="cta" />}>
          <CTALazy />
        </Suspense>
      </main>
      <Footer />
    </MotionProvider>
  );
}
