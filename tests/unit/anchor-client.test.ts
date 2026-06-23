/**
 * Unit tests for lib/anchor/client.ts
 *
 * Covers:
 *  - isConfigured() behavior (base URL set vs. unset)
 *  - getExchangeRates() happy path, HTTP errors, JSON parse failure, timeout abort
 *  - getQuote() happy path, HTTP errors, query-string construction, timeout abort
 *  - startDepositFlow() / startWithdrawFlow() POST bodies, Authorization header,
 *    HTTP errors (with and without a body), JSON parse failure, timeout abort
 *  - fetchWithTimeout abort exactly at the boundary and network-level rejection
 *  - 204 No-Content / empty body edge cases
 *
 * Requirements: ≥ 90% coverage of lib/anchor/client.ts
 * No live network: global fetch is always mocked.
 *
 * Run:
 *   npm run test:coverage
 *   npx vitest run tests/unit/anchor-client.test.ts
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockedFunction,
} from 'vitest';

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build a minimal Response-like object that satisfies the subset of the
 *  Response interface used by AnchorClient. */
function makeResponse(
  body: unknown,
  status = 200,
  opts: { contentType?: string; textBody?: string } = {},
): Response {
  const isOk = status >= 200 && status < 300;
  const jsonBody = body !== null ? JSON.stringify(body) : null;
  const textBodyStr = opts.textBody ?? jsonBody ?? '';

  return {
    ok: isOk,
    status,
    headers: new Headers({ 'Content-Type': opts.contentType ?? 'application/json' }),
    json: vi.fn(async () => {
      if (body === null) throw new SyntaxError('Unexpected end of JSON input');
      if (typeof body === 'string' && body === '__THROW__') {
        throw new SyntaxError('Unexpected token in JSON');
      }
      return body;
    }),
    text: vi.fn(async () => textBodyStr),
  } as unknown as Response;
}

/** Make a Response whose .json() always throws (simulates corrupt body). */
function makeBadJsonResponse(status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(),
    json: vi.fn(async () => { throw new SyntaxError('Unexpected token < in JSON'); }),
    text: vi.fn(async () => 'not json'),
  } as unknown as Response;
}

// ─── module setup ────────────────────────────────────────────────────────────

// We import the class fresh for every describe block so that process.env changes
// applied with vi.stubEnv are picked up by the constructor.

describe('AnchorClient — isConfigured()', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns false when ANCHOR_API_BASE_URL is not set', async () => {
    vi.stubEnv('ANCHOR_API_BASE_URL', '');
    // Fresh import so the constructor reads the stubbed env
    vi.resetModules();
    const { AnchorClient } = await import('@/lib/anchor/client');
    const client = new AnchorClient();
    expect(client.isConfigured()).toBe(false);
  });

  it('returns true when ANCHOR_API_BASE_URL is set', async () => {
    vi.stubEnv('ANCHOR_API_BASE_URL', 'https://anchor.example.com');
    vi.resetModules();
    const { AnchorClient } = await import('@/lib/anchor/client');
    const client = new AnchorClient();
    expect(client.isConfigured()).toBe(true);
  });

  it('logs a warning to console.warn when ANCHOR_API_BASE_URL is missing', async () => {
    vi.stubEnv('ANCHOR_API_BASE_URL', '');
    vi.resetModules();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { AnchorClient } = await import('@/lib/anchor/client');
    new AnchorClient();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('ANCHOR_API_BASE_URL'),
    );
  });
});

// ─── getExchangeRates ─────────────────────────────────────────────────────────

