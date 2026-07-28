import { test as base, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

type RtlThemeFixtures = {
  rtlPage: import("@playwright/test").Page;
};

const test = base.extend<RtlThemeFixtures>({
  rtlPage: async ({ page }, use) => {
    // Inject RTL direction
    await page.addInitScript(() => {
      document.documentElement.setAttribute('dir', 'rtl');
    });
    await use(page);
  },
});

const routes = [
  "/dashboard",
  "/send",
  "/split"
];

for (const route of routes) {
  test(`RTL layout has zero axe violations on ${route}`, async ({ rtlPage }) => {
    await rtlPage.goto(route);
    await rtlPage.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page: rtlPage }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);
  });
}
