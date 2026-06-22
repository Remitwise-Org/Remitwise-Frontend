// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AnchorClient, DEFAULT_TIMEOUT_MS } from './client';

const BASE_URL = 'https://anchor.example.test';

const exchangeRates = [
    { sell_asset: 'USD', buy_asset: 'USDC', price: '1.00' },
    { sell_asset: 'EUR', buy_asset: 'USDC', price: '1.08' },
];

const quote = {
    price: '1.00',
    sell_amount: '100',
    buy_amount: '100',
    fee: {
        total: '0.50',
        asset: 'USDC',
    },
};

const flowPayload = {
    amount: '100',
    currency: 'USD',
    account: 'GABC123',
    destination: 'bank-account-1',
};

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function textResponse(body: string, status: number): Response {
    return new Response(body, { status });
}

function client(options?: { maxRetryAttempts?: number }): AnchorClient {
    return new AnchorClient(options);
}

describe('AnchorClient HTTP behavior', () => {
    let fetchMock: ReturnType<typeof vi.fn>;
    let consoleWarn: ReturnType<typeof vi.spyOn>;
    let consoleError: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        process.env.ANCHOR_API_BASE_URL = BASE_URL;
        process.env.ANCHOR_API_KEY = 'test-api-key';
        delete process.env.ANCHOR_DEPOSIT_PATH;
        delete process.env.ANCHOR_WITHDRAW_PATH;
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
        consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        delete process.env.ANCHOR_API_BASE_URL;
        delete process.env.ANCHOR_API_KEY;
        delete process.env.ANCHOR_DEPOSIT_PATH;
        delete process.env.ANCHOR_WITHDRAW_PATH;
    });

    it('parses exchange rates from a wrapped rates response', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({ rates: exchangeRates }));

        await expect(client().getExchangeRates()).resolves.toEqual(exchangeRates);

        expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/rates`, expect.objectContaining({
            signal: expect.any(AbortSignal),
        }));
    });

    it('parses exchange rates from a bare array response', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(exchangeRates));

        await expect(client().getExchangeRates()).resolves.toEqual(exchangeRates);
    });

    it('parses a quote response and sends expected query params', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(quote));

        await expect(client().getQuote({ from: 'USD', to: 'USDC', amount: '100' })).resolves.toEqual(quote);

        const [url] = fetchMock.mock.calls[0];
        expect(String(url)).toBe(`${BASE_URL}/quote?sell_asset=USD&buy_asset=USDC&sell_amount=100`);
    });

    it('surfaces non-2xx exchange rate responses with the status code', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'bad request' }, 400));

        await expect(client({ maxRetryAttempts: 1 }).getExchangeRates()).rejects.toThrow(
            'Failed to fetch rates: HTTP 400',
        );
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(consoleError).toHaveBeenCalledWith(
            'AnchorClient: Error fetching exchange rates:',
            expect.any(Error),
        );
    });

    it('surfaces non-2xx quote responses with the status code', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse({ error: 'bad request' }, 422));

        await expect(client({ maxRetryAttempts: 1 }).getQuote({ from: 'USD', to: 'USDC', amount: '100' })).rejects.toThrow(
            'Failed to fetch quote: HTTP 422',
        );
    });

    it('wraps exchange-rate JSON parse failures with anchor context', async () => {
        fetchMock.mockResolvedValueOnce(new Response('{not json', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        await expect(client().getExchangeRates()).rejects.toThrow(
            /Failed to parse anchor rates response:/,
        );
    });

    it('wraps quote JSON parse failures with anchor context', async () => {
        fetchMock.mockResolvedValueOnce(new Response('{not json', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        await expect(client().getQuote({ from: 'USD', to: 'USDC', amount: '100' })).rejects.toThrow(
            /Failed to parse anchor quote response:/,
        );
    });

    it('aborts a hanging fetch at the default timeout', async () => {
        vi.useFakeTimers();
        fetchMock.mockImplementationOnce((_url: string, options: RequestInit) => {
            const signal = options.signal as AbortSignal;
            return new Promise((_resolve, reject) => {
                signal.addEventListener('abort', () => {
                    reject(new DOMException('The operation was aborted.', 'AbortError'));
                });
            });
        });

        const request = client({ maxRetryAttempts: 1 }).getExchangeRates();
        const assertion = expect(request).rejects.toThrow(`Request timed out after ${DEFAULT_TIMEOUT_MS}ms`);

        await vi.advanceTimersByTimeAsync(DEFAULT_TIMEOUT_MS);
        await assertion;
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('warns and fails fast when the base URL is not configured', async () => {
        delete process.env.ANCHOR_API_BASE_URL;

        const unconfigured = client();

        expect(unconfigured.isConfigured()).toBe(false);
        expect(consoleWarn).toHaveBeenCalledWith('ANCHOR_API_BASE_URL is not set. Anchor API calls may fail.');
        await expect(unconfigured.getExchangeRates()).rejects.toThrow('Anchor Base URL not configured');
        await expect(unconfigured.getQuote({ from: 'USD', to: 'USDC', amount: '100' })).rejects.toThrow(
            'Anchor Base URL not configured',
        );
        await expect(unconfigured.startDepositFlow(flowPayload)).rejects.toThrow('Anchor Base URL not configured');
        await expect(unconfigured.startWithdrawFlow(flowPayload)).rejects.toThrow('Anchor Base URL not configured');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('posts the expected deposit flow body and authorization header', async () => {
        const flowResponse = { id: 'deposit-1', interactive_url: `${BASE_URL}/flow/deposit-1` };
        fetchMock.mockResolvedValueOnce(jsonResponse(flowResponse));

        await expect(client().startDepositFlow(flowPayload)).resolves.toEqual(flowResponse);

        expect(fetchMock).toHaveBeenCalledWith(
            `${BASE_URL}/transactions/deposit/interactive`,
            expect.objectContaining({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer test-api-key',
                },
                body: JSON.stringify(flowPayload),
                signal: expect.any(AbortSignal),
            }),
        );
    });

    it('posts the expected withdraw flow body to the configured path', async () => {
        process.env.ANCHOR_WITHDRAW_PATH = '/custom/withdraw';
        const flowResponse = { transaction_id: 'withdraw-1', url: `${BASE_URL}/flow/withdraw-1` };
        fetchMock.mockResolvedValueOnce(jsonResponse(flowResponse));

        await expect(client().startWithdrawFlow(flowPayload)).resolves.toEqual(flowResponse);

        expect(fetchMock).toHaveBeenCalledWith(
            `${BASE_URL}/custom/withdraw`,
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify(flowPayload),
            }),
        );
    });

    it('propagates flow HTTP errors with status and body detail', async () => {
        fetchMock.mockResolvedValueOnce(textResponse('anchor unavailable', 503));

        await expect(client().startDepositFlow(flowPayload)).rejects.toThrow(
            'Anchor flow failed: HTTP 503 - anchor unavailable',
        );
    });

    it('wraps flow JSON parse failures with anchor context', async () => {
        fetchMock.mockResolvedValueOnce(new Response('{not json', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        }));

        await expect(client().startWithdrawFlow(flowPayload)).rejects.toThrow(
            /Failed to parse anchor flow response:/,
        );
    });

    it('propagates network errors from flow requests', async () => {
        fetchMock.mockRejectedValueOnce(new TypeError('network down'));

        await expect(client().startWithdrawFlow(flowPayload)).rejects.toThrow('network down');
    });
});
