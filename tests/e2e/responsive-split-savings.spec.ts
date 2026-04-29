import { test, expect, type Page } from '@playwright/test';

/**
 * Responsive Breakpoint Tests for Split Configuration and Savings Goals
 * Issue #376 - UX-010 Responsive Breakpoint Audit
 * 
 * Tests verify:
 * - No horizontal overflow at any breakpoint
 * - Touch targets ≥ 44×44px (WCAG 2.1 AAA)
 * - Text sizes ≥ 14px on mobile
 * - Grid columns collapse appropriately
 * - Consistent spacing scale
 */

// Viewport configurations matching our custom breakpoints
const viewports = [
  { name: 'iPhone SE', width: 320, height: 568 },
  { name: 'iPhone 14', width: 375, height: 667 },
  { name: 'iPhone 14 Plus', width: 414, height: 896 },
  { name: 'Foldable', width: 450, height: 800 },
  { name: 'iPad Portrait', width: 768, height: 1024 },
  { name: 'iPad Landscape', width: 1024, height: 768 },
  { name: 'Desktop', width: 1440, height: 900 },
];

// Helper function to check for horizontal overflow
async function checkNoHorizontalOverflow(page: Page) {
  const hasOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > document.documentElement.clientWidth;
  });
  expect(hasOverflow).toBe(false);
}

// Helper function to check touch target size
async function checkTouchTargetSize(page: Page, selector: string, minWidth = 44, minHeight = 44) {
  const element = page.locator(selector).first();
  const box = await element.boundingBox();
  
  if (box) {
    expect(box.width).toBeGreaterThanOrEqual(minWidth);
    expect(box.height).toBeGreaterThanOrEqual(minHeight);
  }
}

// Helper function to check text size
async function checkMinTextSize(page: Page, selector: string, minSize = 14) {
  const fontSize = await page.locator(selector).first().evaluate((el) => {
    return parseFloat(window.getComputedStyle(el).fontSize);
  });
  expect(fontSize).toBeGreaterThanOrEqual(minSize);
}

