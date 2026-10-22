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
  WEBHOOK_RETRY_CONFIG,
  WebhookProcessResult,
} from '@/lib/webhooks/processor';

function createMockDb(initialRow: any) {
  let row = { ...initialRow };
  const findUnique = vi.fn().mockImplementation(async () => ({ ...row }));
  const updateMany = vi.fn().mockImplementation(async ({ where, data }: any) => {
    if (where.id && where.id !== row.id) return { count: 0 };
    if (where.status && where.status !== row.status) return { count: 0 };
    if (where.updatedAt) {
      if (where.updatedAt instanceof Date) {
        if (row.updatedAt.getTime() !== where.updatedAt.getTime()) return { count: 0 };
      } else if (where.updatedAt.lte) {
        if (row.updatedAt.getTime() > where.updatedAt.lte.getTime()) return { count: 0 };
      }
    }
    if (where.OR) {
      const matches = where.OR.some((cond: any) => {
        if (cond.status && cond.status !== row.status) return false;
        if (cond.nextRetryAt?.lte && row.nextRetryAt && row.nextRetryAt.getTime() > cond.nextRetryAt.lte.getTime()) return false;
        if (cond.updatedAt?.lte && row.updatedAt && row.updatedAt.getTime() > cond.updatedAt.lte.getTime()) return false;
        return true;
      });
      if (!matches) return { count: 0 };
    }

    if (data.status) row.status = data.status;
    if (data.retryCount) {
      if (typeof data.retryCount === 'object' && data.retryCount.increment) {
        row.retryCount += data.retryCount.increment;
      } else {
        row.retryCount = data.retryCount;
      }
    }
    if (data.updatedAt) row.updatedAt = new Date(data.updatedAt);
    if (data.nextRetryAt !== undefined) row.nextRetryAt = data.nextRetryAt ? new Date(data.nextRetryAt) : null;
    if (data.lastError) row.lastError = data.lastError;
    return { count: 1 };
  });

  return {
    getRow: () => row,
    findUnique,
    updateMany,
  };
}

