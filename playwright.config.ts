import { defineConfig, devices } from '@playwright/test';
import path from 'path';

// ---------------------------------------------------------------------------
// Visual-regression snapshot update flag.
// Set PLAYWRIGHT_UPDATE_SNAPSHOTS=1 in the environment to regenerate baselines.
// ---------------------------------------------------------------------------
const updateSnapshots = process.env.PLAYWRIGHT_UPDATE_SNAPSHOTS === '1' ? 'all' : 'none';

export default defineConfig({
  testDir: './tests/e2e',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html'],
    // Dot reporter is compact and works well in CI alongside html.
    ['dot'],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    extraHTTPHeaders: {
      'x-playwright-test': 'true',
    },
    // Force reduced-motion so CSS transitions don't pollute snapshots.
    reducedMotion: 'reduce',
    // Consistent colour scheme for snapshot stability.
    colorScheme: 'dark',
  },

  // ---------------------------------------------------------------------------
  // Snapshot configuration
  // ---------------------------------------------------------------------------
  updateSnapshots,
  snapshotPathTemplate:
    '{testDir}/__snapshots__/{testFilePath}/{projectName}/{arg}{ext}',

  projects: [
    // -----------------------------------------------------------------------
    // Functional e2e suite — all spec files except visual-regression.
    // -----------------------------------------------------------------------
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/visual-regression.spec.ts'],
    },

    // -----------------------------------------------------------------------
    // Visual-regression projects — one per target viewport / browser combo.
    // Each project maps to one CI matrix entry so snapshots are isolated and
    // reproducible across runs.
    // -----------------------------------------------------------------------
    {
      name: 'vr-chromium-360',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 360, height: 640 },
      },
      testMatch: '**/visual-regression.spec.ts',
    },
    {
      name: 'vr-chromium-768',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
      },
      testMatch: '**/visual-regression.spec.ts',
    },
    {
      name: 'vr-chromium-1280',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
      testMatch: '**/visual-regression.spec.ts',
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