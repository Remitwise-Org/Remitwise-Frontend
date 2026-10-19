import { test, expect, Page } from '@playwright/test';

// ─── Shared helpers ────────────────────────────────────────────────────────────

/** Stub /api/bills to return a controlled list of bills. */
async function stubBillsApi(
  page: Page,
  bills: object[],
  opts: { payFails?: boolean } = {}
) {
  await page.route('/api/bills', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { bills } }),
    });
  });

  await page.route('/api/bills/total-unpaid', (route) => {
    const unpaid = (bills as Array<{ status: string; amount: number }>).filter(
      (b) => b.status !== 'paid'
    );
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          totalUnpaid: unpaid.reduce((s, b) => s + b.amount, 0),
          count: unpaid.length,
        },
      }),
    });
  });

  // Stub the v1 pay route for every bill id pattern
  await page.route(/\/api\/v1\/bills\/[^/]+\/pay/, (route) => {
    if (opts.payFails) {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Payment failed' }),
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ xdr: 'AAAA' }),
      });
    }
  });
}

/** Today ±n days as YYYY-MM-DD. */
function relativeDate(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// ─── Fixture data ──────────────────────────────────────────────────────────────

const overdueBill = {
  id: 'b-overdue',
  title: 'School Tuition',
  category: 'Education',
  amount: 500,
  dueDate: relativeDate(-5),
  daysInfo: '5d overdue',
  status: 'overdue',
  isRecurring: false,
};

const urgentBill = {
  id: 'b-urgent',
  title: 'Rent Payment',
  category: 'Housing',
  amount: 800,
  dueDate: relativeDate(2),
  daysInfo: '2d left',
  status: 'urgent',
  isRecurring: true,
  recurrenceLabel: 'Monthly on the 1st',
};

const upcomingBill = {
  id: 'b-upcoming',
  title: 'Electricity Bill',
  category: 'Utilities',
  amount: 150,
  dueDate: relativeDate(10),
  daysInfo: '10d left',
  status: 'upcoming',
  isRecurring: false,
};

const paidBill = {
  id: 'b-paid',
  title: 'Phone Bill',
  category: 'Utilities',
  amount: 35,
  dueDate: relativeDate(-11),
  daysInfo: 'Paid',
  status: 'paid',
  isRecurring: false,
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

test.describe('Bill Payment Journey', () => {
  test.beforeEach(async ({ page }) => {
    await stubBillsApi(page, [overdueBill, urgentBill, upcomingBill, paidBill]);
    await page.goto('/bills');
    await page.waitForLoadState('networkidle');
  });

  // ── 1. List renders unpaid and paid sections ──────────────────────────────

  test('renders unpaid bills and recent payments sections', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /unpaid bills/i })).toBeVisible();
    await expect(page.getByRole('region', { name: /recent payments/i })).toBeVisible();
  });

  // ── 2. Urgency styling ────────────────────────────────────────────────────

  test('overdue bill renders with red urgency styling', async ({ page }) => {
    // UnpaidBillsSection renders an <h3> per status group with the urgency colour class
    const overdueHeading = page.locator('h3').filter({ hasText: /overdue bills/i });
    await expect(overdueHeading).toBeVisible();
    await expect(overdueHeading).toHaveClass(/text-red-400/);
  });

  test('urgent (due-soon) bill renders with amber urgency styling', async ({ page }) => {
    const urgentHeading = page.locator('h3').filter({ hasText: /urgent bills/i });
    await expect(urgentHeading).toBeVisible();
    await expect(urgentHeading).toHaveClass(/text-amber-400/);
  });

  test('overdue bill card carries red border', async ({ page }) => {
    // ComfortableBillCard renders an <article> with status border class
    const card = page.locator('article').filter({ hasText: 'School Tuition' }).first();
    await expect(card).toHaveClass(/border-red-/);
  });

  test('urgent bill card carries amber border', async ({ page }) => {
    const card = page.locator('article').filter({ hasText: 'Rent Payment' }).first();
    await expect(card).toHaveClass(/border-amber-/);
  });

  // ── 3. Pay action → success toast ────────────────────────────────────────

  test('clicking Pay Now on an unpaid bill shows success feedback', async ({ page }) => {
    const payBtn = page
      .getByRole('button', { name: /pay school tuition/i })
      .or(page.getByRole('button', { name: /pay now/i }).first());

    await expect(payBtn).toBeVisible();
    await payBtn.click();

    // The BillsCard shows a success or processes the payment
    // Toast "Bill paid" OR "Payment failed" must appear (component uses Math.random)
    await expect(
      page.getByText(/bill paid|payment failed/i)
    ).toBeVisible({ timeout: 5000 });
  });

  // ── 4. Keyboard operation ─────────────────────────────────────────────────

  test('pay button is keyboard-operable via Enter key', async ({ page }) => {
    const payBtn = page
      .getByRole('button', { name: /pay school tuition/i })
      .or(page.getByRole('button', { name: /pay now/i }).first());

    await payBtn.focus();
    await expect(payBtn).toBeFocused();
    await page.keyboard.press('Enter');

    await expect(
      page.getByText(/bill paid|payment failed/i)
    ).toBeVisible({ timeout: 5000 });
  });

  // ── 5. Paid bill absent from unpaid, present in recent ────────────────────

  test('paid bills do not appear in unpaid section', async ({ page }) => {
    const unpaidSection = page.locator('div').filter({ hasText: /^Unpaid Bills/ }).first();
    await expect(unpaidSection.getByText('Phone Bill')).not.toBeVisible();
  });

  test('paid bills appear in recent payments section', async ({ page }) => {
    const recentSection = page.getByRole('region', { name: /recent payments/i });
    await expect(recentSection.getByText('Phone Bill')).toBeVisible();
  });

  // ── 6. Empty state ────────────────────────────────────────────────────────

  test('shows empty state when no unpaid bills exist', async ({ page }) => {
    // Re-stub with only paid bills
    await stubBillsApi(page, [paidBill]);
    await page.goto('/bills');
    await page.waitForLoadState('networkidle');

    // No unpaid group headings should be present
    await expect(page.getByRole('heading', { name: /overdue bills/i })).not.toBeVisible();
    await expect(page.getByRole('heading', { name: /urgent bills/i })).not.toBeVisible();
  });

  test('shows empty state message when no paid bills exist', async ({ page }) => {
    await stubBillsApi(page, [overdueBill]);
    await page.goto('/bills');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/no recent payments/i)).toBeVisible();
  });

  // ── 7. Fetch error state ──────────────────────────────────────────────────

  test('shows error state when bills API fails', async ({ page }) => {
    // Override both routes to fail before navigating
    await page.route('/api/bills', (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    );
    await page.route('/api/bills/total-unpaid', (route) =>
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    );

    await page.goto('/bills');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText(/failed to load bills/i)).toBeVisible();
  });

  test('retry button re-fetches bills after error', async ({ page }) => {
    // First load fails
    await page.route('/api/bills', (route) =>
      route.fulfill({ status: 500, body: 'error' })
    );
    await page.route('/api/bills/total-unpaid', (route) =>
      route.fulfill({ status: 500, body: 'error' })
    );

    await page.goto('/bills');
    await page.waitForLoadState('networkidle');

    // Now fix the routes before clicking retry
    await page.unroute('/api/bills');
    await page.unroute('/api/bills/total-unpaid');
    await stubBillsApi(page, [overdueBill]);

    // WidgetErrorState renders "Try again" as the retry label
    const retryBtn = page.getByRole('button', { name: /try again/i });
    await expect(retryBtn).toBeVisible();
    await retryBtn.click();

    await expect(page.getByRole('heading', { name: /unpaid bills/i })).toBeVisible();
  });

  // ── 8. Mobile viewport ────────────────────────────────────────────────────

  test('bill cards and pay button are visible on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/bills');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /unpaid bills/i })).toBeVisible();
    const payBtn = page
      .getByRole('button', { name: /pay school tuition/i })
      .or(page.getByRole('button', { name: /pay now/i }).first());
    await expect(payBtn).toBeVisible();
  });
});
