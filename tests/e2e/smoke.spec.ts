/**
 * Pre-push smoke test — see .husky/pre-push.
 *
 * Uses Playwright's `request` fixture only (no `page`), so it never launches
 * a browser: just confirms the dev server the webServer config starts is
 * actually up and /api/health returns valid JSON. This is deliberately not a
 * health assertion (`status: "degraded"` is a legitimate response when a
 * dependency like the RPC node is unreachable locally) -- it's a "did the
 * server boot and respond at all" check, fast enough to run on every push.
 */
import { test, expect } from '@playwright/test';

test('dev server responds to /api/health', async ({ request }) => {
  const response = await request.get('/api/health');

  // Any response at all (200 healthy, 503 degraded) proves the server booted
  // and this route executed without throwing -- a connection failure or an
  // unhandled exception is what this test exists to catch.
  expect([200, 503]).toContain(response.status());

  const body = await response.json();
  expect(body).toHaveProperty('status');
  expect(body).toHaveProperty('timestamp');
});
