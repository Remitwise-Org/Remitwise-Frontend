import { prisma } from '@/lib/prisma';
import { recordAuditEvent } from '@/lib/admin/audit';

export interface WebhookEventPayload {
  event_type: string;
  transaction_id?: string;
  [key: string]: any;
}

export interface WebhookProcessResult {
  success: boolean;
  error?: string;
  status?: 'not_found' | 'skipped' | 'conflict' | 'retry_later' | 'failed' | 'dlq' | 'processed';
  retryable?: boolean;
  retryAfterMs?: number;
}

/**
 * Configuration for webhook retry policy
 */
export const WEBHOOK_RETRY_CONFIG = {
  maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES || '5', 10),
  initialDelayMs: parseInt(process.env.WEBHOOK_INITIAL_DELAY_MS || '1000', 10),
  backoffMultiplier: parseFloat(process.env.WEBHOOK_BACKOFF_MULTIPLIER || '2'),
  maxDelayMs: parseInt(process.env.WEBHOOK_MAX_DELAY_MS || '60000', 10), // 1 minute max
  leaseTimeoutMs: parseInt(process.env.WEBHOOK_LEASE_TIMEOUT_MS || '30000', 10),
};

/**
 * Calculate the deterministic retry delay before jitter is applied.
 */
export function calculateRetryAfterMs(
  retryCount: number,
  config: typeof WEBHOOK_RETRY_CONFIG = WEBHOOK_RETRY_CONFIG
): number {
  return Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, retryCount),
    config.maxDelayMs
  );
}

/**
 * Calculate the next retry time based on retry count and backoff strategy.
 * Uses exponential backoff with jitter.
 */
export function calculateNextRetryTime(
  retryCount: number,
  config: typeof WEBHOOK_RETRY_CONFIG = WEBHOOK_RETRY_CONFIG
): Date {
  const baseDelay = calculateRetryAfterMs(retryCount, config);

  // Add jitter (0-20% random variation)
  const jitter = baseDelay * 0.2 * Math.random();
  const delayMs = baseDelay + jitter;

  return new Date(Date.now() + delayMs);
}

/**
 * Save a webhook event to the database.
 * Returns the created event ID.
 */
export async function saveWebhookEvent(
  source: string,
  eventType: string,
  rawPayload: string | Record<string, any>
): Promise<string> {
  const payloadStr = typeof rawPayload === 'string' ? rawPayload : JSON.stringify(rawPayload);

  const event = await prisma.webhookEvent.create({
    data: {
      source,
      eventType,
      rawPayload: payloadStr,
      status: 'pending',
      retryCount: 0,
      maxRetries: WEBHOOK_RETRY_CONFIG.maxRetries,
      nextRetryAt: calculateNextRetryTime(0),
    },
  });

  return event.id;
}

/**
 * Process a pending webhook event. Calls the handler and tracks retries.
 * Moves to DLQ if max retries exceeded.
 */
