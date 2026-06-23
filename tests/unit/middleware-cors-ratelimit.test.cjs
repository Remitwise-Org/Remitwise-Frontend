const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const { NextRequest, NextResponse } = require('next/server');

// Mock the middleware functions
const applyCORS = (request, response) => {
  const origin = request.headers.get('origin') || '';
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '*').split(',');
  
  if (request.method === 'OPTIONS') {
    const headers = new Headers(response.headers);
    if (allowedOrigins.includes('*')) {
      headers.set('Access-Control-Allow-Origin', '*');
    } else if (allowedOrigins.includes(origin)) {
      headers.set('Access-Control-Allow-Origin', origin);
    }
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    headers.set('Access-Control-Max-Age', '86400');
    return new NextResponse(null, { status: 204, headers });
  }
  
  const headers = new Headers(response.headers);
  if (allowedOrigins.includes('*')) {
    headers.set('Access-Control-Allow-Origin', '*');
  } else if (allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
  }
  return new NextResponse(response.body, { status: response.status, headers });
};

const applySecurityHeaders = (response) => {
  const headers = new Headers(response.headers);
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  headers.set('Content-Security-Policy', "default-src 'self'");
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  return new NextResponse(response.body, { status: response.status, headers });
};

const validateBodySize = async (request, maxSize = 1024 * 1024) => {
  const bypassHeader = request.headers.get('x-playwright-test');
  if (bypassHeader === 'true') {
    return null;
  }
  
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength, 10) > maxSize) {
    return new NextResponse(
      JSON.stringify({ error: 'Request body too large', maxSize }),
      { status: 413, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return null;
};

const rateLimitStore = new Map();

const getRateLimitTier = (pathname) => {
  if (pathname.startsWith('/api/auth/')) {
    return { limit: 10, window: 60000 }; // 10/min
  }
  if (pathname.match(/\/(POST|PUT|DELETE)$/) || pathname.includes('/bills') || pathname.includes('/goals')) {
    return { limit: 50, window: 60000 }; // 50/min
  }
  return { limit: 100, window: 60000 }; // 100/min
};

const applyRateLimit = (request) => {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const pathname = new URL(request.url).pathname;
  const tier = getRateLimitTier(pathname);
  const key = `${ip}:${pathname}`;
  
  const now = Date.now();
  const record = rateLimitStore.get(key) || { count: 0, resetAt: now + tier.window };
  
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + tier.window;
  }
  
  record.count++;
  rateLimitStore.set(key, record);
  
  const remaining = Math.max(0, tier.limit - record.count);
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', tier.limit.toString());
  headers.set('X-RateLimit-Remaining', remaining.toString());
  headers.set('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000).toString());
  
  if (record.count > tier.limit) {
    return new NextResponse(
      JSON.stringify({ error: 'Rate limit exceeded' }),
      { status: 429, headers }
    );
  }
  
  return { headers, remaining };
};

describe('Middleware - CORS', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = process.env.ALLOWED_ORIGINS;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ALLOWED_ORIGINS = originalEnv;
    } else {
      delete process.env.ALLOWED_ORIGINS;
    }
  });

  it('should handle OPTIONS preflight with wildcard origin', () => {
    process.env.ALLOWED_ORIGINS = '*';
    const request = new NextRequest('https://example.com/api/test', {
      method: 'OPTIONS',
      headers: { origin: 'https://client.com' }
    });
    const baseResponse = new NextResponse();
    const response = applyCORS(request, baseResponse);

    assert.strictEqual(response.status, 204);
    assert.strictEqual(response.headers.get('Access-Control-Allow-Origin'), '*');
    assert.strictEqual(response.headers.get('Access-Control-Allow-Methods'), 'GET, POST, PUT, DELETE, OPTIONS');
    assert.strictEqual(response.headers.get('Access-Control-Allow-Headers'), 'Content-Type, Authorization');
    assert.strictEqual(response.headers.get('Access-Control-Max-Age'), '86400');
  });

  it('should echo allowed origin on preflight', () => {
    process.env.ALLOWED_ORIGINS = 'https://trusted.com,https://another.com';
    const request = new NextRequest('https://example.com/api/test', {
      method: 'OPTIONS',
      headers: { origin: 'https://trusted.com' }
    });
    const baseResponse = new NextResponse();
    const response = applyCORS(request, baseResponse);

    assert.strictEqual(response.headers.get('Access-Control-Allow-Origin'), 'https://trusted.com');
  });

  it('should not set CORS headers for disallowed origin', () => {
    process.env.ALLOWED_ORIGINS = 'https://trusted.com';
    const request = new NextRequest('https://example.com/api/test', {
      method: 'OPTIONS',
      headers: { origin: 'https://malicious.com' }
    });
    const baseResponse = new NextResponse();
    const response = applyCORS(request, baseResponse);

    assert.strictEqual(response.headers.get('Access-Control-Allow-Origin'), null);
  });

  it('should apply CORS headers on regular GET request with wildcard', () => {
    process.env.ALLOWED_ORIGINS = '*';
    const request = new NextRequest('https://example.com/api/test', {
      method: 'GET',
      headers: { origin: 'https://client.com' }
    });
    const baseResponse = new NextResponse(JSON.stringify({ data: 'test' }));
    const response = applyCORS(request, baseResponse);

    assert.strictEqual(response.headers.get('Access-Control-Allow-Origin'), '*');
  });

  it('should handle missing origin header', () => {
    process.env.ALLOWED_ORIGINS = 'https://trusted.com';
    const request = new NextRequest('https://example.com/api/test', {
      method: 'GET'
    });
    const baseResponse = new NextResponse();
    const response = applyCORS(request, baseResponse);

    assert.strictEqual(response.headers.get('Access-Control-Allow-Origin'), null);
  });
});

