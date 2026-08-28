import { test, expect } from '@playwright/test';

/**
 * Runs only in the `mobile-chromium` project (Pixel 7 viewport) — see
 * playwright.config.ts. At mobile widths the desktop nav is hidden and
 * navigation happens through the hamburger menu.
 */
test.describe('Mobile navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('hamburger opens and closes the mobile menu', async ({ page }) => {
    const menuButton = page.getByRole('button', { name: 'Toggle navigation menu' });
    await expect(menuButton).toBeVisible();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

    await menuButton.click();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    const header = page.locator('header');
    for (const item of ['Focus', 'Stream', 'Pool', 'Features']) {
      await expect(header.getByRole('link', { name: item })).toBeVisible();
    }

    await menuButton.click();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(header.getByRole('link', { name: 'Focus' })).toBeHidden();
  });

  test('selecting a nav item navigates and closes the menu', async ({ page }) => {
    const menuButton = page.getByRole('button', { name: 'Toggle navigation menu' });
    await menuButton.click();

    await page.locator('header').getByRole('link', { name: 'Features' }).click();

    await expect(page).toHaveURL(/#features/);
    await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('header').getByRole('link', { name: 'Focus' })).toBeHidden();
  });

  test('mobile menu exposes the theme toggle', async ({ page }) => {
    await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
    await expect(page.getByRole('button', { name: 'Toggle theme' })).toBeVisible();
  });
});
