import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Every top-level route reachable from the primary nav (see
// components/Nav/PrimaryNav.tsx), plus the public landing page. Unlike
// tests/e2e/nav-a11y.spec.ts (scoped to `nav` only), this scans the whole
// page for every route so regressions outside the nav are caught too.
const ROUTES = [
  "/",
  "/dashboard",
  "/send",
  "/split",
  "/goals",
  "/bills",
  "/insurance",
  "/family",
  "/settings",
  "/transactions",
];

for (const route of ROUTES) {
  test(`${route} has no axe violations (WCAG 2.1 A/AA)`, async ({ page }) => {
    await page.goto(route, { waitUntil: "networkidle" });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const summary = results.violations.map(
      (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) -- ${v.help}`
    );

    expect(results.violations, summary.join("\n")).toEqual([]);
  });
}
