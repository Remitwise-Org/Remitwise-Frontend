import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockIsAdminAuthorized = vi.hoisted(() => vi.fn<[NextRequest], boolean>());
const mockReplayDLQEvent = vi.hoisted(() => vi.fn<[string], Promise<boolean>>());

vi.mock('@/lib/admin/auth', () => ({
  isAdminAuthorized: mockIsAdminAuthorized,
}));

vi.mock('@/lib/webhooks/processor', () => ({
  replayDLQEvent: mockReplayDLQEvent,
}));

// Import handler after mocks are registered
import { POST } from '@/app/api/v1/admin/webhooks/dlq/[id]/replay/route';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(adminKey?: string): NextRequest {
  const url = 'http://localhost/api/v1/admin/webhooks/dlq/evt_123/replay';
  const headers: HeadersInit = adminKey ? { 'x-admin-key': adminKey } : {};
  return new NextRequest(url, { method: 'POST', headers });
}

function makeParams(id: string) {
  return { params: { id } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/v1/admin/webhooks/dlq/[id]/replay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authorization', () => {
    it('returns 401 when no admin key is provided', async () => {
      mockIsAdminAuthorized.mockReturnValue(false);

      const response = await POST(makeRequest(), makeParams('evt_123'));

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
      expect(mockReplayDLQEvent).not.toHaveBeenCalled();
    });

    it('returns 401 when wrong admin key is provided', async () => {
      mockIsAdminAuthorized.mockReturnValue(false);

      const response = await POST(makeRequest('wrong-key'), makeParams('evt_123'));

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });
  });

  describe('successful replay', () => {
    it('returns 200 and success message when event is replayed', async () => {
      mockIsAdminAuthorized.mockReturnValue(true);
      mockReplayDLQEvent.mockResolvedValue(true);

      const response = await POST(makeRequest('valid-admin-key'), makeParams('evt_123'));

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('evt_123');
      expect(mockReplayDLQEvent).toHaveBeenCalledWith('evt_123');
    });

    it('passes the correct event id from params to replayDLQEvent', async () => {
      mockIsAdminAuthorized.mockReturnValue(true);
      mockReplayDLQEvent.mockResolvedValue(true);

      await POST(makeRequest('valid-admin-key'), makeParams('evt_456'));

      expect(mockReplayDLQEvent).toHaveBeenCalledWith('evt_456');
    });
  });

  describe('event not found / not in DLQ', () => {
    it('returns 404 when replayDLQEvent returns false', async () => {
      mockIsAdminAuthorized.mockReturnValue(true);
      mockReplayDLQEvent.mockResolvedValue(false);

      const response = await POST(makeRequest('valid-admin-key'), makeParams('nonexistent'));

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Event not found or not in DLQ');
    });
  });

  describe('error handling', () => {
    it('returns 500 when replayDLQEvent throws', async () => {
      mockIsAdminAuthorized.mockReturnValue(true);
      mockReplayDLQEvent.mockRejectedValue(new Error('DB connection failed'));

      const response = await POST(makeRequest('valid-admin-key'), makeParams('evt_789'));

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Failed to replay event');
    });
  });
});
