import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for meridian-web e2e tests.
 *
 * The suite runs against a production build (`next build` + `next start`)
 * for stability — dev-mode on-demand compilation causes flaky first-load
 * timeouts. All backend calls are mocked per-test via `page.route()`, so
 * no API server is required. See e2e/README.md for details.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Fail the CI build if test.only is accidentally committed.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      // Mobile-nav specs need a small viewport; they run in mobile-chromium.
      testIgnore: /mobile-nav\.spec\.ts/,
    },
    {
      // Mobile viewport project used by mobile-nav specs.
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'] },
      testMatch: /mobile-nav\.spec\.ts/,
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm start -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
