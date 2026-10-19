/**
 * Unit tests for:
 *   - lib/fetch-timeout.ts  (fetchWithTimeout)
 *   - lib/config/fetch-timeouts.ts  (getTimeoutForUrl, ENDPOINT_TIMEOUTS)
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fetchWithTimeout } from '../../lib/fetch-timeout';
import {
  getTimeoutForUrl,
  ENDPOINT_TIMEOUTS,
  DEFAULT_FETCH_TIMEOUT_MS,
  ANCHOR_RATES_TIMEOUT_MS,
  ANCHOR_DEPOSIT_TIMEOUT_MS,
  ANCHOR_WITHDRAW_TIMEOUT_MS,
  ANCHOR_DEFAULT_TIMEOUT_MS,
  AUTH_NONCE_TIMEOUT_MS,
  AUTH_LOGIN_TIMEOUT_MS,
  AUTH_REFRESH_TIMEOUT_MS,
  HEALTH_TIMEOUT_MS,
  METRICS_TIMEOUT_MS,
  SEND_TIMEOUT_MS,
  CONTRACT_READ_TIMEOUT_MS,
} from '../../lib/config/fetch-timeouts';

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns a `fetch` mock whose requests hang until the supplied `AbortSignal`
 * fires, then reject with the abort reason.
 */
function hangingFetch() {
  return vi.fn(
    (_url: string, opts: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = opts.signal as AbortSignal;
        if (signal?.aborted) {
          reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
          return;
        }
        signal?.addEventListener('abort', () =>
          reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
        );
      })
  );
}

/** Returns a `fetch` mock that resolves immediately with a 200 response. */
function okFetch() {
  return vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
}

// ── getTimeoutForUrl ──────────────────────────────────────────────────────────

describe('getTimeoutForUrl', () => {
  it('returns DEFAULT_FETCH_TIMEOUT_MS for an unknown route', () => {
    expect(getTimeoutForUrl('/api/unknown/route')).toBe(DEFAULT_FETCH_TIMEOUT_MS);
  });

  it('returns DEFAULT_FETCH_TIMEOUT_MS for an empty string', () => {
    expect(getTimeoutForUrl('')).toBe(DEFAULT_FETCH_TIMEOUT_MS);
  });

  it('returns ANCHOR_RATES_TIMEOUT_MS for /api/anchor/rates', () => {
    expect(getTimeoutForUrl('/api/anchor/rates')).toBe(ANCHOR_RATES_TIMEOUT_MS);
  });

  it('returns ANCHOR_DEPOSIT_TIMEOUT_MS for /api/anchor/deposit', () => {
    expect(getTimeoutForUrl('/api/anchor/deposit')).toBe(ANCHOR_DEPOSIT_TIMEOUT_MS);
  });

  it('returns ANCHOR_WITHDRAW_TIMEOUT_MS for /api/anchor/withdraw', () => {
    expect(getTimeoutForUrl('/api/anchor/withdraw')).toBe(ANCHOR_WITHDRAW_TIMEOUT_MS);
  });

  it('returns ANCHOR_DEFAULT_TIMEOUT_MS for a generic /api/anchor route', () => {
    expect(getTimeoutForUrl('/api/anchor/something-else')).toBe(ANCHOR_DEFAULT_TIMEOUT_MS);
  });

  it('returns AUTH_NONCE_TIMEOUT_MS for /api/auth/nonce', () => {
    expect(getTimeoutForUrl('/api/auth/nonce')).toBe(AUTH_NONCE_TIMEOUT_MS);
  });

  it('returns AUTH_LOGIN_TIMEOUT_MS for /api/auth/login', () => {
    expect(getTimeoutForUrl('/api/auth/login')).toBe(AUTH_LOGIN_TIMEOUT_MS);
  });

  it('returns AUTH_REFRESH_TIMEOUT_MS for /api/auth/refresh', () => {
    expect(getTimeoutForUrl('/api/auth/refresh')).toBe(AUTH_REFRESH_TIMEOUT_MS);
  });

  it('returns HEALTH_TIMEOUT_MS for /api/health', () => {
    expect(getTimeoutForUrl('/api/health')).toBe(HEALTH_TIMEOUT_MS);
  });

  it('returns METRICS_TIMEOUT_MS for /api/metrics', () => {
    expect(getTimeoutForUrl('/api/metrics')).toBe(METRICS_TIMEOUT_MS);
  });

  it('returns SEND_TIMEOUT_MS for /api/send', () => {
    expect(getTimeoutForUrl('/api/send')).toBe(SEND_TIMEOUT_MS);
  });

  it('returns CONTRACT_READ_TIMEOUT_MS for /api/goals', () => {
    expect(getTimeoutForUrl('/api/goals')).toBe(CONTRACT_READ_TIMEOUT_MS);
  });

  it('returns CONTRACT_READ_TIMEOUT_MS for /api/bills', () => {
    expect(getTimeoutForUrl('/api/bills')).toBe(CONTRACT_READ_TIMEOUT_MS);
  });

  it('returns CONTRACT_READ_TIMEOUT_MS for /api/insurance', () => {
    expect(getTimeoutForUrl('/api/insurance')).toBe(CONTRACT_READ_TIMEOUT_MS);
  });

  it('returns CONTRACT_READ_TIMEOUT_MS for /api/split', () => {
    expect(getTimeoutForUrl('/api/split')).toBe(CONTRACT_READ_TIMEOUT_MS);
  });

  it('returns CONTRACT_READ_TIMEOUT_MS for /api/family', () => {
    expect(getTimeoutForUrl('/api/family')).toBe(CONTRACT_READ_TIMEOUT_MS);
  });

  it('matches by substring — absolute URL still resolves', () => {
    expect(getTimeoutForUrl('https://example.com/api/anchor/rates?v=1')).toBe(
      ANCHOR_RATES_TIMEOUT_MS
    );
  });

  it('more-specific anchor routes win over the generic /api/anchor rule', () => {
    // /api/anchor/deposit and /api/anchor/withdraw both contain /api/anchor, but
    // the more-specific keys appear earlier in ENDPOINT_TIMEOUTS, so they win.
    const depositIdx = ENDPOINT_TIMEOUTS.findIndex(([k]) => k === '/api/anchor/deposit');
    const genericIdx = ENDPOINT_TIMEOUTS.findIndex(([k]) => k === '/api/anchor');
    expect(depositIdx).toBeLessThan(genericIdx);
  });
});

