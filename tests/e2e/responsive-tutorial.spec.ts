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

test.describe('Tutorial Reading Flow - Responsive Tests', () => {
  viewports.forEach(({ name, width, height }) => {
    test(`${name} (${width}×${height}) - Layout and Overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      // Assuming a tutorial 1, chapter 0 exists
      await page.goto('/tutorial/1/chapter/0');
      
      await page.waitForLoadState('networkidle');
      
      // Check no horizontal overflow
      await checkNoHorizontalOverflow(page);
    });
  });
});
