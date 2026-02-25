/**
 * middleware.ts  (project root – runs in the Edge Runtime)
 *
 * Applies ONLY to /api routes (see `config.matcher` below).
 *
 * Responsibilities:
 *  1. Ensure every request carries an `x-request-id` header.
 *     - Forward the client-supplied value if present.
 *     - Generate a new UUID v4 otherwise.
 *  2. Propagate the same `x-request-id` on the response.
 *  3. Rate limiting per IP address with configurable limits per route type.
 *
 * This is intentionally lightweight — the heavy structured logging is done
 * inside `withApiLogger()` at the route-handler level where we have access
 * to the Node.js runtime and pino.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LRUCache } from 'lru-cache';

// Configuration for Rate Limiting Limits
const RATE_LIMITS = {
    auth: 10,     // 10 req/min for /api/auth/*
    write: 50,    // 50 req/min for POST/PUT/DELETE /api/*
    general: 100, // 100 req/min for GET /api/*
};

// Rate limiting cache: max 10,000 IPs, items expire in 1 minute
const rateLimitCache = new LRUCache<string, { count: number; expiresAt: number }>({
    max: 10000,
    ttl: 60 * 1000, // 1 minute
});

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ── requestId: ensure every request carries one ──
    const incomingId = request.headers.get("x-request-id");
    const requestId = incomingId || crypto.randomUUID();

    // Extract IP or fallback for rate limiting key
    const forwardedFor = request.headers.get('x-forwarded-for');
    let ip = '127.0.0.1';
    if (forwardedFor) {
        ip = forwardedFor.split(',')[0].trim();
    } else {
        const remoteAddr = request.headers.get('x-real-ip');
        if (remoteAddr) {
            ip = remoteAddr;
        }
    }

    // 0. Whitelist test environments (Playwright E2E)
    if (
        request.headers.get('x-playwright-test') === 'true' &&
        process.env.NODE_ENV !== 'production'
    ) {
        return NextResponse.next();
    }

    // 1. Whitelist Health Check
    if (pathname === '/api/health' || pathname.startsWith('/api/health/')) {
        return NextResponse.next();
    }

    // Determine Rate Limit based on route & method
    let limit = RATE_LIMITS.general;

    if (pathname.startsWith('/api/auth/')) {
        limit = RATE_LIMITS.auth;
    } else if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        limit = RATE_LIMITS.write;
    }

    // Construct Cache Key
    let limitType = 'general';
    if (pathname.startsWith('/api/auth/')) {
        limitType = 'auth';
    } else if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
        limitType = 'write';
    }

    const cacheKey = `${ip}:${limitType}`;

    // Check and update cache
    const now = Date.now();
    const tokenRecord = rateLimitCache.get(cacheKey) || { count: 0, expiresAt: now + 60000 };

    if (now > tokenRecord.expiresAt) {
        tokenRecord.count = 0;
        tokenRecord.expiresAt = now + 60000;
    }

    tokenRecord.count += 1;
    rateLimitCache.set(cacheKey, tokenRecord);

    if (tokenRecord.count > limit) {
        // Exceeded limit
        const retryAfter = Math.ceil((tokenRecord.expiresAt - now) / 1000).toString();

        const rateLimitResponse = new NextResponse(
            JSON.stringify({
                error: 'Too Many Requests',
                message: 'Rate limit exceeded.',
            }),
            {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': retryAfter,
                    'X-RateLimit-Limit': limit.toString(),
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': tokenRecord.expiresAt.toString(),
                },
            }
        );
        rateLimitResponse.headers.set("x-request-id", requestId);
        return rateLimitResponse;
    }

    // Allow Request — clone headers to inject requestId for downstream handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-request-id", requestId);

    const response = NextResponse.next({
        request: { headers: requestHeaders },
    });

    // Propagate requestId and rate limit info on the response
    response.headers.set("x-request-id", requestId);
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', (limit - tokenRecord.count).toString());
    response.headers.set('X-RateLimit-Reset', tokenRecord.expiresAt.toString());

    return response;
}

// Config ensures middleware only runs on API routes
export const config = {
    matcher: '/api/:path*',
};
