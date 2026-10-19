import { test, expect } from "@playwright/test";

const LANDMARKS = ["banner", "main", "contentinfo"] as const;

const routes = [
  "/",
  "/send",
  "/dashboard",
  "/split",
  "/goals",
  "/bills",
  "/insurance",
  "/family",
  "/settings",
];

for (const route of routes) {
  test(`has exactly one of each required landmark on ${route}`, async ({ page }) => {
    await page.goto(route);

    for (const role of LANDMARKS) {
      await expect(page.getByRole(role)).toHaveCount(1);
    }
  });
}