export async function processWebhookEvent(
  eventId: string,
  handler: (payload: Record<string, any>) => Promise<WebhookProcessResult>
): Promise<WebhookProcessResult> {
  let event: Awaited<ReturnType<typeof prisma.webhookEvent.findUnique>>;
  let claimed = false;
  let processingStartedAt: Date | undefined;

  try {
    event = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      console.warn(`[WebhookProcessor] Event not found: ${eventId}`);
      return { success: false, error: 'Event not found', status: 'not_found', retryable: false };
    }

    // Skip if already processed or in DLQ
    if (event.status === 'processed' || event.status === 'dlq') {
      return { success: true, status: 'skipped' };
    }

    const now = new Date();
    const staleProcessingBefore = new Date(
      now.getTime() - WEBHOOK_RETRY_CONFIG.leaseTimeoutMs
    );

    // Check if it's time to retry
    if (event.status === 'failed' && event.nextRetryAt && event.nextRetryAt > now) {
      return {
        success: false,
        error: 'Retry not due yet',
        status: 'retry_later',
        retryable: true,
        retryAfterMs: event.nextRetryAt.getTime() - now.getTime(),
      };
    }

    // Claim the event atomically. A concurrent worker can observe the same
    // event, but only the worker that changes the current state may execute
    // the handler. This prevents duplicate side effects and stale replays.
    const claim = await prisma.webhookEvent.updateMany({
      where: {
        id: eventId,
        OR: [
          { status: 'pending' },
          { status: 'failed', nextRetryAt: { lte: now } },
          { status: 'processing', updatedAt: { lte: staleProcessingBefore } },
        ],
      },
      data: {
        status: 'processing',
        updatedAt: now,
        nextRetryAt: new Date(now.getTime() + WEBHOOK_RETRY_CONFIG.leaseTimeoutMs),
      },
    });

    if (claim.count !== 1) {
      return {
        success: false,
        error: 'Event is already being processed',
        status: 'conflict',
        retryable: true,
        retryAfterMs: WEBHOOK_RETRY_CONFIG.leaseTimeoutMs,
      };
    }

    claimed = true;

    // Re-read after claiming so the payload and updatedAt token are fresh.
    event = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return { success: false, error: 'Event disappeared after claim', status: 'not_found', retryable: false };
    }

    processingStartedAt = event.updatedAt;

    // Parse and process the payload
    const payload = JSON.parse(event.rawPayload);
    const result = await handler(payload);

    if (result.success) {
      // Mark as processed only if this worker still owns the claim.
      const updated = await prisma.webhookEvent.updateMany({
        where: { id: eventId, status: 'processing', updatedAt: processingStartedAt! },
        data: {
          status: 'processed',
          processedAt: new Date(),
          nextRetryAt: null,
          updatedAt: new Date(),
        },
      });

      if (updated.count !== 1) {
        console.warn(`[WebhookProcessor] Lost claim while finalizing event: ${eventId}`);
        return {
          success: false,
          error: 'Lost claim before finalizing event',
          status: 'conflict',
          retryable: true,
          retryAfterMs: WEBHOOK_RETRY_CONFIG.leaseTimeoutMs,
        };
      }

      console.log(`[WebhookProcessor] Event processed successfully: ${eventId}`);
      return { success: true, status: 'processed' };
    }

    // Handle failure with retry logic
    return await handleWebhookProcessingFailure(
      eventId,
      result.error || 'Unknown error',
      processingStartedAt
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[WebhookProcessor] Error processing event ${eventId}:`, error);

    if (claimed && processingStartedAt) {
      return await handleWebhookProcessingFailure(eventId, message, processingStartedAt);
    }

    return {
      success: false,
      error: message,
      status: 'failed',
      retryable: true,
      retryAfterMs: WEBHOOK_RETRY_CONFIG.initialDelayMs,
    };
  }
}

/**
 * Handle webhook processing failure: retry or move to DLQ
 */
export async function handleWebhookProcessingFailure(
  eventId: string,
  errorMessage: string
  expectedUpdatedAt?: Date
): Promise<WebhookProcessResult> {
  try {
    const event = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!event || event.status !== 'processing') {
      return { success: false, error: 'Event is not processing', status: 'conflict', retryable: false };
    }

    if (expectedUpdatedAt && event.updatedAt.getTime() !== expectedUpdatedAt.getTime()) {
      return { success: false, error: 'Lost claim before failure handling', status: 'conflict', retryable: false };
    }

    const nextRetryCount = event.retryCount + 1;

    if (nextRetryCount > event.maxRetries) {
      // Move to DLQ
      const updated = await prisma.webhookEvent.updateMany({
        where: {
          id: eventId,
          status: 'processing',
          ...(expectedUpdatedAt ? { updatedAt: expectedUpdatedAt } : {}),
        },
        data: {
          status: 'dlq',
          lastError: errorMessage,
          updatedAt: new Date(),
        },
      });

      if (updated.count !== 1) {
        return { success: false, error: 'Lost claim while moving to DLQ', status: 'conflict', retryable: false };
      }

      recordAuditEvent({
        type: 'webhook.dlq',
        actor: 'webhook-processor',
        message: `Webhook event moved to DLQ after ${event.maxRetries} retries: ${event.source}/${event.eventType}`,
        metadata: {
          eventId,
          source: event.source,
          eventType: event.eventType,
          lastError: errorMessage,
        },
      });

      console.warn(`[WebhookProcessor] Event moved to DLQ: ${eventId}`);
      return { success: false, error: errorMessage, status: 'dlq', retryable: false };
    } else {
      // Schedule retry
      const nextRetryAt = calculateNextRetryTime(nextRetryCount);
      const updated = await prisma.webhookEvent.updateMany({
        where: {
          id: eventId,
          status: 'processing',
          ...(expectedUpdatedAt ? { updatedAt: expectedUpdatedAt } : {}),
        },
        data: {
          status: 'failed',
          retryCount: nextRetryCount,
          lastError: errorMessage,
          nextRetryAt,
          updatedAt: new Date(),
        },
      });

      if (updated.count !== 1) {
        return { success: false, error: 'Lost claim while scheduling retry', status: 'conflict', retryable: false };
      }

      console.log(
        `[WebhookProcessor] Event scheduled for retry ${nextRetryCount}/${event.maxRetries}: ${eventId}`
      );
      return {
        success: false,
        error: errorMessage,
        status: 'failed',
        retryable: true,
        retryAfterMs: calculateRetryAfterMs(nextRetryCount),
      };
    }
  } catch (error) {
    console.error(`[WebhookProcessor] Error handling failure for ${eventId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'failed',
      retryable: true,
      retryAfterMs: WEBHOOK_RETRY_CONFIG.initialDelayMs,
    };
  }
}

