import { test, expect } from '@playwright/test';

/**
 * Send Money Wizard End-to-End Tests
 * 
 * Tests verify the complete three-step Send flow:
 * - Step 1: Recipient address with checksum validation gating
 * - Step 2: Amount and currency selection
 * - Step 3: Review and confirmation
 * - Final: Transaction success receipt
 * 
 * Key assertions:
 * - Continue button disabled until valid Stellar address
 * - Progress indicator updates (1 → 2 → 3)
 * - Receipt renders with correct amount/currency after confirm
 */

// Known valid Stellar public key (passes checksum validation)
const VALID_STELLAR_ADDRESS = 'GAFAMILYXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
const INVALID_ADDRESS_SHORT = 'GABC123';
const INVALID_ADDRESS_WRONG_PREFIX = 'MAFAMILYXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
const TEST_AMOUNT = '100';
const TEST_CURRENCY = 'USDC';

test.describe('Send Money Wizard Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/send');
    await page.waitForLoadState('networkidle');
  });

  test('Step 1 - Continue button disabled until valid address', async ({ page }) => {
    // Locate the recipient address input
    const addressInput = page.getByLabel(/recipient address/i);
    const continueButton = page.getByRole('button', { name: /continue to amount/i });

    // Initially, continue button should be disabled
    await expect(continueButton).toBeDisabled();

    // Enter invalid address (too short)
    await addressInput.fill(INVALID_ADDRESS_SHORT);
    await expect(continueButton).toBeDisabled();

    // Enter invalid address (wrong prefix)
    await addressInput.fill(INVALID_ADDRESS_WRONG_PREFIX);
    await expect(continueButton).toBeDisabled();

    // Enter valid Stellar address
    await addressInput.fill(VALID_STELLAR_ADDRESS);
    
    // Wait for validation to complete
    await page.waitForTimeout(100);
    
    // Continue button should now be enabled
    await expect(continueButton).toBeEnabled();
  });

  test('Step 1 - Address validation shows correct feedback', async ({ page }) => {
    const addressInput = page.getByLabel(/recipient address/i);
    
    // Enter invalid address
    await addressInput.fill(INVALID_ADDRESS_SHORT);
    
    // Check for error message
    const errorMessage = page.getByText(/must be 56 characters/i);
    await expect(errorMessage).toBeVisible();

    // Enter valid address
    await addressInput.fill(VALID_STELLAR_ADDRESS);
    await page.waitForTimeout(100);

    // Check for success message
    const successMessage = page.getByText(/checksum verified/i);
    await expect(successMessage).toBeVisible();
  });

  test('Step 1 - Recent recipients populates address', async ({ page }) => {
    const continueButton = page.getByRole('button', { name: /continue to amount/i });
    
    // Click on a recent recipient
    await page.getByRole('button', { name: 'Family' }).click();
    
    // Continue button should be enabled
    await expect(continueButton).toBeEnabled();
    
    // Address should be populated
    const addressInput = page.getByLabel(/recipient address/i);
    await expect(addressInput).toHaveValue(VALID_STELLAR_ADDRESS);
  });

  test('Complete wizard flow - recipient to receipt', async ({ page }) => {
    // Step 1: Recipient Address
    const addressInput = page.getByLabel(/recipient address/i);
    await addressInput.fill(VALID_STELLAR_ADDRESS);
    await page.waitForTimeout(100);

    // Verify step 1 progress indicator is active
    const step1Indicator = page.getByText('Recipient').locator('..').locator('div').first();
    await expect(step1Indicator).toHaveClass(/bg-red-600/);

    // Click Continue to Amount
    const continueButton = page.getByRole('button', { name: /continue to amount/i });
    await continueButton.click();

    // Step 2: Amount and Currency
    // Verify step 2 progress indicator is now active
    const step2Indicator = page.getByText('Amount').locator('..').locator('div').first();
    await expect(step2Indicator).toHaveClass(/bg-red-600/);

    // Enter amount
    const amountInput = page.getByLabel(/amount \(usd\)/i);
    await amountInput.fill(TEST_AMOUNT);

    // Verify currency dropdown exists and select USDC
    const currencySelect = page.getByRole('combobox');
    await expect(currencySelect).toBeVisible();
    await currencySelect.selectOption(TEST_CURRENCY);

    // Click Review Transaction
    const reviewButton = page.getByRole('button', { name: /review transaction/i });
    await reviewButton.click();

    // Step 3: Review
    // Verify step 3 progress indicator is now active
    const step3Indicator = page.getByText('Review').locator('..').locator('div').first();
    await expect(step3Indicator).toHaveClass(/bg-red-600/);

    // Verify review step shows correct recipient and amount
    await expect(page.getByText(VALID_STELLAR_ADDRESS)).toBeVisible();
    await expect(page.getByText(TEST_AMOUNT)).toBeVisible();
    await expect(page.getByText(TEST_CURRENCY)).toBeVisible();

    // Click Confirm & Send
    const confirmButton = page.getByRole('button', { name: /confirm & send remittance/i });
    await confirmButton.click();

    // Verify Transaction Success Receipt appears
    await expect(page.getByText(/transaction successful/i)).toBeVisible();
    await expect(page.getByText(TEST_AMOUNT)).toBeVisible();
    await expect(page.getByText(TEST_CURRENCY)).toBeVisible();
  });

  test('Back navigation - Amount to Recipient', async ({ page }) => {
    // Complete step 1
    const addressInput = page.getByLabel(/recipient address/i);
    await addressInput.fill(VALID_STELLAR_ADDRESS);
    await page.waitForTimeout(100);

    const continueButton = page.getByRole('button', { name: /continue to amount/i });
    await continueButton.click();

    // Verify we're on amount step
    await expect(page.getByLabel(/amount \(usd\)/i)).toBeVisible();

    // Click Back to Recipient
    const backButton = page.getByRole('button', { name: /back to recipient/i });
    await backButton.click();

    // Verify we're back on recipient step
    await expect(addressInput).toBeVisible();
    await expect(addressInput).toHaveValue(VALID_STELLAR_ADDRESS);
  });

  test('Back navigation - Review to Amount', async ({ page }) => {
    // Complete steps 1 and 2
    const addressInput = page.getByLabel(/recipient address/i);
    await addressInput.fill(VALID_STELLAR_ADDRESS);
    await page.waitForTimeout(100);

    await page.getByRole('button', { name: /continue to amount/i }).click();

    const amountInput = page.getByLabel(/amount \(usd\)/i);
    await amountInput.fill(TEST_AMOUNT);

    await page.getByRole('button', { name: /review transaction/i }).click();

    // Verify we're on review step
    await expect(page.getByRole('button', { name: /confirm & send remittance/i })).toBeVisible();

    // Click Back to Amount
    const backButton = page.getByRole('button', { name: /back to amount/i });
    await backButton.click();

    // Verify we're back on amount step
    await expect(amountInput).toBeVisible();
    await expect(amountInput).toHaveValue(TEST_AMOUNT);
  });

  test('Amount validation - minimum and maximum limits', async ({ page }) => {
    // Complete step 1
    const addressInput = page.getByLabel(/recipient address/i);
    await addressInput.fill(VALID_STELLAR_ADDRESS);
    await page.waitForTimeout(100);

    await page.getByRole('button', { name: /continue to amount/i }).click();

    const amountInput = page.getByLabel(/amount \(usd\)/i);
    const reviewButton = page.getByRole('button', { name: /review transaction/i });

    // Test minimum amount
    await amountInput.fill('0.50');
    await expect(page.getByText(/minimum amount is \$1/i)).toBeVisible();
    await expect(reviewButton).toBeDisabled();

    // Test maximum amount
    await amountInput.fill('15000');
    await expect(page.getByText(/maximum amount is \$10,000/i)).toBeVisible();
    await expect(reviewButton).toBeDisabled();

    // Test valid amount
    await amountInput.fill(TEST_AMOUNT);
    await expect(reviewButton).toBeEnabled();
  });

  test('Progress indicator transitions through all steps', async ({ page }) => {
    // Step 1: Verify initial state
    const step1Circle = page.locator('div').filter({ hasText: '1' }).first();
    const step2Circle = page.locator('div').filter({ hasText: '2' }).first();
    const step3Circle = page.locator('div').filter({ hasText: '3' }).first();

    // Step 1 active, others inactive
    await expect(step1Circle).toHaveClass(/bg-red-600/);
    await expect(step2Circle).not.toHaveClass(/bg-red-600/);
    await expect(step3Circle).not.toHaveClass(/bg-red-600/);

    // Move to step 2
    const addressInput = page.getByLabel(/recipient address/i);
    await addressInput.fill(VALID_STELLAR_ADDRESS);
    await page.waitForTimeout(100);
    await page.getByRole('button', { name: /continue to amount/i }).click();

    // Step 2 active, step 1 completed, step 3 inactive
    await expect(step1Circle).not.toHaveClass(/bg-red-600/);
    await expect(step2Circle).toHaveClass(/bg-red-600/);
    await expect(step3Circle).not.toHaveClass(/bg-red-600/);

    // Move to step 3
    const amountInput = page.getByLabel(/amount \(usd\)/i);
    await amountInput.fill(TEST_AMOUNT);
    await page.getByRole('button', { name: /review transaction/i }).click();

    // Step 3 active, steps 1 and 2 completed
    await expect(step1Circle).not.toHaveClass(/bg-red-600/);
    await expect(step2Circle).not.toHaveClass(/bg-red-600/);
    await expect(step3Circle).toHaveClass(/bg-red-600/);
  });

  test('Receipt displays transaction details after confirmation', async ({ page }) => {
    // Complete the full flow
    const addressInput = page.getByLabel(/recipient address/i);
    await addressInput.fill(VALID_STELLAR_ADDRESS);
    await page.waitForTimeout(100);
    await page.getByRole('button', { name: /continue to amount/i }).click();

    const amountInput = page.getByLabel(/amount \(usd\)/i);
    await amountInput.fill(TEST_AMOUNT);
    await page.getByRole('button', { name: /review transaction/i }).click();

    await page.getByRole('button', { name: /confirm & send remittance/i }).click();

    // Wait for receipt to appear
    await page.waitForTimeout(500);

    // Verify receipt contains key information
    await expect(page.getByText(/transaction successful/i)).toBeVisible();
    await expect(page.getByText(TEST_AMOUNT)).toBeVisible();
    await expect(page.getByText(TEST_CURRENCY)).toBeVisible();
    await expect(page.getByText(VALID_STELLAR_ADDRESS)).toBeVisible();
  });

  test('Currency selection persists through flow', async ({ page }) => {
    // Complete step 1
    const addressInput = page.getByLabel(/recipient address/i);
    await addressInput.fill(VALID_STELLAR_ADDRESS);
    await page.waitForTimeout(100);
    await page.getByRole('button', { name: /continue to amount/i }).click();

    // Select XLM
    const currencySelect = page.getByRole('combobox');
    await currencySelect.selectOption('XLM');

    const amountInput = page.getByLabel(/amount \(usd\)/i);
    await amountInput.fill(TEST_AMOUNT);
    await page.getByRole('button', { name: /review transaction/i }).click();

    // Verify currency is shown in review
    await expect(page.getByText('XLM')).toBeVisible();

    // Confirm and check receipt
    await page.getByRole('button', { name: /confirm & send remittance/i }).click();
    await page.waitForTimeout(500);

    await expect(page.getByText('XLM')).toBeVisible();
  });
});