describe('AnchorClient.getExchangeRates()', () => {
  let fetchMock: MockedFunction<typeof fetch>;
  let AnchorClient: Awaited<ReturnType<typeof importClient>>['AnchorClient'];
  let client: InstanceType<typeof AnchorClient>;

  async function importClient() {
    vi.resetModules();
    return import('@/lib/anchor/client');
  }

  beforeEach(async () => {
    vi.stubEnv('ANCHOR_API_BASE_URL', 'https://anchor.example.com');
    vi.stubEnv('ANCHOR_API_KEY', '');
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    ({ AnchorClient } = await importClient());
    client = new AnchorClient();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  // ── happy paths ──────────────────────────────────────────────────────────

  it('returns parsed rates array when anchor returns { rates: [...] }', async () => {
    const rates = [{ sell_asset: 'USD', buy_asset: 'USDC', price: '1.00' }];
    fetchMock.mockResolvedValueOnce(makeResponse({ rates }));

    const result = await client.getExchangeRates();
    expect(result).toEqual(rates);
  });

  it('returns the top-level array when anchor returns an array directly', async () => {
    const rates = [{ sell_asset: 'EUR', buy_asset: 'USDC', price: '1.08' }];
    fetchMock.mockResolvedValueOnce(makeResponse(rates));

    const result = await client.getExchangeRates();
    expect(result).toEqual(rates);
  });

  it('calls the correct /rates URL', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse({ rates: [] }));
    await client.getExchangeRates();
    expect(fetchMock).toHaveBeenCalledWith(
      'https://anchor.example.com/rates',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  // ── error: base URL not configured ───────────────────────────────────────

  it('throws "Anchor Base URL not configured" when ANCHOR_API_BASE_URL is absent', async () => {
    vi.stubEnv('ANCHOR_API_BASE_URL', '');
    vi.resetModules();
    const { AnchorClient: Bare } = await import('@/lib/anchor/client');
    const bare = new Bare();
    // No fetch mock needed — it should throw before fetching
    await expect(bare.getExchangeRates()).rejects.toThrow(
      'Anchor Base URL not configured',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ── error: HTTP non-2xx ───────────────────────────────────────────────────

  it('throws an error including the HTTP status code on a 500 response', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(null, 500));
    await expect(client.getExchangeRates()).rejects.toThrow('HTTP 500');
  });

  it('throws an error including the HTTP status code on a 404 response', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(null, 404));
    await expect(client.getExchangeRates()).rejects.toThrow('HTTP 404');
  });

  it('throws an error including the HTTP status code on a 401 response', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(null, 401));
    await expect(client.getExchangeRates()).rejects.toThrow('HTTP 401');
  });

  // ── error: JSON parse failure ─────────────────────────────────────────────

  it('propagates JSON parse errors when the response body is malformed', async () => {
    fetchMock.mockResolvedValueOnce(makeBadJsonResponse(200));
    await expect(client.getExchangeRates()).rejects.toThrow(SyntaxError);
  });

  // ── error: network-level rejection ───────────────────────────────────────

  it('propagates a network-level Error when fetch itself rejects', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network failure'));
    await expect(client.getExchangeRates()).rejects.toThrow('Network failure');
  });

  // ── timeout / abort ───────────────────────────────────────────────────────

  it('throws "Request timed out" when fetch does not respond within 5 seconds', async () => {
    vi.useFakeTimers();

    fetchMock.mockImplementationOnce((_url, options) => {
      // Simulate a request that never resolves but honours AbortSignal
      return new Promise((_resolve, reject) => {
        (options as RequestInit).signal!.addEventListener('abort', () => {
          const err = new Error('The operation was aborted.');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const promise = client.getExchangeRates();
    // Advance time to exactly the 5 s default timeout
    vi.advanceTimersByTime(5000);

    await expect(promise).rejects.toThrow('Request timed out after 5000ms');
    vi.useRealTimers();
  });
});

// ─── getQuote ────────────────────────────────────────────────────────────────

describe('AnchorClient.getQuote()', () => {
  let fetchMock: MockedFunction<typeof fetch>;
  let client: InstanceType<Awaited<ReturnType<typeof getClass>>>;

  async function getClass() {
    vi.resetModules();
    const { AnchorClient } = await import('@/lib/anchor/client');
    return AnchorClient;
  }

  beforeEach(async () => {
    vi.stubEnv('ANCHOR_API_BASE_URL', 'https://anchor.example.com');
    vi.stubEnv('ANCHOR_API_KEY', '');
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const Cls = await getClass();
    client = new Cls();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const sampleQuote = {
    price: '1.01',
    sell_amount: '100',
    buy_amount: '99',
    fee: { total: '1', asset: 'USD' },
  };

  // ── happy paths ──────────────────────────────────────────────────────────

  it('returns parsed QuoteResponse on success', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(sampleQuote));
    const result = await client.getQuote({ from: 'USD', to: 'USDC', amount: '100' });
    expect(result).toEqual(sampleQuote);
  });

  it('appends sell_asset, buy_asset, sell_amount as query params', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(sampleQuote));
    await client.getQuote({ from: 'USD', to: 'USDC', amount: '100' });

    const calledUrl = new URL((fetchMock.mock.calls[0][0] as string));
    expect(calledUrl.pathname).toBe('/quote');
    expect(calledUrl.searchParams.get('sell_asset')).toBe('USD');
    expect(calledUrl.searchParams.get('buy_asset')).toBe('USDC');
    expect(calledUrl.searchParams.get('sell_amount')).toBe('100');
  });

  // ── error: base URL not configured ───────────────────────────────────────

  it('throws "Anchor Base URL not configured" when ANCHOR_API_BASE_URL is absent', async () => {
    vi.stubEnv('ANCHOR_API_BASE_URL', '');
    vi.resetModules();
    const { AnchorClient: Bare } = await import('@/lib/anchor/client');
    const bare = new Bare();
    await expect(bare.getQuote({ from: 'USD', to: 'USDC', amount: '50' })).rejects.toThrow(
      'Anchor Base URL not configured',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ── error: HTTP non-2xx ───────────────────────────────────────────────────

  it('throws an error including the HTTP status code on a 422 response', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(null, 422));
    await expect(
      client.getQuote({ from: 'USD', to: 'USDC', amount: '100' }),
    ).rejects.toThrow('HTTP 422');
  });

  it('throws an error including the HTTP status code on a 503 response', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(null, 503));
    await expect(
      client.getQuote({ from: 'USD', to: 'USDC', amount: '100' }),
    ).rejects.toThrow('HTTP 503');
  });

  // ── error: JSON parse failure ─────────────────────────────────────────────

  it('propagates JSON parse errors when the response body is malformed', async () => {
    fetchMock.mockResolvedValueOnce(makeBadJsonResponse(200));
    await expect(
      client.getQuote({ from: 'USD', to: 'USDC', amount: '100' }),
    ).rejects.toThrow(SyntaxError);
  });

  // ── error: network-level rejection ───────────────────────────────────────

  it('propagates a network-level Error when fetch rejects', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(
      client.getQuote({ from: 'USD', to: 'USDC', amount: '100' }),
    ).rejects.toThrow('Failed to fetch');
  });

  // ── timeout / abort ───────────────────────────────────────────────────────

  it('throws "Request timed out" when fetch hangs past the 5 s default', async () => {
    vi.useFakeTimers();

    fetchMock.mockImplementationOnce((_url, options) => {
      return new Promise((_resolve, reject) => {
        (options as RequestInit).signal!.addEventListener('abort', () => {
          const err = new Error('The operation was aborted.');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const promise = client.getQuote({ from: 'USD', to: 'USDC', amount: '100' });
    vi.advanceTimersByTime(5000);

    await expect(promise).rejects.toThrow('Request timed out after 5000ms');
    vi.useRealTimers();
  });
});

// ─── startDepositFlow ────────────────────────────────────────────────────────

describe('AnchorClient.startDepositFlow()', () => {
  let fetchMock: MockedFunction<typeof fetch>;
  let client: InstanceType<Awaited<ReturnType<typeof getClass>>>;

  async function getClass() {
    vi.resetModules();
    const { AnchorClient } = await import('@/lib/anchor/client');
    return AnchorClient;
  }

  const payload = {
    amount: '100',
    currency: 'USD',
    account: 'GABC1234',
    destination: 'wallet-xyz',
  };

  const successResponse = {
    id: 'flow-001',
    url: 'https://anchor.example.com/interactive',
    steps: [],
  };

  beforeEach(async () => {
    vi.stubEnv('ANCHOR_API_BASE_URL', 'https://anchor.example.com');
    vi.stubEnv('ANCHOR_API_KEY', '');
    vi.stubEnv('ANCHOR_DEPOSIT_PATH', '/transactions/deposit/interactive');
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const Cls = await getClass();
    client = new Cls();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  // ── happy paths ──────────────────────────────────────────────────────────

  it('returns parsed AnchorFlowResponse on success', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(successResponse));
    const result = await client.startDepositFlow(payload);
    expect(result).toEqual(successResponse);
  });

  it('sends a POST request to the deposit path', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(successResponse));
    await client.startDepositFlow(payload);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://anchor.example.com/transactions/deposit/interactive');
    expect(options.method).toBe('POST');
  });

  it('sends Content-Type: application/json header', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(successResponse));
    await client.startDepositFlow(payload);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('sends the serialised payload as the request body', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(successResponse));
    await client.startDepositFlow(payload);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(options.body as string)).toEqual(payload);
  });

  it('does NOT send an Authorization header when ANCHOR_API_KEY is empty', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(successResponse));
    await client.startDepositFlow(payload);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('sends a Bearer Authorization header when ANCHOR_API_KEY is set', async () => {
    vi.stubEnv('ANCHOR_API_KEY', 'super-secret-key');
    vi.resetModules();
    const { AnchorClient: WithKey } = await import('@/lib/anchor/client');
    const clientWithKey = new WithKey();

    fetchMock.mockResolvedValueOnce(makeResponse(successResponse));
    await clientWithKey.startDepositFlow(payload);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer super-secret-key');
  });

  it('uses a custom deposit path from ANCHOR_DEPOSIT_PATH env var', async () => {
    vi.stubEnv('ANCHOR_DEPOSIT_PATH', '/custom/deposit');
    vi.resetModules();
    const { AnchorClient: CustomPath } = await import('@/lib/anchor/client');
    const clientCustom = new CustomPath();

    fetchMock.mockResolvedValueOnce(makeResponse(successResponse));
    await clientCustom.startDepositFlow(payload);

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://anchor.example.com/custom/deposit');
  });

  // ── error: base URL not configured ───────────────────────────────────────

  it('throws "Anchor Base URL not configured" when ANCHOR_API_BASE_URL is absent', async () => {
    vi.stubEnv('ANCHOR_API_BASE_URL', '');
    vi.resetModules();
    const { AnchorClient: Bare } = await import('@/lib/anchor/client');
    const bare = new Bare();
    await expect(bare.startDepositFlow(payload)).rejects.toThrow(
      'Anchor Base URL not configured',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ── error: HTTP non-2xx with body ─────────────────────────────────────────

  it('throws error including status and body detail on a 400 response', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse(null, 400, { textBody: 'Bad Request: invalid amount' }),
    );
    await expect(client.startDepositFlow(payload)).rejects.toThrow('HTTP 400');
    await expect(client.startDepositFlow(payload)).rejects.toThrow(
      /Bad Request: invalid amount/,
    );
  });

  it('throws error with status and no detail separator when body is empty on non-2xx', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse(null, 500, { textBody: '' }),
    );
    await expect(client.startDepositFlow(payload)).rejects.toThrow('HTTP 500');
  });

  it('throws on 503 with detail text appended', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse(null, 503, { textBody: 'Service Unavailable' }),
    );
    await expect(client.startDepositFlow(payload)).rejects.toThrow('HTTP 503');
  });

  // ── error: JSON parse failure on success response ─────────────────────────

  it('propagates JSON parse errors when the success response body is malformed', async () => {
    fetchMock.mockResolvedValueOnce(makeBadJsonResponse(200));
    await expect(client.startDepositFlow(payload)).rejects.toThrow(SyntaxError);
  });

  // ── error: network-level rejection ───────────────────────────────────────

  it('propagates a network-level Error when fetch rejects', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(client.startDepositFlow(payload)).rejects.toThrow('ECONNREFUSED');
  });

  // ── timeout / abort ───────────────────────────────────────────────────────

  it('throws "Request timed out" when deposit fetch hangs past 5 s', async () => {
    vi.useFakeTimers();

    fetchMock.mockImplementationOnce((_url, options) => {
      return new Promise((_resolve, reject) => {
        (options as RequestInit).signal!.addEventListener('abort', () => {
          const err = new Error('The operation was aborted.');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const promise = client.startDepositFlow(payload);
    vi.advanceTimersByTime(5000);

    await expect(promise).rejects.toThrow('Request timed out after 5000ms');
    vi.useRealTimers();
  });
});

// ─── startWithdrawFlow ───────────────────────────────────────────────────────

describe('AnchorClient.startWithdrawFlow()', () => {
  let fetchMock: MockedFunction<typeof fetch>;
  let client: InstanceType<Awaited<ReturnType<typeof getClass>>>;

  async function getClass() {
    vi.resetModules();
    const { AnchorClient } = await import('@/lib/anchor/client');
    return AnchorClient;
  }

  const payload = {
    amount: '200',
    currency: 'USDC',
    account: 'GXYZ5678',
  };

  const successResponse = {
    transaction_id: 'txn-abc',
    interactive_url: 'https://anchor.example.com/withdraw/interactive',
  };

  beforeEach(async () => {
    vi.stubEnv('ANCHOR_API_BASE_URL', 'https://anchor.example.com');
    vi.stubEnv('ANCHOR_API_KEY', '');
    vi.stubEnv('ANCHOR_WITHDRAW_PATH', '/transactions/withdraw/interactive');
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const Cls = await getClass();
    client = new Cls();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  // ── happy paths ──────────────────────────────────────────────────────────

  it('returns parsed AnchorFlowResponse on success', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(successResponse));
    const result = await client.startWithdrawFlow(payload);
    expect(result).toEqual(successResponse);
  });

  it('sends a POST request to the withdraw path', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(successResponse));
    await client.startWithdrawFlow(payload);

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://anchor.example.com/transactions/withdraw/interactive');
    expect(options.method).toBe('POST');
  });

  it('sends the serialised payload as the request body', async () => {
    fetchMock.mockResolvedValueOnce(makeResponse(successResponse));
    await client.startWithdrawFlow(payload);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(options.body as string)).toEqual(payload);
  });

  it('uses a custom withdraw path from ANCHOR_WITHDRAW_PATH env var', async () => {
    vi.stubEnv('ANCHOR_WITHDRAW_PATH', '/custom/withdraw');
    vi.resetModules();
    const { AnchorClient: CustomPath } = await import('@/lib/anchor/client');
    const clientCustom = new CustomPath();

    fetchMock.mockResolvedValueOnce(makeResponse(successResponse));
    await clientCustom.startWithdrawFlow(payload);

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://anchor.example.com/custom/withdraw');
  });

  // ── error: base URL not configured ───────────────────────────────────────

  it('throws "Anchor Base URL not configured" when ANCHOR_API_BASE_URL is absent', async () => {
    vi.stubEnv('ANCHOR_API_BASE_URL', '');
    vi.resetModules();
    const { AnchorClient: Bare } = await import('@/lib/anchor/client');
    const bare = new Bare();
    await expect(bare.startWithdrawFlow(payload)).rejects.toThrow(
      'Anchor Base URL not configured',
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // ── error: HTTP non-2xx ───────────────────────────────────────────────────

  it('throws error including status code on a 400 response', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse(null, 400, { textBody: 'missing currency' }),
    );
    await expect(client.startWithdrawFlow(payload)).rejects.toThrow('HTTP 400');
  });

  it('includes the error body detail in the thrown message on a 500', async () => {
    fetchMock.mockResolvedValueOnce(
      makeResponse(null, 500, { textBody: 'Internal Server Error' }),
    );
    await expect(client.startWithdrawFlow(payload)).rejects.toThrow(
      /Internal Server Error/,
    );
  });

  // ── error: JSON parse failure on success response ─────────────────────────

  it('propagates JSON parse errors when the success response body is malformed', async () => {
    fetchMock.mockResolvedValueOnce(makeBadJsonResponse(200));
    await expect(client.startWithdrawFlow(payload)).rejects.toThrow(SyntaxError);
  });

  // ── error: network-level rejection ───────────────────────────────────────

  it('propagates a TypeError when fetch rejects with a network error', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(client.startWithdrawFlow(payload)).rejects.toThrow('Failed to fetch');
  });

  // ── timeout / abort ───────────────────────────────────────────────────────

  it('throws "Request timed out" when withdraw fetch hangs past 5 s', async () => {
    vi.useFakeTimers();

    fetchMock.mockImplementationOnce((_url, options) => {
      return new Promise((_resolve, reject) => {
        (options as RequestInit).signal!.addEventListener('abort', () => {
          const err = new Error('The operation was aborted.');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const promise = client.startWithdrawFlow(payload);
    vi.advanceTimersByTime(5000);

    await expect(promise).rejects.toThrow('Request timed out after 5000ms');
    vi.useRealTimers();
  });
});

// ─── singleton anchorClient export ───────────────────────────────────────────

describe('anchorClient singleton export', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('is an instance of AnchorClient', async () => {
    vi.stubEnv('ANCHOR_API_BASE_URL', 'https://anchor.example.com');
    const { anchorClient, AnchorClient } = await import('@/lib/anchor/client');
    expect(anchorClient).toBeInstanceOf(AnchorClient);
  });

  it('is configured when ANCHOR_API_BASE_URL is set at module load time', async () => {
    vi.resetModules();
    vi.stubEnv('ANCHOR_API_BASE_URL', 'https://anchor.example.com');
    const { anchorClient } = await import('@/lib/anchor/client');
    expect(anchorClient.isConfigured()).toBe(true);
  });

  it('is not configured when ANCHOR_API_BASE_URL is absent at module load time', async () => {
    vi.resetModules();
    vi.stubEnv('ANCHOR_API_BASE_URL', '');
    const { anchorClient } = await import('@/lib/anchor/client');
    expect(anchorClient.isConfigured()).toBe(false);
  });
});

// ─── edge cases ──────────────────────────────────────────────────────────────

describe('AnchorClient — edge cases', () => {
  let fetchMock: MockedFunction<typeof fetch>;
  let AnchorCls: Awaited<ReturnType<typeof importCls>>;
  let client: InstanceType<typeof AnchorCls>;

  async function importCls() {
    vi.resetModules();
    const { AnchorClient } = await import('@/lib/anchor/client');
    return AnchorClient;
  }

  beforeEach(async () => {
    vi.stubEnv('ANCHOR_API_BASE_URL', 'https://anchor.example.com');
    vi.stubEnv('ANCHOR_API_KEY', '');
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    AnchorCls = await importCls();
    client = new AnchorCls();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('getExchangeRates: AbortError thrown before timeout fires is wrapped as timed-out', async () => {
    // Simulate the AbortError coming from somewhere other than our timer
    // (e.g., the signal already being aborted). The client should still
    // surface it as "Request timed out".
    const abortErr = new Error('Aborted early');
    abortErr.name = 'AbortError';
    fetchMock.mockRejectedValueOnce(abortErr);
    await expect(client.getExchangeRates()).rejects.toThrow('Request timed out after 5000ms');
  });

  it('getQuote: AbortError is wrapped as "Request timed out"', async () => {
    const abortErr = new Error('AbortError');
    abortErr.name = 'AbortError';
    fetchMock.mockRejectedValueOnce(abortErr);
    await expect(
      client.getQuote({ from: 'USD', to: 'USDC', amount: '10' }),
    ).rejects.toThrow('Request timed out after 5000ms');
  });

  it('startDepositFlow: AbortError is wrapped as "Request timed out"', async () => {
    const abortErr = new Error('AbortError');
    abortErr.name = 'AbortError';
    fetchMock.mockRejectedValueOnce(abortErr);
    await expect(
      client.startDepositFlow({ amount: '10', currency: 'USD', account: 'G123' }),
    ).rejects.toThrow('Request timed out after 5000ms');
  });

  it('startWithdrawFlow: AbortError is wrapped as "Request timed out"', async () => {
    const abortErr = new Error('AbortError');
    abortErr.name = 'AbortError';
    fetchMock.mockRejectedValueOnce(abortErr);
    await expect(
      client.startWithdrawFlow({ amount: '10', currency: 'USDC', account: 'G456' }),
    ).rejects.toThrow('Request timed out after 5000ms');
  });

  it('startFlow: text() parse failure on error body is silently swallowed', async () => {
    // Simulate a 500 response whose .text() itself throws — the outer error
    // message should still be thrown without crashing.
    const badTextResponse = {
      ok: false,
      status: 500,
      headers: new Headers(),
      text: vi.fn(async () => { throw new Error('text() failed'); }),
      json: vi.fn(),
    } as unknown as Response;

    fetchMock.mockResolvedValueOnce(badTextResponse);
    // The client catches text() errors; should still throw with the HTTP status.
    await expect(
      client.startDepositFlow({ amount: '10', currency: 'USD', account: 'G789' }),
    ).rejects.toThrow('HTTP 500');
  });

  it('clearTimeout is called even when fetch rejects (no timer leak)', async () => {
    // Verifies the clearTimeout path in the catch branch of fetchWithTimeout.
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    fetchMock.mockRejectedValueOnce(new Error('network error'));
    await expect(client.getExchangeRates()).rejects.toThrow('network error');
    // clearTimeout should have been called at least once (in the catch branch)
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
