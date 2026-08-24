'use client';

import { motion } from 'framer-motion';
import { containerVariants, sectionReveal, sectionViewport } from '@/lib/animations/variants';
import { LeaderboardCard } from './pool/LeaderboardCard';
import { PoolFeatureGrid } from './pool/PoolFeatureGrid';
import { PoolStats } from './pool/PoolStats';

export function PoolSection() {
  return (
    <section id="pool" aria-labelledby="pool-heading" className="py-20 px-4 max-w-7xl mx-auto">
      {/* Section heading */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        viewport={{ once: true }}
        role="presentation"
        aria-hidden="true"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        className="text-center mb-16"
      >
        <h2
          id="pool-heading"
          className="text-4xl sm:text-5xl font-bold text-foreground mb-4"
        >
          Pool Pillar
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Participate in yield pools with zero loss. Earn rewards based on your focus activity while
          keeping your principal safe.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left — leaderboard */}
        <LeaderboardCard />

        {/* Right — features + stats */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={sectionViewport}
          className="space-y-6"
        >
          <h3 className="text-2xl font-bold text-foreground">No-Loss Yield</h3>
          <PoolFeatureGrid />
          <PoolStats />
        </motion.div>
      </div>
    </section>
  );
}
