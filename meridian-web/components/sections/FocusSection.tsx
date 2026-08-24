/**
 * FocusSection — React Server Component shell.
 *
 * The section heading and layout skeleton are rendered on the server for
 * SEO and a fast first paint (no hydration cost).  The four interactive
 * sub-components (PetProgression, TimerSelector, StreakDisplay,
 * SuperchargeTiers) are heavy framer-motion clients; they are deferred
 * via React.Suspense + dynamic() in LazySections so their JS is excluded
 * from the initial bundle and loaded only when the browser is ready.
 */
import { Suspense } from 'react';
import {
  FocusInteractiveLazy,
  SuperchargeTiersLazy,
} from '@/components/sections/LazySections';
import { SectionSkeleton } from '@/components/sections/SectionSkeleton';
import { FocusProvider } from '@/context/FocusContext';

export function FocusSection() {
  return (
    <FocusProvider>
      <section 
        id="focus" 
        className="py-20 px-4 max-w-7xl mx-auto"
        style={{
          contentVisibility: 'auto',
          containIntrinsicSize: '0 800px',
        }}
      >
        {/* Heading — SSR, zero JS, fast first paint */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">Focus Pillar</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Nurture your productivity companion while earning rewards for staying focused.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left col — pet, timer, streaks — deferred via Suspense */}
          <Suspense fallback={<SectionSkeleton variant="default" />}>
            <FocusInteractiveLazy />
          </Suspense>

          {/* Right col — supercharge tiers — deferred via Suspense */}
          <Suspense fallback={<SectionSkeleton variant="default" />}>
            <SuperchargeTiersLazy />
          </Suspense>
        </div>
      </section>
    </FocusProvider>
  );
}
