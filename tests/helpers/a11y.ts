import { axe } from 'jest-axe';
import { expect } from 'vitest';

/**
 * Asserts that the given component has no accessibility violations using jest-axe.
 * 
 * @param component The DOM element or HTML string to test
 */
export async function expectNoAxeViolations(component: string | Element) {
  const results = await axe(component);
  expect(results).toHaveNoViolations();
}
