import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests/e2e',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    extraHTTPHeaders: {
      'x-playwright-test': 'true',
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,

    // Ensure correct working directory in CI
    cwd: path.resolve(__dirname),

    // 🔥 Critical: Inject required environment variables for CI
    env: {
      DATABASE_URL: 'file:./ci.db', // Required for Prisma in CI
      SESSION_PASSWORD:
        'supersecurelongsessionpasswordatleast32characters!!',
      AUTH_SECRET: 'ci-test-secret',

      // Optional but safe defaults for tests
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      STELLAR_NETWORK: 'testnet',
      SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
    },
  },
});