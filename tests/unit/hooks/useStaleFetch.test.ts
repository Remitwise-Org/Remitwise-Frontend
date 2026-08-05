/**
 * Unit tests for lib/hooks/useStaleFetch.ts
 *
 * Verifies:
 * 1. Happy-path: fresh fetch returns 'ready' state with data.
 * 2. First failure with no cache returns 'error' state.
 * 3. Failure after a prior success returns 'stale' state with cached data.
 * 4. Stale data is served from sessionStorage when the live fetch fails.
 * 5. Cache entries older than maxStaleAgeMs are not used.
 * 6. Session-expiry (apiClient returns null) goes to 'error', not 'stale'.
 * 7. Calling load() while mounted re-fetches.
 * 8. The cache is updated on each successful fetch.
 * 9. maxStaleAgeMs=0 accepts any age.
 * 10. Invalid JSON in sessionStorage falls through to error.
 * 11. Non-ok response with cache → stale state.
 */
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { createElement, StrictMode, type ReactNode } from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useStaleFetch } from '@/lib/hooks/useStaleFetch';

// ---------------------------------------------------------------------------
// Mock apiClient
// ---------------------------------------------------------------------------

const mockGet = vi.fn();
vi.mock('@/lib/client/apiClient', () => ({
  apiClient: {
    get: (...args: unknown[]) => mockGet(...args),
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeOkResponse<T>(data: T) {
  return {
    ok: true,
    json: async () => data,
  } as unknown as Response;
}

const CACHE_KEY = 'test-stale-key';
const SAMPLE_URL = '/api/test';

function writeSessionStorage<T>(key: string, data: T, cachedAt = Date.now()) {
  sessionStorage.setItem(key, JSON.stringify({ data, cachedAt }));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function strictModeWrapper({ children }: { children: ReactNode }) {
  return createElement(StrictMode, null, children);
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockGet.mockReset();
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useStaleFetch', () => {
  it('collapses Strict Mode mount effects into one in-flight request', async () => {
    const pending = deferred<Response>();
    const json = vi.fn().mockResolvedValue({ value: 42 });
    mockGet.mockReturnValue(pending.promise);

    const { result } = renderHook(
      () => useStaleFetch<{ value: number }>({ url: SAMPLE_URL, cacheKey: CACHE_KEY }),
      { wrapper: strictModeWrapper }
    );

    expect(mockGet).toHaveBeenCalledTimes(1);

    pending.resolve({ ok: true, json } as unknown as Response);

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.data).toEqual({ value: 42 });
    expect(json).toHaveBeenCalledTimes(1);
  });

  it('evicts a failed in-flight request so an explicit retry starts a new one', async () => {
    const pending = deferred<Response>();
    mockGet.mockReturnValueOnce(pending.promise);

    const { result } = renderHook(
      () => useStaleFetch<{ value: number }>({ url: SAMPLE_URL, cacheKey: CACHE_KEY }),
      { wrapper: strictModeWrapper }
    );

    expect(mockGet).toHaveBeenCalledTimes(1);
    pending.reject(new Error('Network failure'));

    await waitFor(() => expect(result.current.state).toBe('error'));

    mockGet.mockResolvedValueOnce(makeOkResponse({ value: 7 }));
    act(() => {
      result.current.load();
    });

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.data).toEqual({ value: 7 });
    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('shows loading state while the fetch is in-flight', () => {
    mockGet.mockReturnValue(new Promise(() => {})); // never resolves
    const { result } = renderHook(() =>
      useStaleFetch({ url: '/api/test-pending', cacheKey: CACHE_KEY })
    );
    expect(result.current.state).toBe('loading');
    expect(result.current.data).toBeNull();
    expect(result.current.isStale).toBe(false);
  });

  it('transitions to ready after a successful fetch', async () => {
    const payload = { value: 42 };
    mockGet.mockResolvedValue(makeOkResponse(payload));

    const { result } = renderHook(() =>
      useStaleFetch<{ value: number }>({ url: SAMPLE_URL, cacheKey: CACHE_KEY })
    );

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.data).toEqual(payload);
    expect(result.current.isStale).toBe(false);
    expect(result.current.staleAt).toBeNull();
  });

  it('transitions to error when the fetch fails and there is no cache', async () => {
    mockGet.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() =>
      useStaleFetch({ url: SAMPLE_URL, cacheKey: CACHE_KEY })
    );

    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.data).toBeNull();
    expect(result.current.isStale).toBe(false);
  });

  it('transitions to stale when the fetch fails but a valid cache entry exists', async () => {
    const cachedPayload = { value: 99 };
    const cachedAt = Date.now();
    writeSessionStorage(CACHE_KEY, cachedPayload, cachedAt);

    mockGet.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() =>
      useStaleFetch<{ value: number }>({
        url: SAMPLE_URL,
        cacheKey: CACHE_KEY,
        maxStaleAgeMs: 5 * 60 * 1000,
      })
    );

    await waitFor(() => expect(result.current.state).toBe('stale'));
    expect(result.current.data).toEqual(cachedPayload);
    expect(result.current.isStale).toBe(true);
    expect(result.current.staleAt).toBe(cachedAt);
  });

  it('transitions to stale when the response is not ok and a valid cache entry exists', async () => {
    const cachedPayload = { value: 77 };
    writeSessionStorage(CACHE_KEY, cachedPayload);

    mockGet.mockResolvedValue({ ok: false, status: 503 } as unknown as Response);

    const { result } = renderHook(() =>
      useStaleFetch<{ value: number }>({ url: SAMPLE_URL, cacheKey: CACHE_KEY })
    );

    await waitFor(() => expect(result.current.state).toBe('stale'));
    expect(result.current.data).toEqual(cachedPayload);
    expect(result.current.isStale).toBe(true);
  });

  it('transitions to error when the cache entry is older than maxStaleAgeMs', async () => {
    const staleAge = 10 * 60 * 1000; // 10 minutes old
    const maxStaleAgeMs = 5 * 60 * 1000; // 5 minutes maximum
    const cachedAt = Date.now() - staleAge;
    writeSessionStorage(CACHE_KEY, { value: 1 }, cachedAt);

    mockGet.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() =>
      useStaleFetch({
        url: SAMPLE_URL,
        cacheKey: CACHE_KEY,
        maxStaleAgeMs,
      })
    );

    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.isStale).toBe(false);
  });

  it('goes to error (not stale) when apiClient returns null (session expiry)', async () => {
    // Write a valid cache entry to confirm we are NOT serving it for session expiry.
    writeSessionStorage(CACHE_KEY, { value: 55 });

    // apiClient returning null signals the session-expiry flow.
    mockGet.mockResolvedValue(null);

    const { result } = renderHook(() =>
      useStaleFetch({ url: SAMPLE_URL, cacheKey: CACHE_KEY })
    );

    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.isStale).toBe(false);
  });

  it('writes fresh data to sessionStorage on a successful fetch', async () => {
    const payload = { fresh: true };
    mockGet.mockResolvedValue(makeOkResponse(payload));

    const { result } = renderHook(() =>
      useStaleFetch<{ fresh: boolean }>({ url: SAMPLE_URL, cacheKey: CACHE_KEY })
    );

    await waitFor(() => expect(result.current.state).toBe('ready'));

    const raw = sessionStorage.getItem(CACHE_KEY);
    expect(raw).not.toBeNull();
    const envelope = JSON.parse(raw!);
    expect(envelope.data).toEqual(payload);
    expect(typeof envelope.cachedAt).toBe('number');
  });

  it('re-fetches and transitions back to ready when load() is called after stale state', async () => {
    const cachedPayload = { v: 1 };
    const freshPayload = { v: 2 };
    writeSessionStorage(CACHE_KEY, cachedPayload);

    // First call fails → stale
    mockGet.mockRejectedValueOnce(new Error('Network failure'));

    const { result } = renderHook(() =>
      useStaleFetch<{ v: number }>({ url: SAMPLE_URL, cacheKey: CACHE_KEY })
    );

    await waitFor(() => expect(result.current.state).toBe('stale'));

    // Now mock a successful second call
    mockGet.mockResolvedValueOnce(makeOkResponse(freshPayload));

    act(() => {
      result.current.load();
    });

    await waitFor(() => expect(result.current.state).toBe('ready'));
    expect(result.current.data).toEqual(freshPayload);
    expect(result.current.isStale).toBe(false);
  });

  it('accepts any cache age when maxStaleAgeMs is 0', async () => {
    const veryOldCachedAt = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    writeSessionStorage(CACHE_KEY, { old: true }, veryOldCachedAt);

    mockGet.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() =>
      useStaleFetch({ url: SAMPLE_URL, cacheKey: CACHE_KEY, maxStaleAgeMs: 0 })
    );

    await waitFor(() => expect(result.current.state).toBe('stale'));
    expect(result.current.data).toEqual({ old: true });
  });

  it('falls through to error when sessionStorage contains invalid JSON', async () => {
    sessionStorage.setItem(CACHE_KEY, 'not-valid-json{{{');
    mockGet.mockRejectedValue(new Error('Network failure'));

    const { result } = renderHook(() =>
      useStaleFetch({ url: SAMPLE_URL, cacheKey: CACHE_KEY })
    );

    await waitFor(() => expect(result.current.state).toBe('error'));
    expect(result.current.isStale).toBe(false);
  });
});
