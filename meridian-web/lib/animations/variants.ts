/**
 * ==========================================
 * MOTION AND ACCESSIBILITY POLICY STANDARD
 * ==========================================
 * 1. All animations must respect `prefers-reduced-motion` natively or via global context.
 * 2. Variant initial states must evaluate directly to safe layouts if motion is disabled.
 * 3. Element initial states must avoid invisible/unrendered states to completely mitigate FOUC.
 */

import type { Variants } from 'framer-motion';

/**
 * Shared Framer Motion variant definitions.
 * These are plain objects — no hooks, no context, safe to import in any file.
 */

export const sectionViewport = { once: true, amount: 0.2 } as const;

const revealTransition = { duration: 0.45, ease: 'easeOut' } as const;

/** The standard reveal for headings and standalone content. */
export const sectionReveal: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: revealTransition },
};

/** The standard reveal for data-heavy cards and charts. */
export const cardReveal: Variants = {
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: revealTransition },
};

/** Coordinates section children so cards enter with a consistent cadence. */
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

/** Fade + slide up — used in FocusSection and StreamSection */
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: revealTransition,
  },
};

/** Fade + slide in from left — used in PoolSection leaderboard rows */
export const itemVariantsLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: revealTransition,
  },
};

/** Standard heading reveal used across all three sections */
export const headingVariants = sectionReveal;

/** Hero content uses the same cadence but starts immediately on page load. */
export const heroContainerVariants: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
