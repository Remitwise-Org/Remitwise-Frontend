import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = [
  "/dashboard",
  "/send",
  "/split",
  "/goals",
  "/bills",
  "/insurance",
  "/family",
];

for (const route of routes) {
  test(`navigation has zero axe violations on ${route}`, async ({ page }) => {
    await page.goto(route);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .include("nav")
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test(`active nav item has aria-current=page on ${route}`, async ({ page }) => {
    await page.goto(route);

    const activeLink = page.locator('nav [aria-current="page"]');
    await expect(activeLink).toHaveCount(1);
    await expect(activeLink).toHaveAttribute("href", route);
  });
}