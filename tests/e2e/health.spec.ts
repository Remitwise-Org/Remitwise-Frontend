import { test, expect } from '@playwright/test';

test.describe('Health Check API', () => {
    test('should return system status and dependency connectivity', async ({ request }) => {
        // Request the health check endpoint using the request context directly
        const response = await request.get('/api/health');
        
        console.log(`Status: ${response.status()}`);
        const data = await response.json();
        console.log(`Body: ${JSON.stringify(data)}`);

        // The endpoint returns 200 if healthy, or 503 if a critical dependency (DB/RPC) is down
        expect([200, 503]).toContain(response.status());
        
        // Verify response shape
        expect(data).toHaveProperty('status');
        expect(data).toHaveProperty('database');
        expect(data).toHaveProperty('rpc');
        expect(data).toHaveProperty('anchor');

        // Anchor is non-critical but must report a real, typed status:
        // 'ok' (configured + reachable), 'error' (configured + unreachable),
        // or 'not_configured' (ANCHOR_PLATFORM_URL unset) — never a fake
        // reachable: true. This holds regardless of whether the anchor URL is
        // configured in the current test environment.
        expect(data.anchor).toHaveProperty('status');
        expect(['ok', 'error', 'not_configured']).toContain(data.anchor.status);
        expect(typeof data.anchor.reachable).toBe('boolean');

        // reachable must be consistent with the reported status.
        if (data.anchor.status === 'ok') {
            expect(data.anchor.reachable).toBe(true);
        } else {
            expect(data.anchor.reachable).toBe(false);
        }

        // A non-ok anchor must NOT, on its own, fail the whole health check.
        if (data.database.reachable && data.rpc.reachable) {
            expect(response.status()).toBe(200);
        }
    });
});
