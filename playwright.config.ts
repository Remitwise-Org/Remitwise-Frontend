import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { VR_VIEWPORTS } from './tests/e2e/shared-viewports';

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
    // @ts-expect-error reducedMotion is a valid Playwright context option
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
    ...VR_VIEWPORTS.map(({ label, width, height }) => ({
      name: `vr-chromium-${label}`,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width, height },
      },
      testMatch: '**/visual-regression.spec.ts',
    })),
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
      DATABASE_URL: `file:${path.resolve(__dirname, 'prisma/ci.db')}`, // Required for Prisma in CI
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