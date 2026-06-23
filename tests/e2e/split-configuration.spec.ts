import { test, expect, Page } from '@playwright/test';

/**
 * Smart Money Split Configuration — End-to-End Tests
 *
 * Covers the split configuration journey on /split:
 *   - Adjust sliders for spending, savings, bills, insurance
 *   - Live 100%-total validation (over/under guard)
 *   - Save via /api/split/update and /api/split/initialize
 *   - Persisted reload
 *   - Keyboard accessibility for sliders
 *   - Error handling on save failure
 *
 * Why this matters: the split engine is the heart of RemitWise's
 * "smart allocation" pitch. Unit tests cover the math; only an e2e
 * proves the sliders, the live-validation UI, and the save path
 * actually work together in the browser.
 */

// ───────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────

async function authenticate(page: Page) {
  /**
   * Authenticate via the nonce-based challenge-response flow so
   * protected routes (/split, /api/split/*) are reachable.
   */
  const keypair = {
    publicKey: () => 'GAFAMILYXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    sign: (buf: Buffer) => Buffer.from('mock-signature'),
  };
  const address = keypair.publicKey();

  // 1. Fetch nonce
  const nonceRes = await page.request.post('/api/auth/nonce', {
    data: { publicKey: address },
  });
  expect(nonceRes.status()).toBe(200);
  const { nonce } = await nonceRes.json();

  // 2. Sign nonce (mock signature — the test harness accepts it)
  const signature = keypair.sign(Buffer.from(nonce, 'utf8')).toString('base64');

  // 3. Login
  const loginRes = await page.request.post('/api/auth/login', {
    data: { address, message: nonce, signature },
  });
  expect(loginRes.status()).toBe(200);

  // 4. Navigate to split page as authenticated user
  await page.goto('/split');
  await page.waitForLoadState('networkidle');
}

async function getSliderValue(page: Page, label: string): Promise<number> {
  const slider = page.getByRole('slider', { name: new RegExp(label, 'i') });
  return Number(await slider.getAttribute('aria-valuenow'));
}

