// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    AnchorClient,
    DEFAULT_TIMEOUT_MS,
    MAX_RETRY_ATTEMPTS,
    RETRY_BASE_DELAY_MS,
} from '@/lib/anchor/client';
import {
    getAnchorRatesCache,
    setAnchorRatesCache,
    clearAnchorRatesCache,
    isCacheFresh,
    isCacheStale,
    getCacheAgeMs,
    RATES_CACHE_TTL_MS,
} from '@/lib/anchor/rates-cache';

const MOCK_BASE_URL = 'https://anchor.example.com';
const MOCK_RATES = [
    { sell_asset: 'USD', buy_asset: 'USDC', price: '1.00' },
    { sell_asset: 'EUR', buy_asset: 'USDC', price: '1.08' },
];
const MOCK_QUOTE = {
    price: '1.00',
    sell_amount: '100',
    buy_amount: '100',
    fee: { total: '0.50', asset: 'USDC' },
};

function makeResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function makeClient(options?: { maxRetryAttempts?: number }): AnchorClient {
    process.env.ANCHOR_API_BASE_URL = MOCK_BASE_URL;
    return new AnchorClient(options);
}

describe('AnchorClient', () => {
    let fetchSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        process.env.ANCHOR_API_BASE_URL = MOCK_BASE_URL;
        fetchSpy = vi.spyOn(globalThis, 'fetch');
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
        delete process.env.ANCHOR_API_BASE_URL;
    });

    describe('isConfigured', () => {
        it('returns true when base URL is set', () => {
            expect(makeClient().isConfigured()).toBe(true);
        });

        it('returns false when base URL is not set', () => {
            delete process.env.ANCHOR_API_BASE_URL;
            const client = new AnchorClient();
            expect(client.isConfigured()).toBe(false);
        });
    });

    describe('getExchangeRates — happy path', () => {
        it('returns rates on 200', async () => {
            fetchSpy.mockResolvedValueOnce(makeResponse(200, { rates: MOCK_RATES }));

            const result = await makeClient().getExchangeRates();

            expect(result).toEqual(MOCK_RATES);
            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });

        it('handles bare array response', async () => {
            fetchSpy.mockResolvedValueOnce(makeResponse(200, MOCK_RATES));

            const result = await makeClient().getExchangeRates();

            expect(result).toEqual(MOCK_RATES);
        });

        it('throws when base URL is not configured', async () => {
            delete process.env.ANCHOR_API_BASE_URL;
            const client = new AnchorClient();
            await expect(client.getExchangeRates()).rejects.toThrow('Anchor Base URL not configured');
            expect(fetchSpy).not.toHaveBeenCalled();
        });
    });

    describe('getExchangeRates — retry on transient errors', () => {
        it('retries on 500 and succeeds on second attempt', async () => {
            fetchSpy
                .mockResolvedValueOnce(makeResponse(500, { error: 'internal' }))
                .mockResolvedValueOnce(makeResponse(200, { rates: MOCK_RATES }));

            const promise = makeClient({ maxRetryAttempts: 3 }).getExchangeRates();
            await vi.runAllTimersAsync();
            const result = await promise;

            expect(result).toEqual(MOCK_RATES);
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });

        it('retries on 502 and 503', async () => {
            fetchSpy
                .mockResolvedValueOnce(makeResponse(502, {}))
                .mockResolvedValueOnce(makeResponse(503, {}))
                .mockResolvedValueOnce(makeResponse(200, { rates: MOCK_RATES }));

            const promise = makeClient({ maxRetryAttempts: 3 }).getExchangeRates();
            await vi.runAllTimersAsync();
            const result = await promise;

            expect(result).toEqual(MOCK_RATES);
            expect(fetchSpy).toHaveBeenCalledTimes(3);
        });

        it('retries on network error and succeeds', async () => {
            fetchSpy
                .mockRejectedValueOnce(new TypeError('Network failure'))
                .mockResolvedValueOnce(makeResponse(200, { rates: MOCK_RATES }));

            const promise = makeClient({ maxRetryAttempts: 3 }).getExchangeRates();
            await vi.runAllTimersAsync();
            const result = await promise;

            expect(result).toEqual(MOCK_RATES);
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });

        it('retries on timeout and succeeds', async () => {
            fetchSpy
                .mockRejectedValueOnce(Object.assign(new Error('Request timed out after 5000ms'), { name: 'AbortError' }))
                .mockResolvedValueOnce(makeResponse(200, { rates: MOCK_RATES }));

            const promise = makeClient({ maxRetryAttempts: 3 }).getExchangeRates();
            await vi.runAllTimersAsync();
            const result = await promise;

            expect(result).toEqual(MOCK_RATES);
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('getExchangeRates — max attempts exhausted', () => {
        it('throws after exhausting all retry attempts', async () => {
            fetchSpy.mockResolvedValue(makeResponse(500, { error: 'server error' }));

            const client = makeClient({ maxRetryAttempts: 3 });
            const promise = client.getExchangeRates();
            // Attach rejection handler before advancing timers to avoid unhandled-rejection warnings
            const assertion = expect(promise).rejects.toThrow();
            await vi.runAllTimersAsync();
            await assertion;
            expect(fetchSpy).toHaveBeenCalledTimes(3);
        });

        it('throws after exhausting retries on repeated network errors', async () => {
            fetchSpy.mockRejectedValue(new TypeError('Network failure'));

            const client = makeClient({ maxRetryAttempts: 2 });
            const promise = client.getExchangeRates();
            const assertion = expect(promise).rejects.toThrow('Network failure');
            await vi.runAllTimersAsync();
            await assertion;
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });
    });

    describe('getExchangeRates — 4xx must not retry', () => {
        it('does not retry on 400', async () => {
            fetchSpy.mockResolvedValueOnce(makeResponse(400, { error: 'bad request' }));

            const client = makeClient({ maxRetryAttempts: 3 });
            await expect(client.getExchangeRates()).rejects.toThrow('HTTP 400');
            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });

        it('does not retry on 401', async () => {
            fetchSpy.mockResolvedValueOnce(makeResponse(401, { error: 'unauthorized' }));

            const client = makeClient({ maxRetryAttempts: 3 });
            await expect(client.getExchangeRates()).rejects.toThrow('HTTP 401');
            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });

        it('does not retry on 404', async () => {
            fetchSpy.mockResolvedValueOnce(makeResponse(404, { error: 'not found' }));

            const client = makeClient({ maxRetryAttempts: 3 });
            await expect(client.getExchangeRates()).rejects.toThrow('HTTP 404');
            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });

        it('does not retry on 422', async () => {
            fetchSpy.mockResolvedValueOnce(makeResponse(422, { error: 'unprocessable' }));

            const client = makeClient({ maxRetryAttempts: 3 });
            await expect(client.getExchangeRates()).rejects.toThrow('HTTP 422');
            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('getQuote — retry behaviour', () => {
        it('returns quote on 200', async () => {
            fetchSpy.mockResolvedValueOnce(makeResponse(200, MOCK_QUOTE));

            const result = await makeClient().getQuote({ from: 'USD', to: 'USDC', amount: '100' });

            expect(result).toEqual(MOCK_QUOTE);
        });

        it('retries on 500 and returns quote on retry', async () => {
            fetchSpy
                .mockResolvedValueOnce(makeResponse(500, {}))
                .mockResolvedValueOnce(makeResponse(200, MOCK_QUOTE));

            const promise = makeClient({ maxRetryAttempts: 3 }).getQuote({ from: 'USD', to: 'USDC', amount: '100' });
            await vi.runAllTimersAsync();
            const result = await promise;

            expect(result).toEqual(MOCK_QUOTE);
            expect(fetchSpy).toHaveBeenCalledTimes(2);
        });

        it('does not retry on 400', async () => {
            fetchSpy.mockResolvedValueOnce(makeResponse(400, {}));

            const client = makeClient({ maxRetryAttempts: 3 });
            await expect(client.getQuote({ from: 'USD', to: 'USDC', amount: '100' })).rejects.toThrow('HTTP 400');
            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });

        it('throws when base URL is not configured', async () => {
            delete process.env.ANCHOR_API_BASE_URL;
            const client = new AnchorClient();
            await expect(client.getQuote({ from: 'USD', to: 'USDC', amount: '100' })).rejects.toThrow('Anchor Base URL not configured');
        });
    });

    describe('timeout enforcement', () => {
        it('enforces DEFAULT_TIMEOUT_MS via AbortController', async () => {
            fetchSpy.mockImplementationOnce((_url, options) => {
                const signal = (options as RequestInit).signal as AbortSignal;
                return new Promise((_resolve, reject) => {
                    signal?.addEventListener('abort', () => {
                        reject(Object.assign(new Error('AbortError'), { name: 'AbortError' }));
                    });
                });
            });

            const client = makeClient({ maxRetryAttempts: 1 });
            const promise = client.getExchangeRates();
            const assertion = expect(promise).rejects.toThrow(/timed out/i);
            await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS + 100);
            await assertion;
        });
    });

    describe('backoff delay', () => {
        it('applies exponential backoff between retries', async () => {
            fetchSpy
                .mockResolvedValueOnce(makeResponse(500, {}))
                .mockResolvedValueOnce(makeResponse(500, {}))
                .mockResolvedValueOnce(makeResponse(200, { rates: MOCK_RATES }));

            const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
            const promise = makeClient({ maxRetryAttempts: 3 }).getExchangeRates();
            await vi.runAllTimersAsync();
            await promise;

            const delayCalls = setTimeoutSpy.mock.calls
                .map(([, delay]) => delay as number)
                .filter(d => d !== undefined && d === RETRY_BASE_DELAY_MS || d === RETRY_BASE_DELAY_MS * 2);

            expect(delayCalls.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('startDepositFlow / startWithdrawFlow — no retry', () => {
        it('does not retry deposit flow on 500', async () => {
            fetchSpy.mockResolvedValueOnce(makeResponse(500, 'internal error'));

            const client = makeClient({ maxRetryAttempts: 3 });
            await expect(
                client.startDepositFlow({ amount: '100', currency: 'USD', account: 'G123' })
            ).rejects.toThrow('Anchor flow failed: HTTP 500');

            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });

        it('does not retry withdraw flow on 500', async () => {
            fetchSpy.mockResolvedValueOnce(makeResponse(500, 'error'));

            const client = makeClient({ maxRetryAttempts: 3 });
            await expect(
                client.startWithdrawFlow({ amount: '50', currency: 'EUR', account: 'G456' })
            ).rejects.toThrow('Anchor flow failed: HTTP 500');

            expect(fetchSpy).toHaveBeenCalledTimes(1);
        });

        it('returns flow response on 200', async () => {
            const flowData = { id: 'tx-1', url: 'https://anchor.example.com/interactive' };
            fetchSpy.mockResolvedValueOnce(makeResponse(200, flowData));

            const result = await makeClient().startDepositFlow({ amount: '100', currency: 'USD', account: 'G123' });
            expect(result).toEqual(flowData);
        });
    });
});

describe('AnchorRatesCache', () => {
    beforeEach(() => {
        clearAnchorRatesCache();
    });

    describe('initial state', () => {
        it('has null rates on init', () => {
            expect(getAnchorRatesCache().rates).toBeNull();
        });

        it('isCacheFresh returns false when empty', () => {
            expect(isCacheFresh()).toBe(false);
        });

        it('isCacheStale returns false when empty (no data to be stale)', () => {
            expect(isCacheStale()).toBe(false);
        });

        it('getCacheAgeMs returns null when empty', () => {
            expect(getCacheAgeMs()).toBeNull();
        });
    });

    describe('setAnchorRatesCache', () => {
        it('stores rates and timestamp', () => {
            const now = Date.now();
            setAnchorRatesCache(MOCK_RATES, now);

            const cached = getAnchorRatesCache();
            expect(cached.rates).toEqual(MOCK_RATES);
            expect(cached.timestamp).toBe(now);
        });
    });

    describe('freshness helpers', () => {
        it('isCacheFresh returns true for rates within TTL', () => {
            const now = Date.now();
            setAnchorRatesCache(MOCK_RATES, now);
            expect(isCacheFresh(now + 1000)).toBe(true);
        });

        it('isCacheFresh returns false for rates past TTL', () => {
            const now = Date.now();
            setAnchorRatesCache(MOCK_RATES, now);
            expect(isCacheFresh(now + RATES_CACHE_TTL_MS + 1)).toBe(false);
        });

        it('isCacheStale returns true for rates past TTL', () => {
            const now = Date.now();
            setAnchorRatesCache(MOCK_RATES, now);
            expect(isCacheStale(now + RATES_CACHE_TTL_MS + 1)).toBe(true);
        });

        it('isCacheStale returns false for rates within TTL', () => {
            const now = Date.now();
            setAnchorRatesCache(MOCK_RATES, now);
            expect(isCacheStale(now + 1000)).toBe(false);
        });

        it('getCacheAgeMs returns elapsed time', () => {
            const now = Date.now();
            setAnchorRatesCache(MOCK_RATES, now);
            expect(getCacheAgeMs(now + 30000)).toBe(30000);
        });
    });

    describe('clearAnchorRatesCache', () => {
        it('resets to initial state', () => {
            setAnchorRatesCache(MOCK_RATES, Date.now());
            clearAnchorRatesCache();

            expect(getAnchorRatesCache().rates).toBeNull();
            expect(isCacheFresh()).toBe(false);
            expect(getCacheAgeMs()).toBeNull();
        });
    });

    describe('cache-hit on total anchor failure', () => {
        it('stale cache is detectable after anchor fails', () => {
            const staleTimestamp = Date.now() - RATES_CACHE_TTL_MS - 1000;
            setAnchorRatesCache(MOCK_RATES, staleTimestamp);

            expect(isCacheFresh()).toBe(false);
            expect(isCacheStale()).toBe(true);
            expect(getAnchorRatesCache().rates).toEqual(MOCK_RATES);
        });
    });
});
