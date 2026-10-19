import { test, expect } from '@playwright/test';

declare global {
  interface Window {
    __UNAUTHORIZED_SCRIPT_RAN?: boolean;
  }
}

test.describe('Content Security Policy', () => {
  test('rejects unauthorized inline scripts and verifies nonce presence', async ({ page }) => {
    const response = await page.goto('/dashboard');
    expect(response).not.toBeNull();

    // Verify CSP header presence and format
    const cspHeader = response!.headers()['content-security-policy'];
    expect(cspHeader).toBeDefined();
    expect(cspHeader).toContain("script-src 'self' 'nonce-");
    expect(cspHeader).not.toMatch(/script-src[^;]*'unsafe-inline'/);

    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Attempt to inject an unauthorized inline script
    await page.evaluate(() => {
      const script = document.createElement('script');
      script.innerHTML = "window.__UNAUTHORIZED_SCRIPT_RAN = true;";
      document.body.appendChild(script);
    });

    await page.waitForTimeout(100);

    // Assert the script did not execute
    const scriptRan = await page.evaluate(() => window.__UNAUTHORIZED_SCRIPT_RAN);
    expect(scriptRan).toBeUndefined();
  });
});
