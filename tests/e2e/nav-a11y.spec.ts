import { test as base, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// ---------------------------------------------------------------------------
// darkTheme fixture — activates dark mode via localStorage + CSS class,
// matching the app's client-side theme initialisation in layout.tsx.
// ---------------------------------------------------------------------------
type DarkThemeFixtures = {
  darkThemePage: import("@playwright/test").Page;
};

const test = base.extend<DarkThemeFixtures>({
  darkThemePage: async ({ page }, use) => {
    // 1. Set localStorage *before* any navigation so the theme script in
    //    layout.tsx reads the correct preference on first paint.
    await page.addInitScript(() => {
      localStorage.setItem("theme-preference", "dark");
    });

    // 2. Emulate the OS-level dark colour scheme so
    //    `prefers-color-scheme: dark` media queries also match.
    await page.emulateMedia({ colorScheme: "dark" });

    await use(page);
  },
});

// ---------------------------------------------------------------------------
// Routes under test
// ---------------------------------------------------------------------------
const routes = [
  "/dashboard",
  "/send",
  "/split",
  "/goals",
  "/bills",
  "/insurance",
  "/family",
];

// ---------------------------------------------------------------------------
// 1. Existing: zero-violation axe scan scoped to <nav>
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 2. NEW: color-contrast rule enforced on the darkTheme fixture
//    Uses the custom darkThemePage fixture to guarantee the page renders in
//    dark mode, then runs *only* the color-contrast rule on <nav>.
// ---------------------------------------------------------------------------
for (const route of routes) {
  test(`[darkTheme] nav color-contrast passes on ${route}`, async ({
    darkThemePage,
  }) => {
    await darkThemePage.goto(route);

    // Wait for the nav to be visible and the page to settle
    await darkThemePage.locator("nav").first().waitFor({ state: "visible" });

    const results = await new AxeBuilder({ page: darkThemePage })
      .include("nav")
      .withRules(["color-contrast"])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}