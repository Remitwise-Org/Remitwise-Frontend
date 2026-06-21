import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Initialize fake timers before any modules are loaded
vi.useFakeTimers();

// Dynamically import to ensure setInterval is bound to fake timers
const {
    storeIdempotencyRecord,
    checkIdempotencyKey,
    deleteIdempotencyRecord,
    clearIdempotencyStore,
    getStoreSize,
    getIdempotencyKey,
    checkIdempotency,
    storeIdempotentResponse,
    withIdempotency,
    IDEMPOTENCY_CONFIG,
} = await import('../../../lib/idempotency');

describe('Idempotency Store Unit Tests', () => {
    beforeEach(() => {
        clearIdempotencyStore();
    });

    it('should store and retrieve records', () => {
        const key = 'test-key';
        const requestHash = 'hash-123';
        const response = { status: 200, body: { success: true }, headers: { 'content-type': 'application/json' } };

        storeIdempotencyRecord(key, requestHash, response);

        const check = checkIdempotencyKey(key, requestHash);
        expect(check.exists).toBe(true);
        expect(check.conflict).toBe(false);
        expect(check.record?.key).toBe(key);
        expect(check.record?.requestHash).toBe(requestHash);
        expect(check.record?.response).toEqual(response);
    });

    it('should return conflict: true when request body/hash differs', () => {
        const key = 'test-key';
        const response = { status: 200, body: { success: true } };

        storeIdempotencyRecord(key, 'hash-original', response);

        const check = checkIdempotencyKey(key, 'hash-different');
        expect(check.exists).toBe(true);
        expect(check.conflict).toBe(true);
        expect(check.record?.requestHash).toBe('hash-original');
    });

    it('should return exists: false when key does not exist', () => {
        const check = checkIdempotencyKey('non-existent', 'some-hash');
        expect(check.exists).toBe(false);
        expect(check.conflict).toBe(false);
    });

    it('should respect TTL boundaries (just-before vs just-after expiry)', () => {
        const key = 'ttl-key';
        const requestHash = 'hash-123';
        const response = { status: 200, body: { success: true } };
        const ttl = 1000; // 1 second

        storeIdempotencyRecord(key, requestHash, response, ttl);

        // Advance time to just before expiry
        vi.advanceTimersByTime(ttl - 1);
        let check = checkIdempotencyKey(key, requestHash);
        expect(check.exists).toBe(true);

        // Advance time past expiry
        vi.advanceTimersByTime(2);
        check = checkIdempotencyKey(key, requestHash);
        expect(check.exists).toBe(false);
        expect(getStoreSize()).toBe(0);
    });

    it('should handle boundary expiry conditions (exactly at expiry)', () => {
        const key = 'boundary-key';
        const requestHash = 'hash-123';
        const response = { status: 200, body: {} };
        const ttl = 1000;

        storeIdempotencyRecord(key, requestHash, response, ttl);

        // Advance time to exactly the expiry timestamp
        vi.advanceTimersByTime(ttl);
        
        // Since store.ts uses `record.expiresAt < Date.now()` (strict inequality),
        // at exactly the boundary, it should NOT be expired.
        const check = checkIdempotencyKey(key, requestHash);
        expect(check.exists).toBe(true);

        // Moving 1ms past the boundary makes it expired
        vi.advanceTimersByTime(1);
        const checkPast = checkIdempotencyKey(key, requestHash);
        expect(checkPast.exists).toBe(false);
    });

    it('should run cleanup sweep on interval and remove only expired records', () => {
        // 1. Expiring in 30 minutes
        storeIdempotencyRecord('expired-soon', 'h1', { status: 200, body: {} }, 30 * 60 * 1000);
        // 2. Expiring in 2 hours
        storeIdempotencyRecord('lasts-longer', 'h2', { status: 200, body: {} }, 2 * 60 * 60 * 1000);
        // 3. Expiring in 10 seconds
        storeIdempotencyRecord('expired-very-soon', 'h3', { status: 200, body: {} }, 10 * 1000);

        expect(getStoreSize()).toBe(3);

        // The store registers setInterval for cleanupExpired with 1 hour interval (60 * 60 * 1000)
        // Advance time by 1 hour (3600000 ms) to trigger the cleanup interval
        vi.advanceTimersByTime(60 * 60 * 1000);

        // 'expired-soon' and 'expired-very-soon' should be removed
        expect(checkIdempotencyKey('expired-soon', 'h1').exists).toBe(false);
        expect(checkIdempotencyKey('expired-very-soon', 'h3').exists).toBe(false);
        
        // 'lasts-longer' should still be active
        expect(checkIdempotencyKey('lasts-longer', 'h2').exists).toBe(true);
        expect(getStoreSize()).toBe(1);
    });

    it('should delete a record manually', () => {
        storeIdempotencyRecord('key1', 'hash', { status: 200, body: {} });
        expect(getStoreSize()).toBe(1);

        const deleted = deleteIdempotencyRecord('key1');
        expect(deleted).toBe(true);
        expect(getStoreSize()).toBe(0);

        const deleteAgain = deleteIdempotencyRecord('key1');
        expect(deleteAgain).toBe(false);
    });

    it('should handle large key values', () => {
        const largeKey = 'a'.repeat(10000); // 10,000 characters
        const hash = 'h';
        const response = { status: 200, body: { data: 'large-key-test' } };

        storeIdempotencyRecord(largeKey, hash, response);
        expect(getStoreSize()).toBe(1);

        const check = checkIdempotencyKey(largeKey, hash);
        expect(check.exists).toBe(true);
        expect(check.record?.response.body.data).toBe('large-key-test');
    });
});

