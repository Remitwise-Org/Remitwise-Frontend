import { beforeEach, describe, expect, it, vi } from 'vitest';

const prisma = vi.hoisted(() => ({
  webhookEvent: {
    findUnique: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/admin/audit', () => ({ recordAuditEvent: vi.fn() }));

import {
  processWebhookEvent,
  replayDLQEvent,
} from '@/lib/webhooks/processor';

describe('webhook concurrency boundaries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invokes a handler only for the worker that atomically claims the event', async () => {
    prisma.webhookEvent.findUnique.mockResolvedValue({
      id: 'event-1', status: 'pending', retryCount: 0, maxRetries: 3,
      nextRetryAt: null, rawPayload: '{}', source: 'test', eventType: 'created',
    });
    prisma.webhookEvent.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const handler = vi.fn().mockResolvedValue({ success: true });
    await Promise.all([
      processWebhookEvent('event-1', handler),
      processWebhookEvent('event-1', handler),
    ]);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(prisma.webhookEvent.updateMany).toHaveBeenCalledTimes(2);
  });

  it('does not overwrite a state transition when failure handling loses the processing claim', async () => {
    prisma.webhookEvent.findUnique.mockResolvedValue({
      id: 'event-2', status: 'processing', retryCount: 0, maxRetries: 3,
      nextRetryAt: null, rawPayload: '{}', source: 'test', eventType: 'created',
    });
    prisma.webhookEvent.updateMany.mockResolvedValue({ count: 0 });

    const handler = vi.fn().mockResolvedValue({ success: false, error: 'temporary' });
    await processWebhookEvent('event-2', handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(prisma.webhookEvent.updateMany).toHaveBeenCalledTimes(1);
  });

  it('allows only one concurrent DLQ replay and reports the loser as stale', async () => {
    prisma.webhookEvent.findUnique.mockResolvedValue({
      id: 'event-3', status: 'dlq', source: 'test', eventType: 'failed',
    });
    prisma.webhookEvent.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const results = await Promise.all([
      replayDLQEvent('event-3'),
      replayDLQEvent('event-3'),
    ]);

    expect(results.sort()).toEqual([false, true]);
  });
});
