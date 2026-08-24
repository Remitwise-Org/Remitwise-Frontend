import { test, expect } from '@playwright/test';

/**
 * Theme selection is handled by next-themes with `attribute="class"` and
 * `storageKey="meridian-theme"` (see app/layout.tsx), so a chosen theme is
 * observable as a class on <html> and a localStorage entry.
 */
test.describe('Theme toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('switches to dark mode and persists the choice', async ({ page }) => {
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await page.getByRole('menuitemradio', { name: 'Dark' }).click();

    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('meridian-theme')))
      .toBe('dark');

    // The choice survives a reload.
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/dark/);
  });

  test('switches back to light mode', async ({ page }) => {
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await page.getByRole('menuitemradio', { name: 'Dark' }).click();
    await expect(page.locator('html')).toHaveClass(/dark/);

    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await page.getByRole('menuitemradio', { name: 'Light' }).click();

    await expect(page.locator('html')).not.toHaveClass(/dark/);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('meridian-theme')))
      .toBe('light');
  });

  test('toggle trigger is keyboard accessible', async ({ page }) => {
    const trigger = page.getByRole('button', { name: 'Toggle theme' });
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitemradio', { name: 'System' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('menuitemradio', { name: 'System' })).toBeHidden();
  });
});
