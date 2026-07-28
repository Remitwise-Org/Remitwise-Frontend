import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Define a set of button variants based on className patterns observed in the codebase.
// These are representative samples – the list can be expanded as needed.
const buttonVariants = [
  {
    name: 'Primary',
    className:
      'rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2',
  },
  {
    name: 'Danger',
    className:
      'rounded-full bg-red-600 px-4 py-3 text-center font-semibold text-white hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70',
  },
  {
    name: 'Secondary',
    className:
      'rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2',
  },
  {
    name: 'IconButton',
    className:
      'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
  },
];

describe('Button variant accessibility', () => {
  test.each(buttonVariants)('variant %s should have no axe violations', async ({ name, className }) => {
    const { container } = render(
      <button className={className}>{name} button</button>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