async function setSliderValue(page: Page, label: string, value: number) {
  const slider = page.getByRole('slider', { name: new RegExp(label, 'i') });
  await slider.evaluate((el: HTMLElement, v: number) => {
    (el as HTMLInputElement).value = String(v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function getTotal(page: Page): Promise<number> {
  const totalEl = page.locator('[aria-label^="Total allocation:"]');
  const text = await totalEl.textContent();
  return Number(text?.replace('%', '').trim());
}

// ───────────────────────────────────────────────────────────
// Test Suite
// ───────────────────────────────────────────────────────────

test.describe('Smart Money Split Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await authenticate(page);
  });

  // ───────────────────────────────────────────────────────
  // 1. Adjust sliders and verify live total
  // ───────────────────────────────────────────────────────

  test('adjust sliders updates live total', async ({ page }) => {
    // Default total should be 100%
    await expect(page.getByText('100%')).toBeVisible();

    // Adjust spending from 50 → 60
    await setSliderValue(page, 'spending', 60);
    await page.waitForTimeout(100);

    // Total should now be 110% (over-100 guard should trigger)
    const total = await getTotal(page);
    expect(total).toBe(110);
  });

  test('single-bucket 100% allocation is valid', async ({ page }) => {
    // Set all sliders to 0 except spending
    await setSliderValue(page, 'spending', 100);
    await setSliderValue(page, 'savings', 0);
    await setSliderValue(page, 'bills', 0);
    await setSliderValue(page, 'insurance', 0);
    await page.waitForTimeout(100);

    const total = await getTotal(page);
    expect(total).toBe(100);

    // Allocation status card should show "Ready to submit"
    await expect(page.getByText(/ready to submit/i)).toBeVisible();

    // Save button should be enabled
    const saveButton = page.getByRole('button', { name: /save allocation/i });
    await expect(saveButton).toBeEnabled();
  });

  // ───────────────────────────────────────────────────────
  // 2. 100% guard — over and under blocked
  // ───────────────────────────────────────────────────────

  test('over-100% blocks save and shows guard', async ({ page }) => {
    // Set total > 100
    await setSliderValue(page, 'spending', 60);
    await setSliderValue(page, 'savings', 40);
    await setSliderValue(page, 'bills', 10);
    await setSliderValue(page, 'insurance', 5);
    await page.waitForTimeout(100);

    const total = await getTotal(page);
    expect(total).toBeGreaterThan(100);

    // Guard message from AllocationStatusCard should be visible
    await expect(page.getByText(/total must equal 100%/i)).toBeVisible();

    // Save button should be disabled
    const saveButton = page.getByRole('button', { name: /save allocation/i });
    await expect(saveButton).toBeDisabled();

    // Card should have red border styling (guard active)
    const statusCard = page.locator('[aria-live="polite"][aria-atomic="true"]');
    await expect(statusCard).toHaveClass(/border-red-500/);
  });

  test('under-100% blocks save and shows guard', async ({ page }) => {
    // Set total < 100
    await setSliderValue(page, 'spending', 30);
    await setSliderValue(page, 'savings', 20);
    await setSliderValue(page, 'bills', 10);
    await setSliderValue(page, 'insurance', 5);
    await page.waitForTimeout(100);

    const total = await getTotal(page);
    expect(total).toBeLessThan(100);

    // Guard message should be visible
    await expect(page.getByText(/total must equal 100%/i)).toBeVisible();

    // Save button disabled
    const saveButton = page.getByRole('button', { name: /save allocation/i });
    await expect(saveButton).toBeDisabled();
  });

  test('exactly 100% enables save and removes guard', async ({ page }) => {
    // Set a valid 100% split
    await setSliderValue(page, 'spending', 40);
    await setSliderValue(page, 'savings', 30);
    await setSliderValue(page, 'bills', 20);
    await setSliderValue(page, 'insurance', 10);
    await page.waitForTimeout(100);

    const total = await getTotal(page);
    expect(total).toBe(100);

    // Guard should NOT be visible
    await expect(page.getByText(/total must equal 100%/i)).not.toBeVisible();

    // "Ready to submit" should be visible
    await expect(page.getByText(/ready to submit/i)).toBeVisible();

    // Save button enabled
    const saveButton = page.getByRole('button', { name: /save allocation/i });
    await expect(saveButton).toBeEnabled();
  });

  // ───────────────────────────────────────────────────────
  // 3. Save and persist via API
  // ───────────────────────────────────────────────────────

  test('save persists via /api/split/update and reloads correctly', async ({ page }) => {
    // Set a valid 100% split
    await setSliderValue(page, 'spending', 35);
    await setSliderValue(page, 'savings', 35);
    await setSliderValue(page, 'bills', 20);
    await setSliderValue(page, 'insurance', 10);
    await page.waitForTimeout(100);

    // Intercept the save request to verify payload
    const updatePromise = page.waitForResponse((resp) =>
      resp.url().includes('/api/split/update') && resp.request().method() === 'POST'
    );

    // Click save
    const saveButton = page.getByRole('button', { name: /save allocation/i });
    await saveButton.click();

    // Verify API response
    const updateResp = await updatePromise;
    expect(updateResp.status()).toBe(200);
    const updateBody = await updateResp.json();
    expect(updateBody.success).toBe(true);
    expect(updateBody).toHaveProperty('xdr');

    // Wait for success toast/confirmation
    await expect(page.getByText(/allocation saved/i)).toBeVisible();

    // Reload and verify persisted values
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('slider', { name: /spending/i })).toHaveAttribute('aria-valuenow', '35');
    await expect(page.getByRole('slider', { name: /savings/i })).toHaveAttribute('aria-valuenow', '35');
    await expect(page.getByRole('slider', { name: /bills/i })).toHaveAttribute('aria-valuenow', '20');
    await expect(page.getByRole('slider', { name: /insurance/i })).toHaveAttribute('aria-valuenow', '10');
  });

  test('save via /api/split/initialize when no prior config exists', async ({ page }) => {
    // Mock the GET /api/split to return 404 (no config)
    await page.route('/api/split', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Split configuration not found' }),
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Set valid split
    await setSliderValue(page, 'spending', 50);
    await setSliderValue(page, 'savings', 25);
    await setSliderValue(page, 'bills', 15);
    await setSliderValue(page, 'insurance', 10);
    await page.waitForTimeout(100);

    // Intercept the initialize request
    const initPromise = page.waitForResponse((resp) =>
      resp.url().includes('/api/split/initialize') && resp.request().method() === 'POST'
    );

    const saveButton = page.getByRole('button', { name: /save allocation/i });
    await saveButton.click();

    const initResp = await initPromise;
    expect(initResp.status()).toBe(200);
    const initBody = await initResp.json();
    expect(initBody.success).toBe(true);
  });

  // ───────────────────────────────────────────────────────
  // 4. Keyboard accessibility
  // ───────────────────────────────────────────────────────

  test('keyboard slider operation adjusts values', async ({ page }) => {
    const spendingSlider = page.getByRole('slider', { name: /spending/i });

    // Focus the slider
    await spendingSlider.focus();

    // Get initial value
    const initialValue = await getSliderValue(page, 'spending');

    // Press ArrowRight to increase
    await spendingSlider.press('ArrowRight');
    await page.waitForTimeout(50);

    const newValue = await getSliderValue(page, 'spending');
    expect(newValue).toBeGreaterThan(initialValue);

    // Press ArrowLeft to decrease
    await spendingSlider.press('ArrowLeft');
    await page.waitForTimeout(50);

    const finalValue = await getSliderValue(page, 'spending');
    expect(finalValue).toBe(initialValue);
  });

  test('keyboard Home/End keys jump to min/max', async ({ page }) => {
    const savingsSlider = page.getByRole('slider', { name: /savings/i });
    await savingsSlider.focus();

    // Home → 0
    await savingsSlider.press('Home');
    await page.waitForTimeout(50);
    await expect(savingsSlider).toHaveAttribute('aria-valuenow', '0');

    // End → 100
    await savingsSlider.press('End');
    await page.waitForTimeout(50);
    await expect(savingsSlider).toHaveAttribute('aria-valuenow', '100');
  });

  test('keyboard Tab navigates between sliders and save button', async ({ page }) => {
    // Tab from spending to savings
    await page.getByRole('slider', { name: /spending/i }).focus();
    await page.keyboard.press('Tab');
    await expect(page.getByRole('slider', { name: /savings/i })).toBeFocused();

    // Tab through bills, insurance, then to save button
    await page.keyboard.press('Tab');
    await expect(page.getByRole('slider', { name: /bills/i })).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.getByRole('slider', { name: /insurance/i })).toBeFocused();

    await page.keyboard.press('Tab');
    const saveButton = page.getByRole('button', { name: /save allocation/i });
    await expect(saveButton).toBeFocused();
  });

  // ───────────────────────────────────────────────────────
  // 5. Error handling
  // ───────────────────────────────────────────────────────

  test('shows error toast when save API returns 500', async ({ page }) => {
    // Set valid split
    await setSliderValue(page, 'spending', 40);
    await setSliderValue(page, 'savings', 30);
    await setSliderValue(page, 'bills', 20);
    await setSliderValue(page, 'insurance', 10);
    await page.waitForTimeout(100);

    // Mock the update endpoint to fail
    await page.route('/api/split/update', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Contract simulation failed' }),
      });
    });

    const saveButton = page.getByRole('button', { name: /save allocation/i });
    await saveButton.click();

    // Error message should surface
    await expect(page.getByText(/contract simulation failed/i)).toBeVisible();
  });

  test('shows error toast when save API returns 400 (validation)', async ({ page }) => {
    // Set valid split
    await setSliderValue(page, 'spending', 40);
    await setSliderValue(page, 'savings', 30);
    await setSliderValue(page, 'bills', 20);
    await setSliderValue(page, 'insurance', 10);
    await page.waitForTimeout(100);

    // Mock validation error
    await page.route('/api/split/update', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Percentages must sum to 100' }),
      });
    });

    const saveButton = page.getByRole('button', { name: /save allocation/i });
    await saveButton.click();

    await expect(page.getByText(/percentages must sum to 100/i)).toBeVisible();
  });

  test('shows error toast when save API returns 401 (unauthenticated)', async ({ page }) => {
    // Set valid split
    await setSliderValue(page, 'spending', 40);
    await setSliderValue(page, 'savings', 30);
    await setSliderValue(page, 'bills', 20);
    await setSliderValue(page, 'insurance', 10);
    await page.waitForTimeout(100);

    // Mock auth error
    await page.route('/api/split/update', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Unauthorized' }),
      });
    });

    const saveButton = page.getByRole('button', { name: /save allocation/i });
    await saveButton.click();

    await expect(page.getByText(/unauthorized/i)).toBeVisible();
  });

  // ───────────────────────────────────────────────────────
  // 6. Edge cases
  // ───────────────────────────────────────────────────────

  test('all-buckets-zero is under-100 and blocked', async ({ page }) => {
    await setSliderValue(page, 'spending', 0);
    await setSliderValue(page, 'savings', 0);
    await setSliderValue(page, 'bills', 0);
    await setSliderValue(page, 'insurance', 0);
    await page.waitForTimeout(100);

    const total = await getTotal(page);
    expect(total).toBe(0);

    const saveButton = page.getByRole('button', { name: /save allocation/i });
    await expect(saveButton).toBeDisabled();
  });

  test('all-buckets-25 is exactly 100 and valid', async ({ page }) => {
    await setSliderValue(page, 'spending', 25);
    await setSliderValue(page, 'savings', 25);
    await setSliderValue(page, 'bills', 25);
    await setSliderValue(page, 'insurance', 25);
    await page.waitForTimeout(100);

    const total = await getTotal(page);
    expect(total).toBe(100);

    const saveButton = page.getByRole('button', { name: /save allocation/i });
    await expect(saveButton).toBeEnabled();
  });

  test('cancel button resets to initial values', async ({ page }) => {
    // Note initial values (default: 50, 30, 15, 5)
    await setSliderValue(page, 'spending', 70);
    await setSliderValue(page, 'savings', 10);
    await setSliderValue(page, 'bills', 10);
    await setSliderValue(page, 'insurance', 10);
    await page.waitForTimeout(100);

    // Click cancel
    const cancelButton = page.getByRole('button', { name: /cancel/i });
    await cancelButton.click();

    // Values should reset to defaults
    await expect(page.getByRole('slider', { name: /spending/i })).toHaveAttribute('aria-valuenow', '50');
    await expect(page.getByRole('slider', { name: /savings/i })).toHaveAttribute('aria-valuenow', '30');
    await expect(page.getByRole('slider', { name: /bills/i })).toHaveAttribute('aria-valuenow', '15');
    await expect(page.getByRole('slider', { name: /insurance/i })).toHaveAttribute('aria-valuenow', '5');
  });
});