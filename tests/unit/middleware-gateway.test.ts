import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

vi.mock('@/lib/logger', () => ({
  logRequest: vi.fn(),
  logResponse: vi.fn(),
  logError: vi.fn(),
  normalizeRequestId: vi.fn((id?: string) => id ?? 'test-request-id'),
}));

vi.mock('@/lib/requestId', () => ({
  generateRequestId: vi.fn(() => 'test-request-id'),
}));

const ALLOWED_ORIGIN = 'https://app.example.com';
const DISALLOWED_ORIGIN = 'https://evil.example.com';
const MAX_BODY_SIZE = 1048576;

type RequestOptions = {
  method?: string;
  path?: string;
  headers?: Record<string, string>;
  body?: ArrayBuffer | null;
};

async function loadMiddleware() {
  vi.resetModules();
  process.env.ALLOWED_ORIGINS = ALLOWED_ORIGIN;
  process.env.API_MAX_BODY_SIZE = String(MAX_BODY_SIZE);

  return import('../../middleware');
}

function buildRequest({
  method = 'GET',
  path = '/api/test',
  headers = {},
  body,
}: RequestOptions = {}) {
  return {
    method,
    headers: new Headers(headers),
    nextUrl: { pathname: path },
    arrayBuffer: vi.fn(async () => body ?? new ArrayBuffer(0)),
  } as unknown as NextRequest;
}

describe('global middleware gateway', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-23T12:00:00.000Z'));
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.API_MAX_BODY_SIZE;
  });

  it('returns configured CORS headers for allowed preflight requests', async () => {
    const { middleware } = await loadMiddleware();

    const response = await middleware(
      buildRequest({
        method: 'OPTIONS',
        headers: { origin: ALLOWED_ORIGIN },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      ALLOWED_ORIGIN,
    );
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBe('true');
    expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
      'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    );
    expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
      'Content-Type, Authorization, X-Requested-With',
    );
    expect(response.headers.get('Vary')).toBe('Origin');
  });

  it('omits allow-origin for disallowed CORS origins while preserving Vary', async () => {
    const { middleware } = await loadMiddleware();

    const response = await middleware(
      buildRequest({
        method: 'OPTIONS',
        headers: { origin: DISALLOWED_ORIGIN },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect(response.headers.get('Access-Control-Allow-Credentials')).toBeNull();
    expect(response.headers.get('Vary')).toBe('Origin');
  });

  it.each([
    { method: 'GET', path: '/api/auth/session', limit: '10', remaining: '9' },
    { method: 'POST', path: '/api/transfers', limit: '50', remaining: '49' },
    { method: 'GET', path: '/api/transfers', limit: '100', remaining: '99' },
  ])(
    'uses the $limit/min rate-limit bucket for $method $path',
    async ({ method, path, limit, remaining }) => {
      const { middleware } = await loadMiddleware();

      const response = await middleware(
        buildRequest({
          method,
          path,
          headers: { 'x-forwarded-for': `203.0.113.${limit}` },
        }),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('X-RateLimit-Limit')).toBe(limit);
      expect(response.headers.get('X-RateLimit-Remaining')).toBe(remaining);
      expect(response.headers.get('X-RateLimit-Reset')).toBe(
        String(Date.now() + 60000),
      );
    },
  );

  it('returns 429 with rate-limit headers on the 11th auth request in a window', async () => {
    const { middleware, metrics } = await loadMiddleware();
    let response: Response | undefined;

    for (let i = 0; i < 11; i += 1) {
      response = await middleware(
        buildRequest({
          path: '/api/auth/session',
          headers: {
            origin: ALLOWED_ORIGIN,
            'x-forwarded-for': '198.51.100.10',
          },
        }),
      );
    }

    expect(response?.status).toBe(429);
    expect(response?.headers.get('Retry-After')).toBe('60');
    expect(response?.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(response?.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response?.headers.get('X-RateLimit-Reset')).toBe(
      String(Date.now() + 60000),
    );
    expect(response?.headers.get('Access-Control-Allow-Origin')).toBe(
      ALLOWED_ORIGIN,
    );
    expect(metrics['GET /api/auth/session']).toEqual({
      count: 11,
      errorCount: 1,
    });
  });

  it('starts a fresh rate-limit window after expiry', async () => {
    const { middleware } = await loadMiddleware();

    for (let i = 0; i < 10; i += 1) {
      await middleware(
        buildRequest({
          path: '/api/auth/session',
          headers: { 'x-forwarded-for': '198.51.100.20' },
        }),
      );
    }

    vi.advanceTimersByTime(60001);

    const response = await middleware(
      buildRequest({
        path: '/api/auth/session',
        headers: { 'x-forwarded-for': '198.51.100.20' },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('9');
  });

  it('adds security headers to normal and preflight responses', async () => {
    const { middleware } = await loadMiddleware();

    const normalResponse = await middleware(buildRequest());
    const preflightResponse = await middleware(
      buildRequest({
        method: 'OPTIONS',
        headers: { origin: ALLOWED_ORIGIN },
      }),
    );

    for (const response of [normalResponse, preflightResponse]) {
      expect(response.headers.get('Content-Security-Policy')).toBe(
        "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
      );
      expect(response.headers.get('Strict-Transport-Security')).toBe(
        'max-age=31536000; includeSubDomains',
      );
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
    }
  });

  it('rejects requests exceeding the default 1MB content-length limit', async () => {
    const { middleware } = await loadMiddleware();

    const response = await middleware(
      buildRequest({
        method: 'POST',
        headers: {
          origin: ALLOWED_ORIGIN,
          'content-length': String(MAX_BODY_SIZE + 1),
        },
      }),
    );

    expect(response.status).toBe(413);
    expect(response.headers.get('Content-Type')).toContain('application/json');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      ALLOWED_ORIGIN,
    );
    expect(response.headers.get('Content-Security-Policy')).toBe(
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
    );
    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
    await expect(response.json()).resolves.toMatchObject({
      error: 'Payload Too Large',
    });
  });

  it('rejects oversized streamed bodies when content-length is absent', async () => {
    const { middleware } = await loadMiddleware();
    const body = new ArrayBuffer(MAX_BODY_SIZE + 1);

    const response = await middleware(
      buildRequest({
        method: 'POST',
        body,
      }),
    );

    expect(response.status).toBe(413);
  });

  it('honors the Playwright bypass only for the exact non-production test header', async () => {
    const { middleware } = await loadMiddleware();

    const bypassed = await middleware(
      buildRequest({
        method: 'POST',
        headers: {
          'content-length': String(MAX_BODY_SIZE + 1),
          'x-playwright-test': 'true',
        },
      }),
    );
    const notBypassed = await middleware(
      buildRequest({
        method: 'POST',
        headers: {
          'content-length': String(MAX_BODY_SIZE + 1),
          'x-playwright-test': 'false',
        },
      }),
    );

    expect(bypassed.status).toBe(200);
    expect(bypassed.headers.get('X-Frame-Options')).toBeNull();
    expect(notBypassed.status).toBe(413);
  });
});