describe('Middleware - Security Headers', () => {
  it('should apply all security headers to response', () => {
    const baseResponse = new NextResponse(JSON.stringify({ data: 'test' }));
    const response = applySecurityHeaders(baseResponse);

    assert.strictEqual(response.headers.get('X-Frame-Options'), 'DENY');
    assert.strictEqual(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.strictEqual(response.headers.get('X-XSS-Protection'), '1; mode=block');
    assert.strictEqual(response.headers.get('Strict-Transport-Security'), 'max-age=31536000; includeSubDomains');
    assert.strictEqual(response.headers.get('Content-Security-Policy'), "default-src 'self'");
    assert.strictEqual(response.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
    assert.strictEqual(response.headers.get('Permissions-Policy'), 'geolocation=(), microphone=(), camera=()');
  });

  it('should preserve existing response body and status', () => {
    const baseResponse = new NextResponse(JSON.stringify({ user: 'john' }), { status: 201 });
    const response = applySecurityHeaders(baseResponse);

    assert.strictEqual(response.status, 201);
  });
});

describe('Middleware - Body Size Validation', () => {
  it('should reject request exceeding 1MB', async () => {
    const request = new NextRequest('https://example.com/api/test', {
      method: 'POST',
      headers: { 'content-length': '1048577' } // 1MB + 1 byte
    });
    const response = await validateBodySize(request);

    assert.ok(response !== null);
    assert.strictEqual(response.status, 413);
    const body = await response.json();
    assert.strictEqual(body.error, 'Request body too large');
    assert.strictEqual(body.maxSize, 1048576);
  });

  it('should allow request exactly at 1MB limit', async () => {
    const request = new NextRequest('https://example.com/api/test', {
      method: 'POST',
      headers: { 'content-length': '1048576' } // exactly 1MB
    });
    const response = await validateBodySize(request);

    assert.strictEqual(response, null);
  });

  it('should allow request under 1MB', async () => {
    const request = new NextRequest('https://example.com/api/test', {
      method: 'POST',
      headers: { 'content-length': '500000' }
    });
    const response = await validateBodySize(request);

    assert.strictEqual(response, null);
  });

  it('should bypass check with x-playwright-test header', async () => {
    const request = new NextRequest('https://example.com/api/test', {
      method: 'POST',
      headers: {
        'content-length': '2097152', // 2MB
        'x-playwright-test': 'true'
      }
    });
    const response = await validateBodySize(request);

    assert.strictEqual(response, null);
  });

  it('should not bypass with incorrect playwright header value', async () => {
    const request = new NextRequest('https://example.com/api/test', {
      method: 'POST',
      headers: {
        'content-length': '2097152',
        'x-playwright-test': 'false'
      }
    });
    const response = await validateBodySize(request);

    assert.ok(response !== null);
    assert.strictEqual(response.status, 413);
  });

  it('should allow request with no content-length header', async () => {
    const request = new NextRequest('https://example.com/api/test', {
      method: 'POST'
    });
    const response = await validateBodySize(request);

    assert.strictEqual(response, null);
  });
});

describe('Middleware - Rate Limiting', () => {
  beforeEach(() => {
    rateLimitStore.clear();
  });

  it('should apply 10/min limit to auth routes', () => {
    const request = new NextRequest('https://example.com/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.1' }
    });

    for (let i = 1; i <= 10; i++) {
      const result = applyRateLimit(request);
      assert.ok(!result.status, `Request ${i} should succeed`);
      assert.strictEqual(result.headers.get('X-RateLimit-Limit'), '10');
      assert.strictEqual(result.headers.get('X-RateLimit-Remaining'), (10 - i).toString());
    }

    // 11th request should be rate limited
    const blockedResult = applyRateLimit(request);
    assert.strictEqual(blockedResult.status, 429);
    assert.strictEqual(blockedResult.headers.get('X-RateLimit-Limit'), '10');
    assert.strictEqual(blockedResult.headers.get('X-RateLimit-Remaining'), '0');
  });

  it('should apply 50/min limit to write routes', () => {
    const request = new NextRequest('https://example.com/api/bills', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.2' }
    });

    for (let i = 1; i <= 50; i++) {
      const result = applyRateLimit(request);
      assert.ok(!result.status, `Request ${i} should succeed`);
      assert.strictEqual(result.headers.get('X-RateLimit-Limit'), '50');
    }

    const blockedResult = applyRateLimit(request);
    assert.strictEqual(blockedResult.status, 429);
  });

  it('should apply 100/min limit to general routes', () => {
    const request = new NextRequest('https://example.com/api/health', {
      method: 'GET',
      headers: { 'x-forwarded-for': '192.168.1.3' }
    });

    const result = applyRateLimit(request);
    assert.ok(!result.status);
    assert.strictEqual(result.headers.get('X-RateLimit-Limit'), '100');
    assert.strictEqual(result.headers.get('X-RateLimit-Remaining'), '99');
  });

  it('should isolate rate limits by IP address', () => {
    const request1 = new NextRequest('https://example.com/api/auth/verify', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.4' }
    });
    const request2 = new NextRequest('https://example.com/api/auth/verify', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.5' }
    });

    for (let i = 0; i < 10; i++) {
      applyRateLimit(request1);
    }
    const result1 = applyRateLimit(request1);
    assert.strictEqual(result1.status, 429);

    const result2 = applyRateLimit(request2);
    assert.ok(!result2.status);
    assert.strictEqual(result2.headers.get('X-RateLimit-Remaining'), '9');
  });

  it('should reset rate limit after window expires', () => {
    const now = Date.now();
    const request = new NextRequest('https://example.com/api/auth/login', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.6' }
    });

    // Fill the bucket
    for (let i = 0; i < 10; i++) {
      applyRateLimit(request);
    }
    const blocked = applyRateLimit(request);
    assert.strictEqual(blocked.status, 429);

    // Simulate time passage by manually resetting
    const ip = '192.168.1.6';
    const pathname = '/api/auth/login';
    const key = `${ip}:${pathname}`;
    rateLimitStore.set(key, { count: 0, resetAt: now - 1000 });

    // Should succeed after reset
    const result = applyRateLimit(request);
    assert.ok(!result.status);
    assert.strictEqual(result.headers.get('X-RateLimit-Remaining'), '9');
  });

  it('should include X-RateLimit-Reset header', () => {
    const request = new NextRequest('https://example.com/api/health', {
      method: 'GET',
      headers: { 'x-forwarded-for': '192.168.1.7' }
    });

    const result = applyRateLimit(request);
    const resetHeader = result.headers.get('X-RateLimit-Reset');
    assert.ok(resetHeader);
    const resetTime = parseInt(resetHeader, 10);
    assert.ok(resetTime > Math.floor(Date.now() / 1000));
  });

  it('should handle missing IP headers gracefully', () => {
    const request = new NextRequest('https://example.com/api/test', {
      method: 'GET'
    });

    const result = applyRateLimit(request);
    assert.ok(!result.status);
    assert.strictEqual(result.headers.get('X-RateLimit-Limit'), '100');
  });

  it('should apply correct tier to goals write endpoints', () => {
    const request = new NextRequest('https://example.com/api/goals/123/add', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.8' }
    });

    const result = applyRateLimit(request);
    assert.strictEqual(result.headers.get('X-RateLimit-Limit'), '50');
  });
});