test.describe('Split Configuration - Responsive Tests', () => {
  viewports.forEach(({ name, width, height }) => {
    test(`${name} (${width}×${height}) - Layout and Overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/split');
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // Check no horizontal overflow
      await checkNoHorizontalOverflow(page);
      
      // Verify main content is visible
      await expect(page.locator('h2:has-text("Current Allocation")')).toBeVisible();
    });

    test(`${name} (${width}×${height}) - Touch Targets`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/split');
      await page.waitForLoadState('networkidle');
      
      // Check Cancel button touch target
      const cancelButton = page.locator('a:has-text("Cancel")');
      if (await cancelButton.isVisible()) {
        await checkTouchTargetSize(page, 'a:has-text("Cancel")', 44, 44);
      }
      
      // Check Submit button touch target
      const submitButton = page.locator('button:has-text("Connect Contract First")');
      if (await submitButton.isVisible()) {
        await checkTouchTargetSize(page, 'button:has-text("Connect Contract First")', 44, 44);
      }
      
      // Check back button touch target
      const backButton = page.locator('button[aria-label="Go back"]');
      if (await backButton.isVisible()) {
        await checkTouchTargetSize(page, 'button[aria-label="Go back"]', 44, 44);
      }
    });

    test(`${name} (${width}×${height}) - Text Sizes`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/split');
      await page.waitForLoadState('networkidle');
      
      // On mobile (< 768px), check minimum text sizes
      if (width < 768) {
        // Check description text is at least 14px
        const descriptions = page.locator('p.text-gray-300, p.text-gray-500');
        const count = await descriptions.count();
        
        if (count > 0) {
          await checkMinTextSize(page, 'p.text-gray-300', 14);
        }
      }
    });

    test(`${name} (${width}×${height}) - Grid Layout`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/split');
      await page.waitForLoadState('networkidle');
      
      const mainGrid = page.locator('main > div').first();
      
      // Check grid columns based on viewport
      const gridColumns = await mainGrid.evaluate((el) => {
        return window.getComputedStyle(el).gridTemplateColumns;
      });
      
      if (width < 1280) {
        // Should be single column on mobile/tablet
        expect(gridColumns).not.toContain('360px');
      } else {
        // Should be two columns on desktop
        expect(gridColumns).toContain('360px');
      }
    });
  });

  test('Split Input Components - Responsive Spacing', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/split');
    await page.waitForLoadState('networkidle');
    
    // Check that split input cards have proper spacing
    const splitInputs = page.locator('div.rounded-2xl.border.border-white\\/\\[0\\.08\\]');
    const count = await splitInputs.count();
    
    expect(count).toBeGreaterThan(0);
    
    // Verify each split input is visible and has proper padding
    for (let i = 0; i < Math.min(count, 4); i++) {
      const input = splitInputs.nth(i);
      await expect(input).toBeVisible();
      
      const padding = await input.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return parseFloat(style.paddingLeft);
      });
      
      // Should have at least 16px padding on mobile
      expect(padding).toBeGreaterThanOrEqual(16);
    }
  });
});

test.describe('Savings Goals - Responsive Tests', () => {
  viewports.forEach(({ name, width, height }) => {
    test(`${name} (${width}×${height}) - Layout and Overflow`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/dashboard/goals');
      
      // Wait for page to load
      await page.waitForLoadState('networkidle');
      
      // Check no horizontal overflow
      await checkNoHorizontalOverflow(page);
      
      // Verify main content is visible
      await expect(page.locator('h1:has-text("Savings Goals")')).toBeVisible();
    });

    test(`${name} (${width}×${height}) - Stats Cards Grid`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/dashboard/goals');
      await page.waitForLoadState('networkidle');
      
      const statsGrid = page.locator('div.grid').first();
      
      // Check grid columns based on viewport
      const gridColumns = await statsGrid.evaluate((el) => {
        return window.getComputedStyle(el).gridTemplateColumns.split(' ').length;
      });
      
      if (width < 375) {
        // Single column on smallest screens
        expect(gridColumns).toBe(1);
      } else if (width < 768) {
        // Two columns on mobile
        expect(gridColumns).toBe(2);
      } else {
        // Three columns on tablet+
        expect(gridColumns).toBe(3);
      }
    });

    test(`${name} (${width}×${height}) - Goals Grid`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/dashboard/goals');
      await page.waitForLoadState('networkidle');
      
      // Find the goals grid (second grid on page)
      const goalsGrid = page.locator('div.grid').nth(1);
      
      if (await goalsGrid.isVisible()) {
        const gridColumns = await goalsGrid.evaluate((el) => {
          return window.getComputedStyle(el).gridTemplateColumns.split(' ').length;
        });
        
        if (width < 450) {
          // Single column on small mobile
          expect(gridColumns).toBe(1);
        } else if (width < 1280) {
          // Two columns on larger mobile/tablet
          expect(gridColumns).toBe(2);
        } else {
          // Three columns on desktop
          expect(gridColumns).toBe(3);
        }
      }
    });

    test(`${name} (${width}×${height}) - Goal Card Touch Targets`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/dashboard/goals');
      await page.waitForLoadState('networkidle');
      
      // Check "Add Funds" button touch target
      const addFundsButton = page.locator('button:has-text("Add Funds")').first();
      if (await addFundsButton.isVisible()) {
        await checkTouchTargetSize(page, 'button:has-text("Add Funds")', 44, 44);
      }
      
      // Check "Details" button touch target
      const detailsButton = page.locator('button:has-text("Details")').first();
      if (await detailsButton.isVisible()) {
        await checkTouchTargetSize(page, 'button:has-text("Details")', 44, 44);
      }
      
      // Check "New Goal" button touch target
      const newGoalButton = page.locator('button:has-text("New Goal")');
      if (await newGoalButton.isVisible()) {
        await checkTouchTargetSize(page, 'button:has-text("New Goal")', 44, 44);
      }
    });

    test(`${name} (${width}×${height}) - Card Padding`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/dashboard/goals');
      await page.waitForLoadState('networkidle');
      
      // Check goal card padding
      const goalCard = page.locator('div.rounded-2xl').first();
      
      if (await goalCard.isVisible()) {
        const padding = await goalCard.evaluate((el) => {
          const style = window.getComputedStyle(el);
          return parseFloat(style.paddingLeft);
        });
        
        // Should have appropriate padding based on viewport
        if (width < 320) {
          expect(padding).toBeGreaterThanOrEqual(20); // 5 * 4px
        } else if (width < 375) {
          expect(padding).toBeGreaterThanOrEqual(24); // 6 * 4px
        } else {
          expect(padding).toBeGreaterThanOrEqual(28); // 7 * 4px
        }
      }
    });
  });

  test('Modal - Responsive Behavior', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard/goals');
    await page.waitForLoadState('networkidle');
    
    // Click "New Goal" button
    const newGoalButton = page.locator('button:has-text("New Goal")');
    if (await newGoalButton.isVisible()) {
      await newGoalButton.click();
      
      // Check modal is visible
      await expect(page.locator('h2:has-text("Create New Goal")')).toBeVisible();
      
      // Check Close button touch target
      await checkTouchTargetSize(page, 'button:has-text("Close")', 44, 44);
      
      // Close modal
      await page.locator('button:has-text("Close")').click();
      await expect(page.locator('h2:has-text("Create New Goal")')).not.toBeVisible();
    }
  });
});

test.describe('Cross-Page Responsive Consistency', () => {
  test('Consistent spacing scale across pages', async ({ page }) => {
    const pages = ['/split', '/dashboard/goals'];
    
    for (const pagePath of pages) {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
      
      // Check container padding
      const main = page.locator('main').first();
      const padding = await main.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          left: parseFloat(style.paddingLeft),
          right: parseFloat(style.paddingRight),
        };
      });
      
      // Should use consistent padding (28px at 375px)
      expect(padding.left).toBeGreaterThanOrEqual(24);
      expect(padding.right).toBeGreaterThanOrEqual(24);
    }
  });

  test('Consistent button sizing across pages', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check Split page buttons
    await page.goto('/split');
    await page.waitForLoadState('networkidle');
    
    const splitButton = page.locator('button:has-text("Connect Contract First")');
    const splitBox = await splitButton.boundingBox();
    
    // Check Savings page buttons
    await page.goto('/dashboard/goals');
    await page.waitForLoadState('networkidle');
    
    const savingsButton = page.locator('button:has-text("Add Funds")').first();
    const savingsBox = await savingsButton.boundingBox();
    
    // Both should meet minimum touch target
    if (splitBox && savingsBox) {
      expect(splitBox.height).toBeGreaterThanOrEqual(44);
      expect(savingsBox.height).toBeGreaterThanOrEqual(44);
    }
  });
});
