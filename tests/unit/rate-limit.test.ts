import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  HttpRateLimitStore,
  MemoryRateLimitStore,
} from '@/lib/rate-limit';

vi.mock('@/lib/logger', () => ({
  logRequest: vi.fn(),
  logResponse: vi.fn(),
  logError: vi.fn(),
  normalizeRequestId: vi.fn(),
}));
vi.mock('@/lib/requestId', () => ({
  generateRequestId: vi.fn(() => 'test-request-id'),
  isValidRequestId: vi.fn(() => false),
}));

describe('sliding-window rate-limit stores', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-23T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does not allow a fixed-window edge burst and expires hits at the exact boundary', async () => {
    const store = new MemoryRateLimitStore();
    const now = Date.now();

    for (let request = 0; request < 10; request += 1) {
      expect(await store.consume('client:auth', now, 10, 60_000)).toMatchObject({
        allowed: true,
      });
    }

    vi.advanceTimersByTime(59_999);
    expect(await store.consume('client:auth', Date.now(), 10, 60_000)).toMatchObject({
      allowed: false,
      remaining: 0,
    });

    vi.advanceTimersByTime(1);
    expect(await store.consume('client:auth', Date.now(), 10, 60_000)).toMatchObject({
      allowed: true,
      remaining: 9,
    });
  });

  it('sends an atomic consume request to the configured HTTP store', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ allowed: true, remaining: 4, resetAt: 60_000 }),
        { status: 200 },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const store = new HttpRateLimitStore('https://rate-limit.example/consume');

    await expect(store.consume('203.0.113.1:write', 1_000, 5, 60_000)).resolves.toEqual({
      allowed: true,
      remaining: 4,
      resetAt: 60_000,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://rate-limit.example/consume',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          key: '203.0.113.1:write',
          now: 1_000,
          limit: 5,
          windowMs: 60_000,
        }),
      }),
    );
  });

  it('fails open when the configured shared store is unreachable', async () => {
    vi.stubEnv('RATE_LIMIT_STORE_URL', 'https://rate-limit.example/consume');
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new Error('store unavailable')),
    );
    const logStoreFailure = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    vi.resetModules();

    const { middleware } = await import('../../middleware');
    const response = await middleware(
      new NextRequest('http://localhost/api/test'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('RateLimit-Limit')).toBeNull();
    expect(logStoreFailure).toHaveBeenCalledWith(
      '[rate-limit] shared store unavailable; failing open',
      expect.any(Error),
    );
  });
});
