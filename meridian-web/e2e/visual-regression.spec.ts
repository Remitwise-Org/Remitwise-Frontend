import { test, expect } from '@playwright/test';

/**
 * Visual-regression snapshot tests.
 *
 * These capture full-page screenshots at key breakpoints and compare them
 * against approved baselines stored in `e2e/snapshots/`.  A diff is raised
 * when the rendered output deviates — catch unintended layout, colour, or
 * content regressions during code review.
 *
 * Run with `--update-snapshots` to accept new/changed baselines:
 *   npx playwright test --update-snapshots
 *
 * ═══════════════════════════════════════════════════════════════════════
 *  NOTE — First run will CREATE baselines; subsequent runs compare.
 *  Commit the generated `e2e/snaphots/` directory alongside code changes.
 * ═══════════════════════════════════════════════════════════════════════
 */

const VIEWPORTS = {
  mobile: { width: 375, height: 812 },   // iPhone X
  desktop: { width: 1440, height: 900 },
} as const;

test.describe('Visual-regression: Homepage', () => {
  for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    test(`matches the saved snapshot at ${label} — light mode`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Ensure hero animation has settled (CSS-only, so a short wait is enough)
      await page.waitForTimeout(1500);

      await expect(page).toHaveScreenshot(`homepage-${label}-light.png`, {
        fullPage: true,
        // Allow minor anti-aliasing differences across runs
        threshold: 0.02,
      });
    });

    test(`matches the saved snapshot at ${label} — dark mode`, async ({ page }) => {
      await page.setViewportSize(viewport);
      // Switch to dark mode before navigation so there is no flash
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('meridian-theme', 'dark');
      });
      await page.waitForTimeout(800);

      await expect(page).toHaveScreenshot(`homepage-${label}-dark.png`, {
        fullPage: true,
        threshold: 0.02,
      });
    });
  }
});

test.describe('Visual-regression: Dashboard', () => {
  for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    test(`matches the saved snapshot at ${label} — light mode`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      // Let Recharts animations settle
      await page.waitForTimeout(2000);

      await expect(page).toHaveScreenshot(`dashboard-${label}-light.png`, {
        fullPage: true,
        threshold: 0.02,
      });
    });

    test(`matches the saved snapshot at ${label} — dark mode`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('meridian-theme', 'dark');
      });
      await page.waitForTimeout(2000);

      await expect(page).toHaveScreenshot(`dashboard-${label}-dark.png`, {
        fullPage: true,
        threshold: 0.02,
      });
    });
  }
});



test.describe('Visual-regression: Sign-in page', () => {
  for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    test(`matches the saved snapshot at ${label} — light mode`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/auth/sign-in');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`sign-in-${label}-light.png`, {
        fullPage: true,
        threshold: 0.02,
      });
    });

    test(`matches the saved snapshot at ${label} — dark mode`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/auth/sign-in');
      await page.waitForLoadState('networkidle');
      await page.evaluate(() => {
        document.documentElement.classList.add('dark');
        localStorage.setItem('meridian-theme', 'dark');
      });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot(`sign-in-${label}-dark.png`, {
        fullPage: true,
        threshold: 0.02,
      });
    });
  }
});



test.describe('Visual-regression: 404 page', () => {
  test('matches the saved snapshot for an unknown route — light mode', async ({ page }) => {
    await page.goto('/this-route-definitely-does-not-exist');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('not-found-light.png', {
      fullPage: true,
      threshold: 0.02,
    });
  });

  test('matches the saved snapshot for an unknown route — dark mode', async ({ page }) => {
    await page.goto('/this-route-definitely-does-not-exist');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('meridian-theme', 'dark');
    });
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('not-found-dark.png', {
      fullPage: true,
      threshold: 0.02,
    });
  });
});

test.describe('Visual-regression: Mobile menu open', () => {
  test('matches the saved snapshot with the navigation menu expanded — light mode', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open the mobile hamburger menu
    await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
    await page.waitForTimeout(500); // Allow transition animation

    await expect(page).toHaveScreenshot('mobile-menu-open-light.png', {
      fullPage: false, // Capture only the viewport — the overlay is fixed
      threshold: 0.02,
    });
  });

  test('matches the saved snapshot with the navigation menu expanded — dark mode', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('meridian-theme', 'dark');
    });
    await page.waitForTimeout(300);

    await page.getByRole('button', { name: 'Toggle navigation menu' }).click();
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot('mobile-menu-open-dark.png', {
      fullPage: false,
      threshold: 0.02,
    });
  });
});
