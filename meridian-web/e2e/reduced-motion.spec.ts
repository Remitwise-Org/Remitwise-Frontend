import { test, expect } from '@playwright/test';

/**
 * Reduced-motion E2E Tests
 *
 * Verifies that the application respects the user's `prefers-reduced-motion`
 * preference — CSS animations are disabled and no motion-related layout
 * shifts occur.
 */

test.describe('Reduced Motion — Homepage Hero', () => {
  test('CSS hero-fade-up animation is disabled when reduced-motion is preferred', async ({ page }) => {
    // Emulate reduced motion preference before navigation
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    // The hero-fade-up class exists but the `@media (prefers-reduced-motion: reduce)`
    // media query in globals.css should set animation: none on it.
    const hasAnimationNone = await page.evaluate(() => {
      const heroElements = document.querySelectorAll('.hero-fade-up');
      if (heroElements.length === 0) return false;
      const style = window.getComputedStyle(heroElements[0]);
      return style.animation === 'none' || style.animationName === 'none';
    });

    expect(hasAnimationNone).toBe(true);
  });

  test('hero content is still visible with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    // All hero content should be visible despite animations being disabled
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: /Where Real-World Effort Meets/i,
      })
    ).toBeVisible();

    await expect(
      page.getByRole('button', { name: 'Start Focus Session' })
    ).toBeVisible();

    await expect(
      page.getByRole('button', { name: 'Explore Features' })
    ).toBeVisible();
  });
});

test.describe('Reduced Motion — Scroll Animations', () => {
  test('framer-motion respects reduced motion via MotionConfig', async ({ page }) => {
    // The app wraps children in <MotionConfig reducedMotion="user" /> in layout.tsx,
    // which tells framer-motion to respect the OS preference.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Scroll to a lazy section that uses framer-motion whileInView
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // Sections should be visible without animation delay
    const featureSection = page.getByText('Earn by staying focused').first();
    await expect(featureSection).toBeVisible();
  });
});

test.describe('Reduced Motion — Theme Toggle', () => {
  test('theme transition does not cause layout shift with reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Capture layout before theme toggle
    const beforeBox = await page.locator('header').boundingBox();

    // Toggle theme
    await page.getByRole('button', { name: 'Toggle theme' }).click();
    await page.getByRole('menuitemradio', { name: 'Dark' }).click();
    await page.waitForTimeout(300);

    // Header position should remain stable
    const afterBox = await page.locator('header').boundingBox();
    expect(afterBox?.x).toBe(beforeBox?.x);
    expect(afterBox?.y).toBe(beforeBox?.y);
  });
});
