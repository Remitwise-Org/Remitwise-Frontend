import { test, expect, type Page } from '@playwright/test';

const viewports = [
  { name: 'iPhone SE', width: 320, height: 568 },
  { name: 'iPhone 14', width: 375, height: 667 },
  { name: 'iPad Portrait', width: 768, height: 1024 },
];

async function checkNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasOverflow).toBe(false);
}

async function waitForTutorialPage(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('text=Tutorial progress')).toBeVisible();
}

test.describe('Tutorial Reading Flow - Responsive Tests', () => {
  viewports.forEach(({ name, width, height }) => {
    test(`${name} (${width}×${height}) - Layout and Overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/tutorial/1/chapter/0');
      await waitForTutorialPage(page);
      await checkNoHorizontalOverflow(page);
    });
  });
});
