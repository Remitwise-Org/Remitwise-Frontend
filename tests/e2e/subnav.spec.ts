// Closes #875
import { test, expect, type Page } from "@playwright/test";

// The dashboard sub-navigation (components/Nav/SubNav.tsx) renders four tabs.
// Overview special-cases an exact `/dashboard` match; the rest use `startsWith`.
const SUBNAV = 'nav[aria-label="Dashboard sub-navigation"]';

const TABS = [
  { name: "Overview", href: "/dashboard" },
  { name: "Savings Goals", href: "/dashboard/goals" },
  { name: "Insights", href: "/dashboard/insight" },
  { name: "History", href: "/dashboard/transaction-history" },
] as const;

async function activeTab(page: Page) {
  return page.locator(`${SUBNAV} a[aria-current="page"]`);
}

test.describe("Dashboard sub-navigation active state", () => {
  for (const tab of TABS) {
    test(`${tab.href} highlights exactly the "${tab.name}" tab`, async ({
      page,
    }) => {
      await page.goto(tab.href);

      // The sub-nav is present.
      await expect(page.locator(SUBNAV)).toBeVisible();

      // Exactly one tab is active and it carries aria-current="page".
      const active = await activeTab(page);
      await expect(active).toHaveCount(1);
      await expect(active).toHaveAttribute("href", tab.href);
    });
  }

  test("Overview special-case does NOT match deeper /dashboard routes", async ({
    page,
  }) => {
    // On a deep route, Overview (exact `/dashboard`) must not be active;
    // only the deep route's own tab should be.
    await page.goto("/dashboard/insight");

    const active = await activeTab(page);
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute("href", "/dashboard/insight");

    const overview = page.locator(`${SUBNAV} a[href="/dashboard"]`);
    await expect(overview).not.toHaveAttribute("aria-current", "page");
  });

  test("direct deep-link load activates the correct single tab", async ({
    page,
  }) => {
    await page.goto("/dashboard/transaction-history");
    const active = await activeTab(page);
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute("href", "/dashboard/transaction-history");
  });

  test("back/forward navigation keeps the active tab in sync", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(await activeTab(page)).toHaveAttribute("href", "/dashboard");

    // Navigate to Savings Goals via the tab link.
    await page.locator(`${SUBNAV} a[href="/dashboard/goals"]`).click();
    await expect(page).toHaveURL(/\/dashboard\/goals$/);
    let active = await activeTab(page);
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute("href", "/dashboard/goals");

    // Back -> Overview is active again.
    await page.goBack();
    await expect(page).toHaveURL(/\/dashboard$/);
    active = await activeTab(page);
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute("href", "/dashboard");

    // Forward -> Savings Goals active again.
    await page.goForward();
    await expect(page).toHaveURL(/\/dashboard\/goals$/);
    active = await activeTab(page);
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute("href", "/dashboard/goals");
  });
});
