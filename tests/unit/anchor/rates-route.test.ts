// @vitest-environment node
/**
 * @file tests/unit/anchor/rates-route.test.ts
 * @description Unit tests for app/api/anchor/rates/route.ts covering the four
 * stale-while-revalidate branches required by issue #866.
 *
 * ## Branches under test
 * 1. Fresh cache hit — returns rates without upstream fetch.
 * 2. Expired cache, upstream succeeds — revalidates and returns fresh rates.
 * 3. Expired cache, upstream fails, stale data present — returns stale rates + `stale: true`.
 * 4. Empty cache, upstream fails — returns typed 503 error body.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    setAnchorRatesCache,
    clearAnchorRatesCache,
    RATES_CACHE_TTL_MS,
} from '@/lib/anchor/rates-cache';
import type { RatesSuccessBody, RatesErrorBody } from '@/app/api/anchor/rates/route';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const MOCK_RATES = [
    { sell_asset: 'USD', buy_asset: 'USDC', price: '1.00' },
    { sell_asset: 'EUR', buy_asset: 'USDC', price: '1.08' },
];

const NEW_RATES = [
    { sell_asset: 'USD', buy_asset: 'USDC', price: '1.01' },
];

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/anchor/client', () => ({
    anchorClient: {
        getExchangeRates: vi.fn(),
    },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function callRoute() {
    // Dynamic import ensures mocks are applied before module evaluation.
    const { GET } = await import('@/app/api/anchor/rates/route');
    return GET();
}

async function parseJson<T>(response: Response): Promise<T> {
    return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/anchor/rates — SWR semantics', () => {
    beforeEach(async () => {
        clearAnchorRatesCache();
        vi.resetModules();
        // Re-apply the mock after resetModules so the re-imported route still sees it.
        vi.mock('@/lib/anchor/client', () => ({
            anchorClient: {
                getExchangeRates: vi.fn(),
            },
        }));
    });

    it('Branch 1: returns cached rates immediately when cache is fresh', async () => {
        // Populate a fresh cache (timestamp = now).
        setAnchorRatesCache(MOCK_RATES, Date.now());

        const { anchorClient } = await import('@/lib/anchor/client');
        const response = await callRoute();
        const body = await parseJson<RatesSuccessBody>(response);

        expect(response.status).toBe(200);
        expect(body.stale).toBe(false);
        expect(body.rates).toEqual(MOCK_RATES);
        // Must NOT have called upstream while cache is fresh.
        expect(anchorClient.getExchangeRates).not.toHaveBeenCalled();
    });

    it('Branch 2: revalidates and returns fresh rates when cache is expired', async () => {
        // Set an expired cache entry.
        const staleTs = Date.now() - RATES_CACHE_TTL_MS - 1000;
        setAnchorRatesCache(MOCK_RATES, staleTs);

        const { anchorClient } = await import('@/lib/anchor/client');
        vi.mocked(anchorClient.getExchangeRates).mockResolvedValueOnce(NEW_RATES);

        const response = await callRoute();
        const body = await parseJson<RatesSuccessBody>(response);

        expect(response.status).toBe(200);
        expect(body.stale).toBe(false);
        expect(body.rates).toEqual(NEW_RATES);
        expect(anchorClient.getExchangeRates).toHaveBeenCalledOnce();
    });

    it('Branch 3: returns stale rates with stale:true when cache is expired and upstream fails', async () => {
        // Populate a stale cache.
        const staleTs = Date.now() - RATES_CACHE_TTL_MS - 1000;
        setAnchorRatesCache(MOCK_RATES, staleTs);

        const { anchorClient } = await import('@/lib/anchor/client');
        vi.mocked(anchorClient.getExchangeRates).mockRejectedValueOnce(
            new Error('Anchor API unreachable'),
        );

        const response = await callRoute();
        const body = await parseJson<RatesSuccessBody>(response);

        expect(response.status).toBe(200);
        expect(body.stale).toBe(true);
        expect(body.rates).toEqual(MOCK_RATES);
    });

    it('Branch 4: returns typed 503 error when cache is empty and upstream fails', async () => {
        // Cache is empty (initial state after clearAnchorRatesCache).
        const { anchorClient } = await import('@/lib/anchor/client');
        vi.mocked(anchorClient.getExchangeRates).mockRejectedValueOnce(
            new Error('Anchor API unreachable'),
        );

        const response = await callRoute();
        const body = await parseJson<RatesErrorBody>(response);

        expect(response.status).toBe(503);
        expect(body.error).toBe('Service Unavailable');
        expect(body.code).toBe('UPSTREAM_UNAVAILABLE');
    });
});
