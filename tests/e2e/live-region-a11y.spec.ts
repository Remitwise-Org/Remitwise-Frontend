import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// ---------------------------------------------------------------------------
// AsyncSubmissionStatus / LiveRegion — zero-violation axe scan on /split,
// covering idle, error, and success states.
// ---------------------------------------------------------------------------

test.describe("LiveRegion (via AsyncSubmissionStatus) on /split", () => {
  test("idle state has zero axe violations", async ({ page }) => {
    await page.goto("/split");
    await page.locator('[role="status"]').first().waitFor({ state: "visible" });

    const results = await new AxeBuilder({ page }).include("main").analyze();
    expect(results.violations).toEqual([]);
  });

  test("error state has zero axe violations and is announced via role=status", async ({ page }) => {
    await page.goto("/split");

    // Push Daily Spending to 60 so the total exceeds 100%, triggering the
    // validation error branch of AsyncSubmissionStatus.
    await page.getByLabel("Daily Spending percentage").fill("60");

    const statusRegion = page.locator('[role="status"]').last();
    await expect(statusRegion).toHaveAttribute("aria-live", "polite");
    await expect(statusRegion).toHaveAttribute("aria-atomic", "true");

    const results = await new AxeBuilder({ page }).include("main").analyze();
    expect(results.violations).toEqual([]);
  });

  test("success state has zero axe violations", async ({ page }) => {
    await page.goto("/split");

    // Default allocation already sums to 100% (DEFAULT_SPLIT_CONFIG) — submit
    // directly to trigger the success branch.
    await page.getByRole("form", { name: "Smart money split configuration" })
      .getByRole("button", { name: /save allocation/i })
      .click();

    await page.locator('[role="status"]').last().getByText(/configuration saved/i).waitFor();

    const results = await new AxeBuilder({ page }).include("main").analyze();
    expect(results.violations).toEqual([]);
  });
});
