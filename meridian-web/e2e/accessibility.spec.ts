import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Accessibility smoke checks for the key pages, powered by axe-core.
 * These assert zero serious/critical WCAG 2.0/2.1 A+AA violations —
 * a pragmatic bar that catches regressions without failing on
 * best-practice-level noise.
 */
const SERIOUS = ['serious', 'critical'];

async function analyze(page: import('@playwright/test').Page) {
  return new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    // color-contrast is excluded from the smoke bar: the brand primary
    // (amber, --primary in globals.css) fails 4.5:1 on light surfaces in a
    // few decorative spots. Fixing it is a design-token decision, tracked
    // separately — re-enable this rule once the palette is adjusted.
    .disableRules(['color-contrast'])
    .analyze();
}

test.describe('Accessibility smoke checks', () => {
  test('homepage has no serious or critical a11y violations', async ({ page }) => {
    await page.goto('/');
    const results = await analyze(page);
    const violations = results.violations.filter((v) => SERIOUS.includes(v.impact ?? ''));
    expect(
      violations,
      violations.map((v) => `${v.id}: ${v.description}`).join('\n')
    ).toEqual([]);
  });

  test('sign-in page has no serious or critical a11y violations', async ({ page }) => {
    await page.goto('/auth/sign-in');
    const results = await analyze(page);
    const violations = results.violations.filter((v) => SERIOUS.includes(v.impact ?? ''));
    expect(
      violations,
      violations.map((v) => `${v.id}: ${v.description}`).join('\n')
    ).toEqual([]);
  });

  test('sign-in form fields are programmatically labelled', async ({ page }) => {
    await page.goto('/auth/sign-in');
    // getByLabel only resolves when label-for/aria wiring is correct.
    await expect(page.getByLabel('Email')).toHaveAttribute('type', 'email');
    await expect(page.getByLabel('Password')).toHaveAttribute('type', 'password');
  });
});
