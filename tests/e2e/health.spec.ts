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
    });
});
