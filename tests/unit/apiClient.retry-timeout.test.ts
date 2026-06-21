import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiClientError } from '../../lib/client/apiClient';
import { sessionHandler } from '../../lib/client/sessionHandler';

// Mock sessionHandler so these tests focus purely on timeout/retry behavior.
vi.mock('../../lib/client/sessionHandler', () => ({
  sessionHandler: {
    isSessionExpired: vi.fn(),
    refreshSession: vi.fn(),
    handleSessionExpiry: vi.fn(),
  },
}));

const noHeaders = { get: () => null };

/** A fetch mock that hangs until its signal aborts, then rejects with the abort reason. */
function abortableFetch() {
  return vi.fn(
    (_url: string, opts: RequestInit) =>
      new Promise((_resolve, reject) => {
        const signal = opts.signal as AbortSignal;
        signal.addEventListener('abort', () =>
          reject(signal.reason ?? new DOMException('The operation was aborted.', 'AbortError'))
        );
      })
  );
}

describe('apiClient timeout + idempotent retry layer', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.clearAllMocks();
    (sessionHandler.isSessionExpired as any).mockResolvedValue(false);
    (sessionHandler.refreshSession as any).mockResolvedValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  // ── Timeout ──────────────────────────────────────────────────────────────
  it('aborts a GET that exceeds the timeout and surfaces a TimeoutError', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', abortableFetch());

    const promise = apiClient.get('/api/slow', { timeout: 100, retries: 0 });
    const assertion = expect(promise).rejects.toMatchObject({ name: 'TimeoutError' });

    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('applies a timeout to writes too, but does not retry them', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', abortableFetch());

    const promise = apiClient.post('/api/slow', { body: '{}', timeout: 100, retries: 5 });
    const assertion = expect(promise).rejects.toMatchObject({ name: 'TimeoutError' });

    await vi.advanceTimersByTimeAsync(100);
    await assertion;
    expect(fetch).toHaveBeenCalledTimes(1); // never retried
  });

  // ── Retry then succeed ─────────────────────────────────────────────────────
  it('retries a GET on 503 then succeeds on 200', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ status: 503, headers: noHeaders })
      .mockResolvedValueOnce({ status: 200, headers: noHeaders });

    const response = await apiClient.get('/api/insights', { retries: 1, backoff: 5 });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(response?.status).toBe(200);
  });

  it('retries a GET on a network error then succeeds', async () => {
    (fetch as any)
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce({ status: 200, headers: noHeaders });

    const response = await apiClient.get('/api/insights', { retries: 1, backoff: 5 });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(response?.status).toBe(200);
  });

  // ── Retry exhausted ─────────────────────────────────────────────────────────
  it('returns the final 5xx response once GET retries are exhausted', async () => {
    (fetch as any).mockResolvedValue({ status: 503, headers: noHeaders });

    const response = await apiClient.get('/api/insights', { retries: 2, backoff: 5 });

    expect(fetch).toHaveBeenCalledTimes(3); // initial + 2 retries
    expect(response?.status).toBe(503);
  });

  it('throws once GET network retries are exhausted', async () => {
    (fetch as any).mockRejectedValue(new Error('still down'));

    await expect(apiClient.get('/api/insights', { retries: 1, backoff: 5 })).rejects.toThrow(
      'still down'
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  // ── Retry-After ─────────────────────────────────────────────────────────────
  it('honors Retry-After on 429 for a GET before retrying', async () => {
    vi.useFakeTimers();
    const retryAfterHeaders = {
      get: (name: string) => (name.toLowerCase() === 'retry-after' ? '1' : null),
    };
    (fetch as any)
      .mockResolvedValueOnce({ status: 429, headers: retryAfterHeaders })
      .mockResolvedValueOnce({ status: 200, headers: noHeaders });

    const promise = apiClient.get('/api/rates', { retries: 1 });

    // Retry-After is 1s; the retry should not fire before then.
    await vi.advanceTimersByTimeAsync(1000);
    const response = await promise;

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(response?.status).toBe(200);
  });

  it('retries an idempotent HEAD on 503 then succeeds', async () => {
    (fetch as any)
      .mockResolvedValueOnce({ status: 503, headers: noHeaders })
      .mockResolvedValueOnce({ status: 200, headers: noHeaders });

    const response = await apiClient.head('/api/x', { retries: 1, backoff: 5 });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(response?.status).toBe(200);
  });

  it('parses an HTTP-date Retry-After header (past date retries immediately)', async () => {
    const pastDateHeaders = {
      get: (name: string) =>
        name.toLowerCase() === 'retry-after' ? 'Thu, 01 Jan 1970 00:00:00 GMT' : null,
    };
    (fetch as any)
      .mockResolvedValueOnce({ status: 429, headers: pastDateHeaders })
      .mockResolvedValueOnce({ status: 200, headers: noHeaders });

    const response = await apiClient.get('/api/rates', { retries: 1 });

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(response?.status).toBe(200);
  });

  // ── No retry on writes ──────────────────────────────────────────────────────
  it('never retries a POST on a 500 response', async () => {
    (fetch as any).mockResolvedValue({ status: 500, headers: noHeaders });

    const response = await apiClient.post('/api/send', { body: '{}', retries: 5, backoff: 5 });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(response?.status).toBe(500);
  });

  it('never retries a POST on a network error', async () => {
    (fetch as any).mockRejectedValue(new Error('flaky'));

    await expect(apiClient.post('/api/send', { body: '{}', retries: 5 })).rejects.toThrow('flaky');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('never retries PUT/PATCH/DELETE on a 503 response', async () => {
    (fetch as any).mockResolvedValue({ status: 503, headers: noHeaders });

    for (const call of [
      () => apiClient.put('/api/x', { body: '{}', retries: 5, backoff: 5 }),
      () => apiClient.patch('/api/x', { body: '{}', retries: 5, backoff: 5 }),
      () => apiClient.delete('/api/x', { retries: 5, backoff: 5 }),
    ]) {
      (fetch as any).mockClear();
      const response = await call();
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(response?.status).toBe(503);
    }
  });

  // ── Caller-initiated abort ──────────────────────────────────────────────────
  it('does not fire fetch when the caller signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(apiClient.get('/api/x', { signal: controller.signal })).rejects.toBeDefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('does not retry when the caller aborts mid-flight', async () => {
    vi.stubGlobal('fetch', abortableFetch());
    const controller = new AbortController();

    const promise = apiClient.get('/api/x', { signal: controller.signal, retries: 3 });
    controller.abort();

    await expect(promise).rejects.toBeDefined();
    expect(fetch).toHaveBeenCalledTimes(1); // aborted, not retried
  });

  // ── Session-expiry still works ──────────────────────────────────────────────
  it('still triggers the session-expiry flow on an expired 401', async () => {
    (fetch as any).mockResolvedValue({ status: 401, headers: noHeaders });
    (sessionHandler.isSessionExpired as any).mockResolvedValue(true);
    (sessionHandler.refreshSession as any).mockResolvedValue(false);

    const response = await apiClient.get('/api/x', { retries: 1 });

    expect(response).toBeNull();
    expect(sessionHandler.handleSessionExpiry).toHaveBeenCalledTimes(1);
  });

  // ── getJson<T> ──────────────────────────────────────────────────────────────
  it('getJson parses and returns the typed body', async () => {
    (fetch as any).mockResolvedValue({
      status: 200,
      ok: true,
      headers: noHeaders,
      json: async () => ({ value: 42 }),
    });

    const data = await apiClient.getJson<{ value: number }>('/api/x');
    expect(data).toEqual({ value: 42 });
  });

  it('getJson runs the validator against the parsed body', async () => {
    (fetch as any).mockResolvedValue({
      status: 200,
      ok: true,
      headers: noHeaders,
      json: async () => ({ n: '7' }),
    });

    const validate = vi.fn((raw: any) => ({ n: Number(raw.n) }));
    const data = await apiClient.getJson('/api/x', { validate });

    expect(validate).toHaveBeenCalledWith({ n: '7' });
    expect(data).toEqual({ n: 7 });
  });

  it('getJson throws ApiClientError on a non-OK response', async () => {
    (fetch as any).mockResolvedValue({ status: 500, ok: false, headers: noHeaders });

    await expect(apiClient.getJson('/api/x', { retries: 0 })).rejects.toBeInstanceOf(ApiClientError);
  });

  it('getJson throws ApiClientError when the body is not valid JSON', async () => {
    (fetch as any).mockResolvedValue({
      status: 200,
      ok: true,
      headers: noHeaders,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });

    await expect(apiClient.getJson('/api/x')).rejects.toBeInstanceOf(ApiClientError);
  });

  it('getJson returns null when the session-expiry flow runs', async () => {
    (fetch as any).mockResolvedValue({ status: 401, headers: noHeaders });
    (sessionHandler.isSessionExpired as any).mockResolvedValue(true);
    (sessionHandler.refreshSession as any).mockResolvedValue(false);

    const data = await apiClient.getJson('/api/x');
    expect(data).toBeNull();
  });
});