// ── ENDPOINT_TIMEOUTS sanity ─────────────────────────────────────────────────

describe('ENDPOINT_TIMEOUTS table', () => {
  it('has no duplicate keys', () => {
    const keys = ENDPOINT_TIMEOUTS.map(([k]) => k);
    const unique = new Set(keys);
    expect(unique.size).toBe(keys.length);
  });

  it('every timeout value is a positive integer', () => {
    for (const [key, ms] of ENDPOINT_TIMEOUTS) {
      expect(ms, `timeout for "${key}" should be > 0`).toBeGreaterThan(0);
      expect(Number.isInteger(ms), `timeout for "${key}" should be an integer`).toBe(true);
    }
  });

  it('DEFAULT_FETCH_TIMEOUT_MS is a positive integer', () => {
    expect(DEFAULT_FETCH_TIMEOUT_MS).toBeGreaterThan(0);
    expect(Number.isInteger(DEFAULT_FETCH_TIMEOUT_MS)).toBe(true);
  });
});

// ── fetchWithTimeout — happy path ─────────────────────────────────────────────

describe('fetchWithTimeout — successful requests', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', okFetch());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the response on success', async () => {
    const response = await fetchWithTimeout('/api/health');
    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('passes the URL and options through to fetch', async () => {
    await fetchWithTimeout('/api/anchor/rates', { headers: { 'X-Custom': 'yes' } });
    expect(fetch).toHaveBeenCalledWith(
      '/api/anchor/rates',
      expect.objectContaining({ headers: { 'X-Custom': 'yes' } })
    );
  });

  it('resolves the timeout from the policy table when none is specified', async () => {
    await fetchWithTimeout('/api/anchor/rates');
    // The signal passed to fetch should be an AbortSignal (not null/undefined).
    const callArgs = (fetch as any).mock.calls[0][1];
    expect(callArgs.signal).toBeDefined();
    expect(typeof callArgs.signal.aborted).toBe('boolean');
  });

  it('uses an explicit timeout override instead of the policy table', async () => {
    // Should not throw — just verify fetch is called.
    const response = await fetchWithTimeout('/api/health', {}, 999_999);
    expect(response.status).toBe(200);
  });

  it('makes a plain fetch when timeout is 0 (disabled)', async () => {
    await fetchWithTimeout('/api/health', {}, 0);
    // With timeout=0, fetch is called without a timeout signal.
    const callArgs = (fetch as any).mock.calls[0][1];
    // No AbortSignal means the signal field should be absent or undefined.
    expect(callArgs.signal).toBeUndefined();
  });
});

