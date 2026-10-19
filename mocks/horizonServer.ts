import { setupServer } from 'msw/node';
import { horizonHandlers } from './horizonHandlers';

/**
 * Node MSW server for the on-chain read layer. Start it in a test file's
 * `beforeAll`/`afterEach`/`afterAll` (see `tests/unit/horizon-msw.test.ts`
 * for the pattern) rather than globally in `vitest.setup.ts`, so tests that
 * don't touch Horizon aren't affected by an always-on network intercept.
 */
export const horizonServer = setupServer(...horizonHandlers);
