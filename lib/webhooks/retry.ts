import {
  getPendingWebhookEvents,
  processWebhookEvent,
  WEBHOOK_RETRY_CONFIG,
} from '@/lib/webhooks/processor';
import { runBackgroundJob } from '@/lib/background/runtime';

// Map of webhook source to handler functions
const webhookHandlers: Record<
  string,
  (payload: Record<string, any>) => Promise<{ success: boolean; error?: string }>
> = {};

/**
 * Register a webhook handler for a specific source
 */
export function registerWebhookHandler(
  source: string,
  handler: (payload: Record<string, any>) => Promise<{ success: boolean; error?: string }>
) {
  webhookHandlers[source] = handler;
  console.log(`[WebhookRetry] Registered handler for source: ${source}`);
}

/**
 * Process a single webhook event using the registered handler
 */
async function processEvent(eventId: string, source: string): Promise<void> {
  const handler = webhookHandlers[source];

  if (!handler) {
    console.warn(`[WebhookRetry] No handler registered for source: ${source}`);
    return;
  }

  await processWebhookEvent(eventId, handler);
}

/**
 * Process all pending webhook events.
 * Returns statistics about processed events.
 */
export async function processPendingWebhooks(
  limit: number = 100
): Promise<{
  processed: number;
  failed: number;
  error?: string;
}> {
  try {
    const pendingEvents = await getPendingWebhookEvents(limit);

    if (pendingEvents.length === 0) {
      return { processed: 0, failed: 0 };
    }

    console.log(
      `[WebhookRetry] Processing ${pendingEvents.length} pending webhook events`
    );

    const results = await Promise.allSettled(
      pendingEvents.map((event) => processEvent(event.id, event.source))
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    const processed = results.length - failed;

    console.log(
      `[WebhookRetry] Processing complete: ${processed} succeeded, ${failed} failed`
    );

    return { processed, failed };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[WebhookRetry] Error processing pending webhooks:`, error);
    return { processed: 0, failed: 0, error: errorMsg };
  }
}

/**
 * Start a background job that periodically processes pending webhooks.
 * Can be called once to set up recurring processing.
 */
export function startWebhookProcessingLoop(intervalMs: number = 30000): void {
  const interval = setInterval(() => {
    processPendingWebhooks()
      .then((result) => {
        if (result.processed > 0 || result.failed > 0) {
          console.log(`[WebhookRetry] Loop iteration: ${JSON.stringify(result)}`);
        }
      })
      .catch((error) => {
        console.error(
          `[WebhookRetry] Error in processing loop:`,
          error
        );
      });
  }, intervalMs);

  // Allow graceful cleanup
  if (typeof process !== 'undefined' && process.on) {
    process.on('SIGTERM', () => clearInterval(interval));
    process.on('SIGINT', () => clearInterval(interval));
  }

  console.log(
    `[WebhookRetry] Started background processing loop (interval: ${intervalMs}ms)`
  );
}

/**
 * Get retry policy configuration as a readable format
 */
export function getRetryPolicyInfo() {
  return {
    maxRetries: WEBHOOK_RETRY_CONFIG.maxRetries,
    initialDelayMs: WEBHOOK_RETRY_CONFIG.initialDelayMs,
    backoffMultiplier: WEBHOOK_RETRY_CONFIG.backoffMultiplier,
    maxDelayMs: WEBHOOK_RETRY_CONFIG.maxDelayMs,
    description: `Up to ${WEBHOOK_RETRY_CONFIG.maxRetries} retries with exponential backoff (initial: ${WEBHOOK_RETRY_CONFIG.initialDelayMs}ms, multiplier: ${WEBHOOK_RETRY_CONFIG.backoffMultiplier}x, max: ${WEBHOOK_RETRY_CONFIG.maxDelayMs}ms)`,
  };
}
