import { vi, expect, describe, it, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as GET_DLQ } from '@/app/api/v1/admin/webhooks/dlq/route';
import { POST as POST_PROCESS } from '@/app/api/v1/admin/webhooks/process/route';
import { POST as POST_REPLAY } from '@/app/api/v1/admin/webhooks/dlq/[id]/replay/route';

import { getDLQEvents, replayDLQEvent, getWebhookEventStats } from '@/lib/webhooks/processor';
import { processPendingWebhooks } from '@/lib/webhooks/retry';

vi.mock('@/lib/webhooks/processor', () => ({
  getDLQEvents: vi.fn(),
  replayDLQEvent: vi.fn(),
  getWebhookEventStats: vi.fn(),
}));

vi.mock('@/lib/webhooks/retry', () => ({
  processPendingWebhooks: vi.fn(),
}));

describe('Admin Webhook DLQ API Integration Tests', () => {
  const adminSecret = 'test-admin-secret';

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_SECRET = adminSecret;

    // Default mock returns
    vi.mocked(getWebhookEventStats).mockResolvedValue({
      pending: 5,
      processing: 0,
      processed: 20,
      failed: 2,
      dlq: 1,
      total: 28,
    });

    vi.mocked(getDLQEvents).mockResolvedValue({
      items: [
        {
          id: 'dlq-event-1',
          source: 'anchor',
          eventType: 'deposit_failed',
          status: 'dlq',
          retryCount: 5,
          maxRetries: 5,
          lastError: 'Connection timeout',
          nextRetryAt: null,
          processedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          rawPayload: '{}',
        },
      ],
      total: 1,
      limit: 50,
      offset: 0,
    });

    vi.mocked(replayDLQEvent).mockResolvedValue(true);
    vi.mocked(processPendingWebhooks).mockResolvedValue({
      processed: 3,
      failed: 1,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authorization checks', () => {
    it('GET /api/v1/admin/webhooks/dlq rejects unauthorized request', async () => {
      const req = new NextRequest('http://localhost/api/v1/admin/webhooks/dlq');
      const res = await GET_DLQ(req);
      expect(res.status).toBe(401);
    });

    it('POST /api/v1/admin/webhooks/process rejects unauthorized request', async () => {
      const req = new NextRequest('http://localhost/api/v1/admin/webhooks/process', { method: 'POST' });
      const res = await POST_PROCESS(req);
      expect(res.status).toBe(401);
    });

    it('POST /api/v1/admin/webhooks/dlq/[id]/replay rejects unauthorized request', async () => {
      const req = new NextRequest('http://localhost/api/v1/admin/webhooks/dlq/some-id/replay', { method: 'POST' });
      const res = await POST_REPLAY(req, { params: Promise.resolve({ id: 'some-id' }) });
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/admin/webhooks/dlq', () => {
    it('returns DLQ events and stats for authorized requests', async () => {
      const req = new NextRequest('http://localhost/api/v1/admin/webhooks/dlq', {
        headers: { 'x-admin-key': adminSecret },
      });
      const res = await GET_DLQ(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.events).toHaveLength(1);
      expect(body.data.stats.dlq).toBe(1);
    });

    it('limits items using default values', async () => {
      const req = new NextRequest('http://localhost/api/v1/admin/webhooks/dlq', {
        headers: { 'x-admin-key': adminSecret },
      });
      await GET_DLQ(req);
      expect(getDLQEvents).toHaveBeenCalledWith(50, 0, undefined);
    });

    it('clamps limit to maximum 100', async () => {
      const req = new NextRequest('http://localhost/api/v1/admin/webhooks/dlq?limit=250', {
        headers: { 'x-admin-key': adminSecret },
      });
      await GET_DLQ(req);
      expect(getDLQEvents).toHaveBeenCalledWith(100, 0, undefined);
    });

    it('clamps limit to minimum 1', async () => {
      const req = new NextRequest('http://localhost/api/v1/admin/webhooks/dlq?limit=-10', {
        headers: { 'x-admin-key': adminSecret },
      });
      await GET_DLQ(req);
      expect(getDLQEvents).toHaveBeenCalledWith(1, 0, undefined);
    });

    it('honors offset parameter', async () => {
      const req = new NextRequest('http://localhost/api/v1/admin/webhooks/dlq?offset=20', {
        headers: { 'x-admin-key': adminSecret },
      });
      await GET_DLQ(req);
      expect(getDLQEvents).toHaveBeenCalledWith(50, 20, undefined);
    });

    it('applies source filter', async () => {
      const req = new NextRequest('http://localhost/api/v1/admin/webhooks/dlq?source=anchor', {
        headers: { 'x-admin-key': adminSecret },
      });
      await GET_DLQ(req);
      expect(getDLQEvents).toHaveBeenCalledWith(50, 0, 'anchor');
    });
  });

  describe('POST /api/v1/admin/webhooks/process', () => {
    it('manually triggers webhook processing', async () => {
      const req = new NextRequest('http://localhost/api/v1/admin/webhooks/process', {
        method: 'POST',
        headers: { 'x-admin-key': adminSecret },
      });
      const res = await POST_PROCESS(req);
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.processed).toBe(3);
      expect(processPendingWebhooks).toHaveBeenCalledWith(100);
    });

    it('clamps process limit to maximum 500', async () => {
      const req = new NextRequest('http://localhost/api/v1/admin/webhooks/process?limit=1000', {
        method: 'POST',
        headers: { 'x-admin-key': adminSecret },
      });
      await POST_PROCESS(req);
      expect(processPendingWebhooks).toHaveBeenCalledWith(500);
    });

    it('clamps process limit to minimum 1', async () => {
      const req = new NextRequest('http://localhost/api/v1/admin/webhooks/process?limit=0', {
        method: 'POST',
        headers: { 'x-admin-key': adminSecret },
      });
      await POST_PROCESS(req);
      expect(processPendingWebhooks).toHaveBeenCalledWith(100); // 0 or invalid triggers default 100
    });
  });

  describe('POST /api/v1/admin/webhooks/dlq/[id]/replay', () => {
    it('replays a valid DLQ event ID successfully', async () => {
      const req = new NextRequest('http://localhost/api/v1/admin/webhooks/dlq/dlq-event-1/replay', {
        method: 'POST',
        headers: { 'x-admin-key': adminSecret },
      });
      const res = await POST_REPLAY(req, { params: Promise.resolve({ id: 'dlq-event-1' }) });
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.success).toBe(true);
      expect(replayDLQEvent).toHaveBeenCalledWith('dlq-event-1');
    });

    it('returns 404 if event is not found in DLQ', async () => {
      vi.mocked(replayDLQEvent).mockResolvedValueOnce(false);
      const req = new NextRequest('http://localhost/api/v1/admin/webhooks/dlq/unknown-id/replay', {
        method: 'POST',
        headers: { 'x-admin-key': adminSecret },
      });
      const res = await POST_REPLAY(req, { params: Promise.resolve({ id: 'unknown-id' }) });
      expect(res.status).toBe(404);
      expect(replayDLQEvent).toHaveBeenCalledWith('unknown-id');
    });
  });
});
