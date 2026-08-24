'use client';

/**
 * FocusInteractive — client boundary for the three interactive focus widgets.
 *
 * Grouping them in one file means a single dynamic() call in LazySections
 * downloads one chunk instead of three, reducing waterfall requests.
 */
import { motion } from 'framer-motion';
import { containerVariants } from '@/lib/animations/variants';
import { PetProgression } from './focus/PetProgression';
import { TimerSelector } from './focus/TimerSelector';
import { StreakDisplay } from './focus/StreakDisplay';

export function FocusInteractive() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      className="space-y-8"
    >
      <PetProgression />
      <TimerSelector />
      <StreakDisplay />
    </motion.div>
  );
}