/**
 * Get all pending webhook events that are ready to be processed
 */
export async function getPendingWebhookEvents(limit: number = 100) {
  const now = new Date();
  const staleProcessingBefore = new Date(
    now.getTime() - WEBHOOK_RETRY_CONFIG.leaseTimeoutMs
  );
  return prisma.webhookEvent.findMany({
    where: {
      OR: [
        { status: 'pending' },
        {
          status: 'failed',
          nextRetryAt: { lte: now },
        },
        {
          status: 'processing',
          updatedAt: { lte: staleProcessingBefore },
        },
      ],
    },
    orderBy: [{ createdAt: 'asc' }],
    take: limit,
  });
}

/**
 * Get dead-letter queue events with optional filtering
 */
export async function getDLQEvents(
  limit: number = 50,
  offset: number = 0,
  source?: string
) {
  const where: any = { status: 'dlq' };
  if (source) {
    where.source = source;
  }

  const [items, total] = await Promise.all([
    prisma.webhookEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.webhookEvent.count({ where }),
  ]);

  return {
    items,
    total,
    limit,
    offset,
  };
}

/**
 * Replay a dead-letter queue event (reset to pending)
 */
export async function replayDLQEvent(eventId: string): Promise<boolean> {
  try {
    const event = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!event || event.status !== 'dlq') {
      return false;
    }

    const replayed = await prisma.webhookEvent.updateMany({
      where: { id: eventId, status: 'dlq' },
      data: {
        status: 'pending',
        retryCount: 0,
        lastError: null,
        nextRetryAt: calculateNextRetryTime(0),
        updatedAt: new Date(),
      },
    });

    if (replayed.count !== 1) {
      return false;
    }

    recordAuditEvent({
      type: 'webhook.dlq.replay',
      actor: 'admin',
      message: `DLQ webhook event replayed: ${event.source}/${event.eventType}`,
      metadata: {
        eventId,
        source: event.source,
        eventType: event.eventType,
      },
    });

    console.log(`[WebhookProcessor] DLQ event replayed: ${eventId}`);
    return true;
  } catch (error) {
    console.error(`[WebhookProcessor] Error replaying DLQ event ${eventId}:`, error);
    return false;
  }
}

/**
 * Get webhook event statistics
 */
export async function getWebhookEventStats() {
  const [pending, processing, processed, failed, dlq] = await Promise.all([
    prisma.webhookEvent.count({ where: { status: 'pending' } }),
    prisma.webhookEvent.count({ where: { status: 'processing' } }),
    prisma.webhookEvent.count({ where: { status: 'processed' } }),
    prisma.webhookEvent.count({ where: { status: 'failed' } }),
    prisma.webhookEvent.count({ where: { status: 'dlq' } }),
  ]);

  return {
    pending,
    processing,
    processed,
    failed,
    dlq,
    total: pending + processing + processed + failed + dlq,
  };
}
