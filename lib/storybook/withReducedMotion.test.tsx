import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import fc from 'fast-check';
import { withReducedMotion } from './withReducedMotion';
import type { StoryContext } from '@storybook/react';

describe('withReducedMotion', () => {
  afterEach(() => {
    cleanup();
  });

  it('applies_preview_reduced_motion_class_when_global_is_true', () => {
    fc.assert(
      fc.property(fc.boolean(), (reducedMotion) => {
        const Story = () => <div data-testid="story-content">Story content</div>;
        const context = {
          globals: {
            reducedMotion,
          },
        } as unknown as StoryContext;

        const { container, unmount } = render(
          withReducedMotion(Story, context) as React.ReactElement
        );
        const wrapper = container.firstChild as HTMLElement;

        if (reducedMotion) {
          expect(wrapper.classList.contains('preview-reduced-motion')).toBe(true);
        } else {
          expect(wrapper.classList.contains('preview-reduced-motion')).toBe(false);
        }
        
        unmount();
      }),
      { numRuns: 100 }
    );
  });
});
