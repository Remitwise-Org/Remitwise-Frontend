import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateNextRetryTime,
  WEBHOOK_RETRY_CONFIG,
  handleWebhookProcessingFailure,
} from '@/lib/webhooks/processor';
import {
  registerWebhookHandler,
  processPendingWebhooks,
  getRetryPolicyInfo,
} from '@/lib/webhooks/retry';

// Mock Prisma so tests run without a real database
vi.mock('@/lib/db', () => ({
  default: {
    webhookEvent: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock('@/lib/admin/audit', () => ({
  recordAuditEvent: vi.fn(),
}));

import prisma from '@/lib/db';

const mockPrisma = prisma as unknown as {
  webhookEvent: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

describe('WEBHOOK_RETRY_CONFIG defaults', () => {
  it('has maxRetries of 5', () => {
    expect(WEBHOOK_RETRY_CONFIG.maxRetries).toBe(5);
  });

  it('has initialDelayMs of 1000', () => {
    expect(WEBHOOK_RETRY_CONFIG.initialDelayMs).toBe(1000);
  });

  it('has backoffMultiplier of 2', () => {
    expect(WEBHOOK_RETRY_CONFIG.backoffMultiplier).toBe(2);
  });

  it('has maxDelayMs of 60000', () => {
    expect(WEBHOOK_RETRY_CONFIG.maxDelayMs).toBe(60000);
  });
});

describe('calculateNextRetryTime — exponential backoff', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const cfg = {
    maxRetries: 5,
    initialDelayMs: 1000,
    backoffMultiplier: 2,
    maxDelayMs: 60000,
  };

  it('retry 0 produces delay in [initialDelayMs, initialDelayMs * 1.2]', () => {
    const now = Date.now();
    const result = calculateNextRetryTime(0, cfg);
    const delayMs = result.getTime() - now;
    expect(delayMs).toBeGreaterThanOrEqual(1000);
    expect(delayMs).toBeLessThanOrEqual(1200);
  });

  it('retry 1 doubles the base delay', () => {
    const now = Date.now();
    const result = calculateNextRetryTime(1, cfg);
    const delayMs = result.getTime() - now;
    // base = 1000 * 2^1 = 2000; with jitter [2000, 2400]
    expect(delayMs).toBeGreaterThanOrEqual(2000);
    expect(delayMs).toBeLessThanOrEqual(2400);
  });

  it('retry 2 produces 4x base delay', () => {
    const now = Date.now();
    const result = calculateNextRetryTime(2, cfg);
    const delayMs = result.getTime() - now;
    // base = 1000 * 2^2 = 4000; with jitter [4000, 4800]
    expect(delayMs).toBeGreaterThanOrEqual(4000);
    expect(delayMs).toBeLessThanOrEqual(4800);
  });

  it('delay is capped at maxDelayMs regardless of retry count', () => {
    const now = Date.now();
    // retry 10: 1000 * 2^10 = 1,048,576ms — well above maxDelayMs=60000
    const result = calculateNextRetryTime(10, cfg);
    const delayMs = result.getTime() - now;
    expect(delayMs).toBeLessThanOrEqual(60000 * 1.2);
  });

  it('returns a Date object', () => {
    const result = calculateNextRetryTime(0, cfg);
    expect(result).toBeInstanceOf(Date);
  });

  it('retry N+1 delay is always >= retry N delay (monotonic before cap)', () => {
    const now = Date.now();
    // Use Math.random mock = 0 to eliminate jitter and verify monotonicity
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const delays = [0, 1, 2, 3, 4].map(
      (n) => calculateNextRetryTime(n, cfg).getTime() - now
    );
    for (let i = 1; i < delays.length; i++) {
      expect(delays[i]).toBeGreaterThanOrEqual(delays[i - 1]);
    }
    vi.restoreAllMocks();
  });
});

describe('handleWebhookProcessingFailure — DLQ transitions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('moves event to DLQ when retryCount exceeds maxRetries', async () => {
    mockPrisma.webhookEvent.findUnique.mockResolvedValue({
      id: 'evt-1',
      source: 'anchor',
      eventType: 'payment',
      retryCount: 5,
      maxRetries: 5,
      status: 'failed',
    });
    mockPrisma.webhookEvent.update.mockResolvedValue({});

    await handleWebhookProcessingFailure('evt-1', 'timeout');

    expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'evt-1' },
        data: expect.objectContaining({ status: 'dlq' }),
      })
    );
  });

  it('schedules retry when retryCount is below maxRetries', async () => {
    mockPrisma.webhookEvent.findUnique.mockResolvedValue({
      id: 'evt-2',
      source: 'anchor',
      eventType: 'payment',
      retryCount: 2,
      maxRetries: 5,
      status: 'failed',
    });
    mockPrisma.webhookEvent.update.mockResolvedValue({});

    await handleWebhookProcessingFailure('evt-2', 'transient error');

    expect(mockPrisma.webhookEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'evt-2' },
        data: expect.objectContaining({
          status: 'failed',
          retryCount: 3,
          lastError: 'transient error',
        }),
      })
    );
  });

  it('does nothing when event is not found', async () => {
    mockPrisma.webhookEvent.findUnique.mockResolvedValue(null);

    await handleWebhookProcessingFailure('evt-missing', 'error');

    expect(mockPrisma.webhookEvent.update).not.toHaveBeenCalled();
  });

  it('DLQ update includes lastError message', async () => {
    mockPrisma.webhookEvent.findUnique.mockResolvedValue({
      id: 'evt-3',
      source: 'anchor',
      eventType: 'deposit',
      retryCount: 5,
      maxRetries: 5,
      status: 'failed',
    });
    mockPrisma.webhookEvent.update.mockResolvedValue({});

    await handleWebhookProcessingFailure('evt-3', 'connection refused');

    const updateCall = mockPrisma.webhookEvent.update.mock.calls[0][0];
    expect(updateCall.data.lastError).toBe('connection refused');
  });
});

describe('registerWebhookHandler', () => {
  it('registers without throwing', () => {
    expect(() =>
      registerWebhookHandler('test-source', async () => ({ success: true }))
    ).not.toThrow();
  });
});

describe('processPendingWebhooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns zero counts when no pending events', async () => {
    mockPrisma.webhookEvent.findMany.mockResolvedValue([]);

    const result = await processPendingWebhooks();

    expect(result.processed).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.error).toBeUndefined();
  });

  it('returns error string when getPendingWebhookEvents throws', async () => {
    mockPrisma.webhookEvent.findMany.mockRejectedValue(new Error('db down'));

    const result = await processPendingWebhooks();

    expect(result.error).toBe('db down');
    expect(result.processed).toBe(0);
    expect(result.failed).toBe(0);
  });
});

describe('getRetryPolicyInfo', () => {
  it('returns maxRetries matching WEBHOOK_RETRY_CONFIG', () => {
    const info = getRetryPolicyInfo();
    expect(info.maxRetries).toBe(WEBHOOK_RETRY_CONFIG.maxRetries);
  });

  it('returns initialDelayMs matching WEBHOOK_RETRY_CONFIG', () => {
    const info = getRetryPolicyInfo();
    expect(info.initialDelayMs).toBe(WEBHOOK_RETRY_CONFIG.initialDelayMs);
  });

  it('returns a human-readable description string', () => {
    const info = getRetryPolicyInfo();
    expect(typeof info.description).toBe('string');
    expect(info.description.length).toBeGreaterThan(0);
  });
});
