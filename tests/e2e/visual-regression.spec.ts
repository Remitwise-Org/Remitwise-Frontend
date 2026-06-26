/**
 * Visual Regression Tests — Issue #763
 *
 * Flows covered:
 *   dashboard  — loaded state, error/empty state
 *   send       — recipient step, amount step, review step, sad path (invalid address)
 *   swap(/split)— valid 100 % allocation, invalid over-100 % allocation
 *
 * Viewports tested: 360 × 640, 768 × 1024, 1280 × 800
 *
 * Rules respected:
 *   - No Date.now() / Math.random() — all fixtures are deterministic constants.
 *   - All API calls are intercepted via page.route() — no real network, no real auth.
 *   - Animations / transitions are disabled via `--force-prefers-reduced-motion` and a
 *     forced CSS override so snapshots are stable across runs.
 *   - Test names are assertive: <flow>_matches_snapshot_at_<width>px.
 */

import { test, expect, type Page } from '@playwright/test';

// ---------------------------------------------------------------------------
// Viewport definitions
// ---------------------------------------------------------------------------

const VIEWPORTS = [
  { label: '360px', width: 360, height: 640 },
  { label: '768px', width: 768, height: 1024 },
  { label: '1280px', width: 1280, height: 800 },
] as const;

// ---------------------------------------------------------------------------
// Deterministic fixture data (no Date.now(), no Math.random())
// ---------------------------------------------------------------------------

const DASHBOARD_FIXTURE = {
  remittance: {
    status: 'ok',
    totalSent: 4250.0,
    recentTransactions: [
      { id: 'tx-001', amount: 250, currency: 'USDC', date: '2025-06-01' },
      { id: 'tx-002', amount: 500, currency: 'USDC', date: '2025-06-10' },
      { id: 'tx-003', amount: 100, currency: 'XLM',  date: '2025-06-15' },
      { id: 'tx-004', amount: 400, currency: 'USDC', date: '2025-06-20' },
    ],
  },
  savings: {
    status: 'ok',
    savingsTotal: 1800.0,
    recentGoals: [
      { id: 'goal-001', name: 'Education', target: 5000, current: 1200 },
      { id: 'goal-002', name: 'Emergency',  target: 2000, current: 600  },
    ],
  },
  bills: {
    status: 'ok',
    billsPaidAmount: 320.0,
    billsPaidCount: 4,
  },
  insurance: {
    status: 'ok',
    insurancePremium: 45.0,
    insurancePoliciesCount: 2,
  },
};

/** Deterministic Stellar-format address (56 uppercase alphanumeric chars). */
const VALID_STELLAR_ADDRESS =
  'GBFAMILY0000000000000000000000000000000000000000000000000';

const SEND_SUCCESS_FIXTURE = {
  success: true,
  transactionId: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
};

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/**
 * Disable CSS animations and transitions globally so every screenshot is
 * fully settled even in CI where GPU rasterisation may lag.
 */
