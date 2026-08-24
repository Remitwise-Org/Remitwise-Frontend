'use client';

import { motion } from 'framer-motion';
import { containerVariants, sectionReveal, sectionViewport } from '@/lib/animations/variants';
import { StreamChartCard } from './stream/StreamChartCard';
import { FeatureGrid } from './stream/FeatureGrid';
import { EarningsCalculator } from './stream/EarningsCalculator';

export function StreamSection() {
  return (
    <section id="stream" className="py-20 px-4 max-w-7xl mx-auto">
      {/* Section heading */}
      <motion.div
        role="presentation"
        aria-hidden="true"
        variants={sectionReveal}
        initial="hidden"
        whileInView="visible"
        viewport={sectionViewport}
        className="text-center mb-16"
      >
        <h2 className="text-4xl sm:text-5xl font-bold text-foreground mb-4">Stream Pillar</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Real-time payment streams connecting employees to employers with transparent, continuous
          compensation.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left — chart */}
        <StreamChartCard />

        {/* Right — features + calculator */}
        <motion.div
          role="presentation"
          aria-hidden="true"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={sectionViewport}
          className="space-y-6"
        >
          <h3 className="text-2xl font-bold text-foreground">Continuous Compensation</h3>
          <FeatureGrid />
          <EarningsCalculator />
        </motion.div>
      </div>
    </section>
  );
}