describe('Idempotency Middleware Unit Tests', () => {
    beforeEach(() => {
        clearIdempotencyStore();
    });

    it('should extract idempotency key correctly', () => {
        const req = new NextRequest('http://localhost/api/test', {
            method: 'POST',
            headers: {
                'idempotency-key': 'key-abc-123',
            },
        });

        const key = getIdempotencyKey(req);
        expect(key).toBe('key-abc-123');
    });

    it('should return null if idempotency key header is missing', () => {
        const req = new NextRequest('http://localhost/api/test', { method: 'POST' });
        expect(getIdempotencyKey(req)).toBeNull();
    });

    it('should return null in checkIdempotency when key is missing', async () => {
        const req = new NextRequest('http://localhost/api/test', { method: 'POST' });
        const res = await checkIdempotency(req, { foo: 'bar' });
        expect(res).toBeNull();
    });

    it('should return null in checkIdempotency when key is seen for the first time', async () => {
        const req = new NextRequest('http://localhost/api/test', {
            method: 'POST',
            headers: { 'idempotency-key': 'key-first-time' }
        });
        const res = await checkIdempotency(req, { foo: 'bar' });
        expect(res).toBeNull();
    });

    it('should return 409 conflict when request body does not match cached body', async () => {
        const req = new NextRequest('http://localhost/api/test', {
            method: 'POST',
            headers: { 'idempotency-key': 'key-conflict' }
        });

        // Store response first with one body
        const body1 = { amount: 100 };
        storeIdempotentResponse(req, body1, { status: 200, body: { txId: '1' } });

        // Query with different body
        const body2 = { amount: 200 };
        const res = await checkIdempotency(req, body2);

        expect(res).not.toBeNull();
        expect(res!.status).toBe(409);
        const data = await res!.json();
        expect(data.error).toBe('Idempotency Key Conflict');
    });

    it('should return cached response with replay header on matching replay', async () => {
        const req = new NextRequest('http://localhost/api/test', {
            method: 'POST',
            headers: { 'idempotency-key': 'key-replay' }
        });

        const body = { amount: 100 };
        const originalResponse = { status: 201, body: { txId: '123' }, headers: { 'custom-header': 'yes' } };
        storeIdempotentResponse(req, body, originalResponse);

        const res = await checkIdempotency(req, body);
        expect(res).not.toBeNull();
        expect(res!.status).toBe(201);
        
        const data = await res!.json();
        expect(data).toEqual({ txId: '123' });
        expect(res!.headers.get('X-Idempotent-Replay')).toBe('true');
        expect(res!.headers.get('custom-header')).toBe('yes');
    });

    it('should handle withIdempotency successfully for a new request', async () => {
        const req = new NextRequest('http://localhost/api/test', {
            method: 'POST',
            headers: { 'idempotency-key': 'key-with-idempotency' },
            body: JSON.stringify({ transfer: 'usd' }),
        });

        let handlerCalled = 0;
        const handler = async (body: any) => {
            handlerCalled++;
            return NextResponse.json({ processed: body.transfer }, { status: 200 });
        };

        const res = await withIdempotency(req, handler);
        expect(handlerCalled).toBe(1);
        expect(res.status).toBe(200);
        
        const data = await res.json();
        expect(data).toEqual({ processed: 'usd' });

        // Verifying cache was populated: subsequent request should return cached and not call handler
        const req2 = new NextRequest('http://localhost/api/test', {
            method: 'POST',
            headers: { 'idempotency-key': 'key-with-idempotency' },
            body: JSON.stringify({ transfer: 'usd' }),
        });
        const res2 = await withIdempotency(req2, handler);
        expect(handlerCalled).toBe(1); // handler not called again
        expect(res2.status).toBe(200);
        expect(res2.headers.get('X-Idempotent-Replay')).toBe('true');
    });

    it('should return 400 when request body is invalid JSON in withIdempotency', async () => {
        const req = new NextRequest('http://localhost/api/test', {
            method: 'POST',
            headers: { 'idempotency-key': 'key-invalid-json' },
            body: 'invalid-non-json-string',
        });

        const handler = async () => NextResponse.json({ ok: true });
        const res = await withIdempotency(req, handler);
        
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe('Invalid JSON body');
    });

    it('should NOT cache non-2xx successful responses', async () => {
        const req = new NextRequest('http://localhost/api/test', {
            method: 'POST',
            headers: { 'idempotency-key': 'key-failed-status' },
            body: JSON.stringify({ value: 'val' }),
        });

        let statusToReturn = 500;
        const handler = async () => NextResponse.json({ error: 'failed' }, { status: statusToReturn });

        const res1 = await withIdempotency(req, handler);
        expect(res1.status).toBe(500);

        // Verify it was not stored
        expect(getStoreSize()).toBe(0);
    });

    it('should do nothing in storeIdempotentResponse if key is missing', () => {
        const req = new NextRequest('http://localhost/api/test', { method: 'POST' });
        storeIdempotentResponse(req, { value: 'val' }, { status: 200, body: {} });
        expect(getStoreSize()).toBe(0);
    });

    it('should hash request body correctly if it is a string', async () => {
        const req = new NextRequest('http://localhost/api/test', {
            method: 'POST',
            headers: { 'idempotency-key': 'key-string-body' }
        });
        const body = 'plain-string-body';
        storeIdempotentResponse(req, body, { status: 200, body: { ok: true } });

        const res = await checkIdempotency(req, body);
        expect(res).not.toBeNull();
        const data = await res!.json();
        expect(data).toEqual({ ok: true });
    });

    it('should demonstrate concurrent identical requests vulnerability (race condition due to missing in-flight state)', async () => {
        const req1 = new NextRequest('http://localhost/api/test', {
            method: 'POST',
            headers: { 'idempotency-key': 'concurrent-key' },
            body: JSON.stringify({ action: 'pay' }),
        });
        const req2 = new NextRequest('http://localhost/api/test', {
            method: 'POST',
            headers: { 'idempotency-key': 'concurrent-key' },
            body: JSON.stringify({ action: 'pay' }),
        });

        let handlerCallCount = 0;
        const handler = async (body: any) => {
            handlerCallCount++;
            // Yield control using microtasks to simulate async processing without blocking on fake timers
            await Promise.resolve();
            await Promise.resolve();
            return NextResponse.json({ done: true }, { status: 200 });
        };

        // Invoke both concurrently
        const [res1, res2] = await Promise.all([
            withIdempotency(req1, handler),
            withIdempotency(req2, handler)
        ]);

        // Since req1 hasn't stored the result before req2 checks, both handlers get executed
        expect(handlerCallCount).toBe(2);
        expect(res1.status).toBe(200);
        expect(res2.status).toBe(200);
    });
});

describe('Configuration Integration Unit Tests', () => {
    it('should align configuration constants with implementation defaults', () => {
        // Although the config file is not imported directly by the store/middleware,
        // we verify the configuration aligns with the hardcoded values in store/middleware.
        expect(IDEMPOTENCY_CONFIG.DEFAULT_TTL_MS).toBe(24 * 60 * 60 * 1000);
        expect(IDEMPOTENCY_CONFIG.CLEANUP_INTERVAL_MS).toBe(60 * 60 * 1000);
        expect(IDEMPOTENCY_CONFIG.HEADER_NAME).toBe('idempotency-key');
        expect(IDEMPOTENCY_CONFIG.REPLAY_HEADER_NAME).toBe('x-idempotent-replay');
    });
});
