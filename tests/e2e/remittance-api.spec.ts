import { test, expect } from '@playwright/test';

test.describe('Remittance API Simulation', () => {
    
    test('GET /api/remittance/status/[txHash] - should return transaction status', async ({ request }) => {
        // Using a mock hash
        const mockHash = '0000000000000000000000000000000000000000000000000000000000000000';
        const response = await request.get(`/api/remittance/status/${mockHash}`);
        
        console.log(`Status Check - Response Status: ${response.status()}`);
        const data = await response.json();
        console.log(`Status Check - Body: ${JSON.stringify(data)}`);

        expect(response.status()).toBe(200);
        expect(data).toHaveProperty('hash', mockHash);
        expect(data).toHaveProperty('status');
        // It should return 'not_found' for an all-zero hash on Horizon
        expect(['completed', 'failed', 'pending', 'not_found']).toContain(data.status);
    });

    test('GET /api/remittance/history - should return 401 when unauthenticated', async ({ request }) => {
        const response = await request.get('/api/remittance/history');
        
        console.log(`History Check - Response Status: ${response.status()}`);
        
        // Next.js Response throws 401 if requireAuth fails
        expect(response.status()).toBe(401);
        const data = await response.json();
        expect(data.error).toBe('Unauthorized');
    });

    test('Next.js 15 Compatibility - dynamic routes should work', async ({ request }) => {
        // This test ensures that the build fix for async params is working at runtime
        const mockHash = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
        const response = await request.get(`/api/remittance/status/${mockHash}`);
        
        // If it was broken (synchronous params), it would likely throw a 500 error in Next.js 15
        expect(response.status()).not.toBe(500);
    });
});
