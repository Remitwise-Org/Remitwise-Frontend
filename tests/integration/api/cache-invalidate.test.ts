import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/cache/invalidate/route';
import { clearCache } from '@/lib/cache/contract-cache';
import * as auth from '@/lib/admin/auth';
import * as idempotency from '@/lib/idempotency/middleware';

// Mock dependencies
vi.mock('@/lib/admin/auth', () => ({
  isAdminAuthorized: vi.fn(),
  getAdminIdentity: vi.fn(() => 'admin-test')
}));

vi.mock('@/lib/idempotency/middleware', () => ({
  checkIdempotency: vi.fn(),
  storeIdempotentResponse: vi.fn()
}));

function createRequest(method: string, body?: any, headers: Record<string, string> = {}): NextRequest {
  const reqHeaders = new Headers(headers);
  return new NextRequest('http://localhost:3000/api/cache/invalidate', {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined
  });
}

describe('Cache Invalidate API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    clearCache(); // Ensure cache is clear between tests
  });

  describe('GET (Cache Stats)', () => {
    it('returns 401 if not authorized', async () => {
      vi.mocked(auth.isAdminAuthorized).mockReturnValue(false);
      const req = createRequest('GET');
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('returns 200 and stats if authorized', async () => {
      vi.mocked(auth.isAdminAuthorized).mockReturnValue(true);
      const req = createRequest('GET');
      const res = await GET(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.stats).toBeDefined();
    });
  });

  describe('POST (Invalidate Cache)', () => {
    it('returns 401 if not authorized', async () => {
      vi.mocked(auth.isAdminAuthorized).mockReturnValue(false);
      const req = createRequest('POST', { clearAll: true });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid body format', async () => {
      vi.mocked(auth.isAdminAuthorized).mockReturnValue(true);
      vi.mocked(idempotency.checkIdempotency).mockResolvedValue(null);
      const req = createRequest('POST', null); // invalid body - fails validateRequestBody size checks or type guard
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it('successfully clears all cache', async () => {
      vi.mocked(auth.isAdminAuthorized).mockReturnValue(true);
      vi.mocked(idempotency.checkIdempotency).mockResolvedValue(null);
      const req = createRequest('POST', { clearAll: true });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(idempotency.storeIdempotentResponse).toHaveBeenCalled();
    });

    it('returns cached response for idempotent request', async () => {
      vi.mocked(auth.isAdminAuthorized).mockReturnValue(true);
      const mockCachedResponse = new Response(JSON.stringify({ cached: true }), { status: 200 }) as any;
      vi.mocked(idempotency.checkIdempotency).mockResolvedValue(mockCachedResponse);
      const req = createRequest('POST', { clearAll: true }, { 'idempotency-key': 'test-key' });
      const res = await POST(req);
      expect(res).toBe(mockCachedResponse);
    });

    it('returns 400 for missing valid operations', async () => {
      vi.mocked(auth.isAdminAuthorized).mockReturnValue(true);
      vi.mocked(idempotency.checkIdempotency).mockResolvedValue(null);
      const req = createRequest('POST', { unknown: true });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });
});
