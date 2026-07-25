import { test, expect } from '@playwright/test';

test.describe('Wallet Connect Flow', () => {
  test('should mock the extension and show success toast on connect', async ({ page }) => {
    // Navigate to a page that contains the WalletButton (e.g., home)
    await page.goto('/');

    // We can inject a mock for the stellar wallet extension if needed, or
    // we can mock the `useWallet` context or intercept window variables.
    // However, if stellar-wallet-kit relies on Freighter, we might need to mock window.freighter.
    await page.addInitScript(() => {
      // Mocking Freighter wallet extension
      (window as any).freighter = {
        isConnected: async () => true,
        getPublicKey: async () => 'GDEMOXQ3D5AFX4K7IQ3XR5ZYQ2H7F4QO2N7F4R6STJHK2QMZ7CNC3',
        signTransaction: async () => 'mocked-signature',
        getNetwork: async () => 'TESTNET'
      };
      (window as any).freighterApi = (window as any).freighter;
    });

    // Click the wallet button
    await page.click('text=Connect Wallet');

    // Wait for the success toast
    // Depending on the exact text of the success toast...
    const toast = page.locator('[role="status"]', { hasText: 'Wallet connected successfully' });
    await expect(toast).toBeVisible({ timeout: 5000 });
  });
});
