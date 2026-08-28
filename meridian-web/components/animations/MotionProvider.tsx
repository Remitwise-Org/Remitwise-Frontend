'use client';

import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';

/**
 * Applies the user's operating-system reduced-motion preference to every
 * Framer Motion component on the homepage. Framer Motion removes transform
 * animation in this mode, preventing distracting movement and layout jank.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
