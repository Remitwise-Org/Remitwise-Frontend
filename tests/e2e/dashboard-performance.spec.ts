// Closes #769
import { test, expect } from '@playwright/test';
import { chromium } from 'playwright-core';
import lighthouse from 'lighthouse';
import { Keypair } from '@stellar/stellar-sdk';
import { assertDashboardPerformanceBudget } from '@/lib/performance/lighthouse-budget';

test.describe('Dashboard performance budget', () => {
  test('dashboard route sustains a 90+ Lighthouse performance score', async ({ request, baseURL }) => {
    if (!baseURL) {
      throw new Error('Playwright baseURL must be configured for Lighthouse auditing.');
    }

    const keypair = Keypair.random();
    const address = keypair.publicKey();
    const nonceResponse = await request.post('/api/auth/nonce', {
      data: { publicKey: address },
    });
    expect(nonceResponse.status()).toBe(200);

    const { nonce } = await nonceResponse.json();
    const signature = keypair.sign(Buffer.from(nonce, 'utf8')).toString('base64');

    const loginResponse = await request.post('/api/auth/login', {
      data: {
        address,
        message: nonce,
        signature,
      },
    });
    expect(loginResponse.status()).toBe(200);

    const setCookieHeader = loginResponse.headers()['set-cookie'];
    expect(setCookieHeader).toBeTruthy();

    const cookieValue = setCookieHeader.split(';', 1)[0];
    const url = new URL('/dashboard', baseURL).toString();

    const result = await lighthouse(url, {
      chromePath: chromium.executablePath(),
      chromeFlags: ['--headless', '--no-sandbox', '--disable-gpu'],
      output: 'json',
      onlyCategories: ['performance'],
      extraHeaders: {
        'x-playwright-test': 'true',
        Cookie: cookieValue,
      },
    });

    const score = result.lhr.categories.performance.score ?? 0;
    const normalizedScore = Math.round(score * 100);
    console.log('Dashboard Lighthouse performance score:', normalizedScore);

    expect(assertDashboardPerformanceBudget(score)).toBe(normalizedScore);
    expect(normalizedScore).toBeGreaterThanOrEqual(90);
  });
});
