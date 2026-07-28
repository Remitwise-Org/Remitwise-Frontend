import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// ---------------------------------------------------------------------------
// Landing page a11y — axe scan, keyboard navigation, and screen-reader
// landmark verification for the marketing homepage (/).
// ---------------------------------------------------------------------------

test.describe("Landing page (/) accessibility", () => {
  test("has zero axe violations on the main content area", async ({ page }) => {
    await page.goto("/");

    // Wait for the hero section to be visible before scanning
    await page.locator("main").waitFor({ state: "visible" });

    const results = await new AxeBuilder({ page })
      .include("main")
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("has zero axe violations on the FAQ section", async ({ page }) => {
    await page.goto("/");

    // Scroll the FAQ section into view and open one accordion item so axe
    // can inspect the expanded state as well.
    const faqSection = page.locator("section", { hasText: "Frequently Asked" });
    await faqSection.scrollIntoViewIfNeeded();

    const firstFaqButton = faqSection.locator("button").first();
    await firstFaqButton.click();

    // Wait for the answer panel to expand
    await faqSection.locator('[role="region"]').first().waitFor({ state: "visible" });

    const results = await new AxeBuilder({ page })
      .include("main")
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("has footer landmark with contentinfo role", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("FAQ accordion buttons are keyboard-operable", async ({ page }) => {
    await page.goto("/");

    const faqSection = page.locator("section", { hasText: "Frequently Asked" });
    await faqSection.scrollIntoViewIfNeeded();

    const firstButton = faqSection.locator("button").first();

    // Focus the FAQ button directly to test keyboard interaction
    await firstButton.focus();
    await expect(firstButton).toBeFocused();

    // Activate with Enter
    await page.keyboard.press("Enter");
    await expect(firstButton).toHaveAttribute("aria-expanded", "true");

    // The expanded panel should be visible
    await expect(faqSection.locator('[role="region"]').first()).toBeVisible();

    // Collapse with Space
    await page.keyboard.press(" ");
    await expect(firstButton).toHaveAttribute("aria-expanded", "false");

    // Verify panel is hidden after collapse
    await expect(faqSection.locator('[role="region"]').first()).toBeHidden();
  });

  test("CTA buttons are focusable and have accessible names", async ({ page }) => {
    await page.goto("/");

    const sendMoneyLink = page.getByRole("link", { name: /send money/i });
    await expect(sendMoneyLink).toBeVisible();
    await expect(sendMoneyLink).toHaveAttribute("href", "/send");

    const dashboardLink = page.getByRole("link", { name: /view dashboard/i });
    await expect(dashboardLink).toBeVisible();
    await expect(dashboardLink).toHaveAttribute("href", "/dashboard");
  });
});
