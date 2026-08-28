import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads with the expected title and hero content', async ({ page }) => {
    await expect(page).toHaveTitle(/MERIDIAN/i);

    // Hero heading (h1) is server-rendered above the fold.
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Where Real-World Effort Meets/i,
      })
    ).toBeVisible();

    await expect(
      page.getByText('Earn by staying focused, stream payments in real-time', {
        exact: false,
      })
    ).toBeVisible();
  });

  test('shows the header with brand and desktop navigation', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header.getByText('MERIDIAN')).toBeVisible();

    for (const item of ['Focus', 'Stream', 'Pool', 'Features']) {
      await expect(header.getByRole('link', { name: item })).toBeVisible();
    }
  });

  test('renders the primary hero call-to-action buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Start Focus Session' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Explore Features' })).toBeVisible();
  });

  test('anchor navigation scrolls to the features section', async ({ page }) => {
    const header = page.locator('header');
    await header.getByRole('link', { name: 'Features' }).click();
    await expect(page).toHaveURL(/#features/);
  });
});