describe('webhook concurrency boundaries', () => {
  beforeEach(() => vi.clearAllMocks());

  it('invokes a handler only for the worker that atomically claims the event', async () => {
    prisma.webhookEvent.findUnique.mockResolvedValue({
      id: 'event-1', status: 'pending', retryCount: 0, maxRetries: 3,
      nextRetryAt: null, rawPayload: '{}', source: 'test', eventType: 'created',
      updatedAt: new Date(),
    });
    // Worker 1 claim (count: 1), Worker 2 claim (count: 0), Worker 1 finalize (count: 1)
    prisma.webhookEvent.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    const handler = vi.fn().mockResolvedValue({ success: true });
    await Promise.all([
      processWebhookEvent('event-1', handler),
      processWebhookEvent('event-1', handler),
    ]);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(prisma.webhookEvent.updateMany).toHaveBeenCalledTimes(3);
  });

  it('does not overwrite a state transition when failure handling loses the processing claim', async () => {
    prisma.webhookEvent.findUnique
      .mockResolvedValueOnce({
        id: 'event-2', status: 'pending', retryCount: 0, maxRetries: 3,
        nextRetryAt: null, rawPayload: '{}', source: 'test', eventType: 'created',
        updatedAt: new Date(),
      })
      .mockResolvedValue({
        id: 'event-2', status: 'processing', retryCount: 0, maxRetries: 3,
        nextRetryAt: null, rawPayload: '{}', source: 'test', eventType: 'created',
        updatedAt: new Date(),
      });
    // Claim succeeds (count: 1), then failure handling loses claim (count: 0)
    prisma.webhookEvent.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    const handler = vi.fn().mockResolvedValue({ success: false, error: 'temporary' });
    await processWebhookEvent('event-2', handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(prisma.webhookEvent.updateMany).toHaveBeenCalledTimes(2);
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

  it('does not run a second handler while the lease is being renewed', async () => {
    vi.useFakeTimers();
    const originalLease = WEBHOOK_RETRY_CONFIG.leaseTimeoutMs;
    WEBHOOK_RETRY_CONFIG.leaseTimeoutMs = 100;

    try {
      const mockDb = createMockDb({
        id: 'event-hb',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        rawPayload: '{}',
        source: 'test',
        eventType: 'created',
        updatedAt: new Date(Date.now()),
        nextRetryAt: null,
      });
      prisma.webhookEvent.findUnique.mockImplementation(mockDb.findUnique);
      prisma.webhookEvent.updateMany.mockImplementation(mockDb.updateMany);

      let slowHandlerInvocations = 0;
      const slowHandler = vi.fn().mockImplementation(async () => {
        slowHandlerInvocations++;
        await new Promise((resolve) => setTimeout(resolve, 350));
        return { success: true };
      });

      const workerAPromise = processWebhookEvent('event-hb', slowHandler);

      // Let Worker A claim and start
      await vi.advanceTimersByTimeAsync(0);

      // t = 150 ms: Worker B attempts
      await vi.advanceTimersByTimeAsync(150);
      const workerB1 = await processWebhookEvent('event-hb', slowHandler);

      // t = 250 ms: Worker B attempts again
      await vi.advanceTimersByTimeAsync(100);
      const workerB2 = await processWebhookEvent('event-hb', slowHandler);

      // t = 350+ ms: Handler resolves
      await vi.advanceTimersByTimeAsync(150);
      const workerAResult = await workerAPromise;

      expect(slowHandlerInvocations).toBe(1);
      expect(slowHandler).toHaveBeenCalledTimes(1);
      expect(workerB1.status).toBe('conflict');
      expect(workerB2.status).toBe('conflict');
      expect(workerAResult.status).toBe('processed');
      expect(mockDb.getRow().status).toBe('processed');
    } finally {
      WEBHOOK_RETRY_CONFIG.leaseTimeoutMs = originalLease;
      vi.useRealTimers();
    }
  });

  it('abandoned attempts count towards maxRetries and move to DLQ', async () => {
    vi.useFakeTimers();
    const originalLease = WEBHOOK_RETRY_CONFIG.leaseTimeoutMs;
    WEBHOOK_RETRY_CONFIG.leaseTimeoutMs = 100;

    try {
      // Start with 1 abandoned claim past the lease
      const mockDb = createMockDb({
        id: 'event-abandoned',
        status: 'processing',
        retryCount: 0,
        maxRetries: 3,
        rawPayload: '{}',
        source: 'test',
        eventType: 'crash',
        updatedAt: new Date(Date.now() - 200),
        nextRetryAt: null,
      });
      prisma.webhookEvent.findUnique.mockImplementation(mockDb.findUnique);
      prisma.webhookEvent.updateMany.mockImplementation(mockDb.updateMany);

      // Reclaim 1 (abandoned claim 2): reclaims stale row, increments retryCount to 1
      const handler1 = vi.fn().mockImplementation(async () => {
        // Worker claims, but dies before finalizing
        return { success: true };
      });
      // Worker 2 claims it
      await processWebhookEvent('event-abandoned', handler1);
      expect(mockDb.getRow().retryCount).toBe(1);
      // Simulate crash: reset status to processing and expire lease (abandoned claim 2)
      mockDb.getRow().status = 'processing';
      mockDb.getRow().updatedAt = new Date(Date.now() - 200);

      // Reclaim 2 (abandoned claim 3): reclaims stale row, increments retryCount to 2
      await processWebhookEvent('event-abandoned', handler1);
      expect(mockDb.getRow().retryCount).toBe(2);
      // Simulate crash: reset status to processing and expire lease (abandoned claim 3)
      mockDb.getRow().status = 'processing';
      mockDb.getRow().updatedAt = new Date(Date.now() - 200);

      // Reclaim 3 (abandoned claim 4): reclaims stale row, increments retryCount to 3
      await processWebhookEvent('event-abandoned', handler1);
      expect(mockDb.getRow().retryCount).toBe(3);
      // Simulate crash: reset status to processing and expire lease (abandoned claim 4)
      mockDb.getRow().status = 'processing';
      mockDb.getRow().updatedAt = new Date(Date.now() - 200);

      // 4 claims have now been abandoned past the lease.
      // The 4th reclaim: retryCount is 3, which equals maxRetries (3).
      // Transition directly to DLQ with lastError: 'LEASE_EXPIRED'; handler is never invoked.
      const fifthHandler = vi.fn().mockResolvedValue({ success: true });
      const dlqResult = await processWebhookEvent('event-abandoned', fifthHandler);

      expect(dlqResult.status).toBe('dlq');
      expect(dlqResult.error).toBe('LEASE_EXPIRED');
      expect(fifthHandler).not.toHaveBeenCalled();
      expect(mockDb.getRow().status).toBe('dlq');
      expect(mockDb.getRow().lastError).toBe('LEASE_EXPIRED');
    } finally {
      WEBHOOK_RETRY_CONFIG.leaseTimeoutMs = originalLease;
      vi.useRealTimers();
    }
  });

  it('heartbeat stops after completion and issues no renewal updateMany', async () => {
    vi.useFakeTimers();
    const originalLease = WEBHOOK_RETRY_CONFIG.leaseTimeoutMs;
    WEBHOOK_RETRY_CONFIG.leaseTimeoutMs = 100;

    try {
      const mockDb = createMockDb({
        id: 'event-stop-hb',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        rawPayload: '{}',
        source: 'test',
        eventType: 'created',
        updatedAt: new Date(Date.now()),
        nextRetryAt: null,
      });
      prisma.webhookEvent.findUnique.mockImplementation(mockDb.findUnique);
      prisma.webhookEvent.updateMany.mockImplementation(mockDb.updateMany);

      const handler = vi.fn().mockResolvedValue({ success: true });
      const result = await processWebhookEvent('event-stop-hb', handler);

      expect(result.status).toBe('processed');
      const callsBefore = prisma.webhookEvent.updateMany.mock.calls.length;

      // Advance fake timers by 10x lease (10 * 100 = 1000 ms)
      await vi.advanceTimersByTimeAsync(1000);

      const callsAfter = prisma.webhookEvent.updateMany.mock.calls.length;
      expect(callsAfter).toBe(callsBefore);
    } finally {
      WEBHOOK_RETRY_CONFIG.leaseTimeoutMs = originalLease;
      vi.useRealTimers();
    }
  });

  it('lost lease discards result and writes no processed transition', async () => {
    vi.useFakeTimers();
    const originalLease = WEBHOOK_RETRY_CONFIG.leaseTimeoutMs;
    WEBHOOK_RETRY_CONFIG.leaseTimeoutMs = 100;

    try {
      prisma.webhookEvent.findUnique.mockResolvedValue({
        id: 'event-lost-lease',
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
        rawPayload: '{}',
        source: 'test',
        eventType: 'created',
        updatedAt: new Date(),
        nextRetryAt: null,
      });

      // Call 1: Claim succeeds ({ count: 1 })
      // Call 2: Heartbeat renewal fails ({ count: 0 })
      prisma.webhookEvent.updateMany
        .mockResolvedValueOnce({ count: 1 })
        .mockResolvedValueOnce({ count: 0 });

      const slowHandler = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        return { success: true };
      });

      const workerPromise = processWebhookEvent('event-lost-lease', slowHandler);

      // Advance timers so heartbeat renewal fires at 33 ms
      await vi.advanceTimersByTimeAsync(50);
      // Advance timers so handler finishes
      await vi.advanceTimersByTimeAsync(150);

      const result = await workerPromise;

      expect(result.status).toBe('conflict');
      expect(result.error).toBe('Lost claim before finalizing event');

      // Verify no processed transition was written
      const processedCalls = prisma.webhookEvent.updateMany.mock.calls.filter((call: any) =>
        call[0]?.data?.status === 'processed'
      );
      expect(processedCalls.length).toBe(0);
    } finally {
      WEBHOOK_RETRY_CONFIG.leaseTimeoutMs = originalLease;
      vi.useRealTimers();
    }
  });
});
