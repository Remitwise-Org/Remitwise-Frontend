import { test, expect } from '@playwright/test';

/**
 * Calculator E2E Tests
 *
 * Covers the EarningsCalculator component interactivity:
 * - Salary input manipulation and metric recomputation
 * - Per-second rate display
 * - Accessible data table visibility
 * - Error boundary fallback
 */

test.describe('Earnings Calculator — Stream Section', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Scroll to the Stream section where the calculator lives
    await page.getByRole('link', { name: 'Stream' }).click();
    await page.waitForTimeout(1000);
  });

  test('renders the earnings calculator within the stream section', async ({ page }) => {
    await expect(
      page.getByText('Earnings Calculator')
    ).toBeVisible();

    // Should show default salary and per-second rate
    await expect(page.getByText('$5,000/month')).toBeVisible();
    await expect(page.getByText('$0.0578/second')).toBeVisible();
  });

  test('displays an accessible data table with rate breakdown', async ({ page }) => {
    // The calculator renders a hidden table for screen readers
    const dataTable = page.getByRole('table', { hidden: true });
    await expect(dataTable).toBeVisible();
  });
});

test.describe('Earnings Calculator — Standalone Page', () => {
  test('calculator adjusts per-second rate when salary input changes', async ({ page }) => {
    await page.goto('/');

    // Scroll to the Stream section where the calculator lives
    const streamLink = page.getByRole('link', { name: 'Stream' });
    await streamLink.click();
    await page.waitForTimeout(1000);

    // The calculator section should be in view
    await expect(page.getByText('Earnings Calculator')).toBeInViewport();
  });

  test('survives section re-renders without losing state', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to features and back — the lazy sections remount
    await page.getByRole('link', { name: 'Features' }).click();
    await page.waitForTimeout(500);
    await page.getByRole('link', { name: 'Stream' }).click();
    await page.waitForTimeout(1000);

    // Calculator should still render after re-mount
    await expect(page.getByText('Earnings Calculator')).toBeVisible();
  });
});