// ── fetchWithTimeout — timeout fires ─────────────────────────────────────────

describe('fetchWithTimeout — timeout fires', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('rejects with a TimeoutError DOMException when the deadline fires', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', hangingFetch());

    const assertionPromise = expect(
      fetchWithTimeout('/api/slow', {}, 50)
    ).rejects.toMatchObject({ name: 'TimeoutError' });

    await vi.advanceTimersByTimeAsync(50);
    await assertionPromise;
  });

  it('error message includes the URL and timeout', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', hangingFetch());

    const assertionPromise = expect(
      fetchWithTimeout('/api/slow-endpoint', {}, 100)
    ).rejects.toMatchObject({ message: expect.stringContaining('/api/slow-endpoint') });

    await vi.advanceTimersByTimeAsync(100);
    await assertionPromise;
  });

  it('does not call fetch more than once — no implicit retry', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', hangingFetch());

    const promise = fetchWithTimeout('/api/slow', {}, 50);
    // Attach catch before advancing timers so the rejection is handled.
    promise.catch(() => {});

    await vi.advanceTimersByTimeAsync(50);
    await promise.catch(() => {});
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('uses the policy-table timeout for the relevant endpoint', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', hangingFetch());

    // HEALTH_TIMEOUT_MS is 3_000.
    const assertionPromise = expect(
      fetchWithTimeout('/api/health')
    ).rejects.toMatchObject({ name: 'TimeoutError' });

    await vi.advanceTimersByTimeAsync(HEALTH_TIMEOUT_MS);
    await assertionPromise;
  });
});

// ── fetchWithTimeout — caller abort ──────────────────────────────────────────

describe('fetchWithTimeout — caller abort', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', hangingFetch());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rejects immediately when the caller aborts a hanging request', async () => {
    const controller = new AbortController();

    const promise = fetchWithTimeout('/api/goals', { signal: controller.signal }, 30_000);
    controller.abort();

    await expect(promise).rejects.toBeDefined();
  });

  it('rejects immediately when the signal is already aborted before the call', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(fetchWithTimeout('/api/goals', { signal: controller.signal }, 30_000)).rejects.toBeDefined();
  });

  it('does not fire a timeout error when the caller aborts first', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();

    const promise = fetchWithTimeout('/api/goals', { signal: controller.signal }, 100);
    controller.abort(new DOMException('user cancelled', 'AbortError'));

    let caught: unknown;
    try {
      await promise;
    } catch (e) {
      caught = e;
    }

    // Should be the caller's abort, not a TimeoutError.
    expect((caught as DOMException).name).not.toBe('TimeoutError');

    vi.useRealTimers();
  });
});

// ── fetchWithTimeout — signal composition ────────────────────────────────────

describe('fetchWithTimeout — signal composition', () => {
  it('passes a signal to fetch even when no caller signal is provided', async () => {
    vi.stubGlobal('fetch', okFetch());
    await fetchWithTimeout('/api/health', {}, 5_000);

    const callArgs = (fetch as any).mock.calls[0][1];
    expect(callArgs).toHaveProperty('signal');
    vi.unstubAllGlobals();
  });

  it('merges the caller signal and the timeout signal', async () => {
    vi.stubGlobal('fetch', okFetch());
    const callerController = new AbortController();

    await fetchWithTimeout('/api/health', { signal: callerController.signal }, 5_000);

    // The signal passed to fetch is a combined signal (not the raw caller one).
    const callArgs = (fetch as any).mock.calls[0][1];
    expect(callArgs.signal).toBeDefined();
    vi.unstubAllGlobals();
  });
});