async function disableAnimations(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-delay: 0ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        transition-delay: 0ms !important;
      }
    `,
  });
}

/**
 * Wait for the network to idle and all images/fonts to load, then pause
 * briefly so any remaining paint microtasks flush.
 */
async function waitForStable(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  // Give the browser one rAF cycle after the network settles.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
}

/**
 * Mock every API call the dashboard page makes so the snapshot is purely
 * deterministic — no real DB, no real session required.
 */
async function mockDashboardAPIs(page: Page): Promise<void> {
  await page.route('**/api/dashboard', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(DASHBOARD_FIXTURE),
    }),
  );
}

/**
 * Mock the send-flow API so the confirmation step resolves immediately.
 */
async function mockSendAPI(page: Page): Promise<void> {
  await page.route('**/api/send', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(SEND_SUCCESS_FIXTURE),
    }),
  );
}

/**
 * Mock the split/allocation API so /split renders without a real session.
 */
async function mockSplitAPIs(page: Page): Promise<void> {
  await page.route('**/api/split**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, spending: 50, savings: 30, bills: 15, insurance: 5 }),
    }),
  );
}

// ---------------------------------------------------------------------------
// DASHBOARD flow
// ---------------------------------------------------------------------------

for (const vp of VIEWPORTS) {
  test.describe(`Dashboard flow @ ${vp.label}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await mockDashboardAPIs(page);
    });

    test(`dashboard_matches_snapshot_at_${vp.label}`, async ({ page }) => {
      await page.goto('/dashboard');
      await disableAnimations(page);
      await waitForStable(page);

      // Assert the 4 stat cards rendered (happy path)
      await expect(page.locator('[style*="--card"]').first()).toBeVisible();

      await expect(page).toHaveScreenshot(`dashboard-loaded-${vp.label}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`dashboard_error_state_matches_snapshot_at_${vp.label}`, async ({ page }) => {
      // Sad path — dashboard API fails
      await page.unroute('**/api/dashboard');
      await page.route('**/api/dashboard', (route) =>
        route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"server error"}' }),
      );

      await page.goto('/dashboard');
      await disableAnimations(page);
      await waitForStable(page);

      // Confirm error UI is present before snapshotting
      await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();

      await expect(page).toHaveScreenshot(`dashboard-error-${vp.label}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.02,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// SEND flow
// ---------------------------------------------------------------------------

for (const vp of VIEWPORTS) {
  test.describe(`Send flow @ ${vp.label}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await mockSendAPI(page);
    });

    // --- Happy paths ---

    test(`send_step1_recipient_matches_snapshot_at_${vp.label}`, async ({ page }) => {
      await page.goto('/send');
      await disableAnimations(page);
      await waitForStable(page);

      // Confirm we're on step 1
      await expect(page.getByLabel(/recipient address/i)).toBeVisible();

      await expect(page).toHaveScreenshot(`send-step1-${vp.label}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`send_step2_amount_matches_snapshot_at_${vp.label}`, async ({ page }) => {
      await page.goto('/send');
      await disableAnimations(page);
      await waitForStable(page);

      // Advance to step 2
      await page.getByLabel(/recipient address/i).fill(VALID_STELLAR_ADDRESS);
      await page.waitForTimeout(150); // allow validation to settle
      await page.getByRole('button', { name: /continue to amount/i }).click();
      await waitForStable(page);
      await disableAnimations(page);

      await expect(page.getByLabel(/amount/i)).toBeVisible();

      await expect(page).toHaveScreenshot(`send-step2-${vp.label}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.02,
      });
    });

    test(`send_step3_review_matches_snapshot_at_${vp.label}`, async ({ page }) => {
      await page.goto('/send');
      await disableAnimations(page);
      await waitForStable(page);

      // Advance through steps 1 and 2
      await page.getByLabel(/recipient address/i).fill(VALID_STELLAR_ADDRESS);
      await page.waitForTimeout(150);
      await page.getByRole('button', { name: /continue to amount/i }).click();
      await waitForStable(page);

      await page.getByLabel(/amount/i).fill('100');
      await page.getByRole('button', { name: /review transaction/i }).click();
      await waitForStable(page);
      await disableAnimations(page);

      // Confirm review elements are visible before snapshotting
      await expect(page.getByText('Review Transaction')).toBeVisible();

      await expect(page).toHaveScreenshot(`send-step3-${vp.label}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.02,
      });
    });

    // --- Sad path ---

    test(`send_invalid_address_error_matches_snapshot_at_${vp.label}`, async ({ page }) => {
      await page.goto('/send');
      await disableAnimations(page);
      await waitForStable(page);

      // Type a short invalid address to trigger inline validation error
      await page.getByLabel(/recipient address/i).fill('GABC123');
      await page.waitForTimeout(150);
      await disableAnimations(page);

      // Confirm error copy is present
      await expect(page.getByText(/must be 56 characters/i)).toBeVisible();

      await expect(page).toHaveScreenshot(`send-invalid-address-${vp.label}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.02,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// SWAP (split allocation) flow
// ---------------------------------------------------------------------------

for (const vp of VIEWPORTS) {
  test.describe(`Swap/Split flow @ ${vp.label}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await mockSplitAPIs(page);
    });

    // --- Happy path: valid 100 % allocation ---

    test(`swap_valid_allocation_matches_snapshot_at_${vp.label}`, async ({ page }) => {
      await page.goto('/split');
      await disableAnimations(page);
      await waitForStable(page);

      // Set a deterministic 100 % split using the number inputs directly
      await setAllocationViaNumberInputs(page, {
        spending: 40,
        savings: 30,
        bills: 20,
        insurance: 10,
      });
      await page.waitForTimeout(150);
      await disableAnimations(page);

      // Confirm "Ready to submit" is present before snapshotting
      await expect(page.getByText(/ready to submit/i)).toBeVisible();

      await expect(page).toHaveScreenshot(`swap-valid-allocation-${vp.label}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.02,
      });
    });

    // --- Sad path: over-100 % allocation blocked ---

    test(`swap_over100_error_matches_snapshot_at_${vp.label}`, async ({ page }) => {
      await page.goto('/split');
      await disableAnimations(page);
      await waitForStable(page);

      // Set allocations that sum to 130 % — triggers validation guard
      await setAllocationViaNumberInputs(page, {
        spending: 60,
        savings: 40,
        bills: 20,
        insurance: 10,
      });
      await page.waitForTimeout(150);
      await disableAnimations(page);

      // Confirm guard message is visible
      await expect(page.getByText(/total must equal 100%/i)).toBeVisible();

      await expect(page).toHaveScreenshot(`swap-over100-error-${vp.label}.png`, {
        fullPage: false,
        maxDiffPixelRatio: 0.02,
      });
    });
  });
}

// ---------------------------------------------------------------------------
// Helper — set allocation percentages via the number <input> elements, which
// are synchronous and more stable for visual tests than the range sliders.
// ---------------------------------------------------------------------------

async function setAllocationViaNumberInputs(
  page: Page,
  config: { spending: number; savings: number; bills: number; insurance: number },
): Promise<void> {
  const fields = [
    { label: /daily spending/i, value: config.spending },
    { label: /savings/i,        value: config.savings  },
    { label: /bills/i,          value: config.bills    },
    { label: /insurance/i,      value: config.insurance },
  ] as const;

  for (const { label, value } of fields) {
    const input = page.getByRole('spinbutton', { name: label });
    await input.fill(String(value));
    // Blur to trigger React's onChange via the native change event
    await input.evaluate((el: HTMLInputElement) => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
}
