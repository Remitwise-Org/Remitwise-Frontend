import React from 'react';
import type { Decorator } from '@storybook/react';

/**
 * A Storybook decorator that applies a CSS class to mimic the 
 * prefers-reduced-motion media query for previewing accessible animations.
 * 
 * It reads the `reducedMotion` global, which can be toggled via the Storybook toolbar.
 */
export const withReducedMotion: Decorator = (Story, context) => {
  const isReducedMotion = context.globals?.reducedMotion === true;

  return (
    <div className={isReducedMotion ? 'preview-reduced-motion' : undefined}>
      <Story />
    </div>
  );
};
