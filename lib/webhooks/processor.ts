import prisma from '@/lib/db';
import { recordAuditEvent } from '@/lib/admin/audit';

export interface WebhookEventPayload {
  event_type: string;
  transaction_id?: string;
  [key: string]: any;
}

export interface WebhookProcessResult {
  success: boolean;
  error?: string;
}

/**
 * Configuration for webhook retry policy
 */
export const WEBHOOK_RETRY_CONFIG = {
  maxRetries: parseInt(process.env.WEBHOOK_MAX_RETRIES || '5', 10),
  initialDelayMs: parseInt(process.env.WEBHOOK_INITIAL_DELAY_MS || '1000', 10),
  backoffMultiplier: parseFloat(process.env.WEBHOOK_BACKOFF_MULTIPLIER || '2'),
  maxDelayMs: parseInt(process.env.WEBHOOK_MAX_DELAY_MS || '60000', 10), // 1 minute max
};

/**
 * Calculate the next retry time based on retry count and backoff strategy.
 * Uses exponential backoff with jitter.
 */
export function calculateNextRetryTime(
  retryCount: number,
  config: typeof WEBHOOK_RETRY_CONFIG = WEBHOOK_RETRY_CONFIG
): Date {
  const baseDelay = Math.min(
    config.initialDelayMs * Math.pow(config.backoffMultiplier, retryCount),
    config.maxDelayMs
  );

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
): Promise<void> {
  try {
    const event = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      console.warn(`[WebhookProcessor] Event not found: ${eventId}`);
      return;
    }

    // Skip if already processed or in DLQ
    if (event.status === 'processed' || event.status === 'dlq') {
      return;
    }

    // Check if it's time to retry
    if (event.status === 'failed' && event.nextRetryAt && event.nextRetryAt > new Date()) {
      return; // Not ready to retry yet
    }

    // Update status to processing
    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: { status: 'processing' },
    });

    // Parse and process the payload
    const payload = JSON.parse(event.rawPayload);
    const result = await handler(payload);

    if (result.success) {
      // Mark as processed
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          status: 'processed',
          processedAt: new Date(),
        },
      });

      console.log(`[WebhookProcessor] Event processed successfully: ${eventId}`);
    } else {
      // Handle failure with retry logic
      await handleWebhookProcessingFailure(eventId, result.error || 'Unknown error');
    }
  } catch (error) {
    console.error(`[WebhookProcessor] Error processing event ${eventId}:`, error);
    await handleWebhookProcessingFailure(
      eventId,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Handle webhook processing failure: retry or move to DLQ
 */
export async function handleWebhookProcessingFailure(
  eventId: string,
  errorMessage: string
): Promise<void> {
  try {
    const event = await prisma.webhookEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) return;

    const nextRetryCount = event.retryCount + 1;

    if (nextRetryCount > event.maxRetries) {
      // Move to DLQ
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          status: 'dlq',
          lastError: errorMessage,
          updatedAt: new Date(),
        },
      });

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
    } else {
      // Schedule retry
      const nextRetryAt = calculateNextRetryTime(nextRetryCount);
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          status: 'failed',
          retryCount: nextRetryCount,
          lastError: errorMessage,
          nextRetryAt,
          updatedAt: new Date(),
        },
      });

      console.log(
        `[WebhookProcessor] Event scheduled for retry ${nextRetryCount}/${event.maxRetries}: ${eventId}`
      );
    }
  } catch (error) {
    console.error(`[WebhookProcessor] Error handling failure for ${eventId}:`, error);
  }
}

/**
 * Get all pending webhook events that are ready to be processed
 */
export async function getPendingWebhookEvents(limit: number = 100) {
  const now = new Date();
  return prisma.webhookEvent.findMany({
    where: {
      OR: [
        { status: 'pending' },
        {
          status: 'failed',
          nextRetryAt: { lte: now },
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

    await prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        status: 'pending',
        retryCount: 0,
        lastError: null,
        nextRetryAt: calculateNextRetryTime(0),
        updatedAt: new Date(),
      },
    });

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
