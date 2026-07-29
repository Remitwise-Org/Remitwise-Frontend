import { defineConfig } from '@playwright/test';
import path from 'path';

/**
 * Dedicated config for the pre-push smoke test (see .husky/pre-push).
 *
 * Deliberately separate from playwright.config.ts: that config's webServer
 * readiness check polls `/` (the root page), which is unrelated to what the
 * smoke test needs to verify and can fail for reasons that have nothing to
 * do with whether the server itself booted. This config points readiness at
 * /api/health instead, so the smoke test only depends on the one thing it's
 * actually checking.
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/smoke.spec.ts',

  retries: 0,
  reporter: [['dot']],

  use: {
    baseURL: 'http://localhost:3000',
  },

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/api/health',
    reuseExistingServer: !process.env.CI,
    timeout: 60 * 1000,
    cwd: path.resolve(__dirname),
    env: {
      DATABASE_URL: `file:${path.resolve(__dirname, 'prisma/ci.db')}`,
      SESSION_PASSWORD: 'supersecurelongsessionpasswordatleast32characters!!',
      AUTH_SECRET: 'ci-test-secret',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      STELLAR_NETWORK: 'testnet',
      SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
    },
  },
});
