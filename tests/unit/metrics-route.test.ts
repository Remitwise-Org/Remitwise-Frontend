import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockIsAdminAuthorized = vi.hoisted(() => vi.fn<(req: NextRequest) => boolean>());
const mockGetAdminIdentity = vi.hoisted(() => vi.fn<(req: NextRequest) => string>());
const mockRecordAuditEvent = vi.hoisted(() => vi.fn());

vi.mock('@/lib/admin/auth', () => ({
  isAdminAuthorized: mockIsAdminAuthorized,
  getAdminIdentity: mockGetAdminIdentity,
}));

vi.mock('@/lib/admin/audit', () => ({
  recordAuditEvent: mockRecordAuditEvent,
}));

const mockMetrics = vi.hoisted(() => ({ requests: 42, rateLimited: 3 }));
vi.mock('@/middleware', () => ({
  metrics: mockMetrics,
}));

// Import handler after mocks are registered
import { GET } from '@/app/api/metrics/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(adminKey?: string): NextRequest {
  const url = 'http://localhost/api/metrics';
  const headers: HeadersInit = adminKey ? { 'x-admin-key': adminKey } : {};
  return new NextRequest(url, { method: 'GET', headers });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAdminIdentity.mockReturnValue('header:x-admin-key');
  });

  describe('authorization', () => {
    it('returns 401 with JSON error when no credentials are provided', async () => {
      mockIsAdminAuthorized.mockReturnValue(false);

      const response = await GET(makeRequest());

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 401 with JSON error when wrong key is provided', async () => {
      mockIsAdminAuthorized.mockReturnValue(false);

      const response = await GET(makeRequest('wrong-key'));

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 401 when ADMIN_SECRET is unset (guard returns false)', async () => {
      mockIsAdminAuthorized.mockReturnValue(false);

      const response = await GET(makeRequest('any-key'));

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('does not record an audit event when unauthorized', async () => {
      mockIsAdminAuthorized.mockReturnValue(false);

      await GET(makeRequest());

      expect(mockRecordAuditEvent).not.toHaveBeenCalled();
    });
  });

  describe('authorized access', () => {
    it('returns 200 with metrics when correct key is provided', async () => {
      mockIsAdminAuthorized.mockReturnValue(true);

      const response = await GET(makeRequest('correct-secret'));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual(mockMetrics);
    });

    it('records an audit event with type and actor on authorized access', async () => {
      mockIsAdminAuthorized.mockReturnValue(true);
      mockGetAdminIdentity.mockReturnValue('header:x-admin-key');

      await GET(makeRequest('correct-secret'));

      expect(mockRecordAuditEvent).toHaveBeenCalledOnce();
      expect(mockRecordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'admin.metrics.read',
          actor: 'header:x-admin-key',
        }),
      );
    });

    it('records an audit event with cookie actor identity', async () => {
      mockIsAdminAuthorized.mockReturnValue(true);
      mockGetAdminIdentity.mockReturnValue('cookie:admin_key');

      const req = new NextRequest('http://localhost/api/metrics', { method: 'GET' });
      await GET(req);

      expect(mockRecordAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({ actor: 'cookie:admin_key' }),
      );
    });
  });
});
