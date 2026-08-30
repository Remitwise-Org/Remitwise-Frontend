import {
  getPendingWebhookEvents,
  processWebhookEvent,
  WEBHOOK_RETRY_CONFIG,
} from '@/lib/webhooks/processor';
import { runBackgroundJob } from '@/lib/background/runtime';

// Tracks event IDs currently being processed in this runtime to prevent
// duplicate concurrent handling of the same webhook event.
const inFlightEvents = new Set<string>();

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

  // Prevent concurrent duplicate processing within this runtime. If the same
  // event is already being handled, treat this invocation as a safe no-op.
  // The processor claims events atomically in the database, so in-flight
  // duplicates that reach this point are safe to skip.
  if (inFlightEvents.has(eventId)) {
    console.warn(
      `[WebhookRetry] Event ${eventId} is already being processed; skipping duplicate invocation.`
    );
    return;
  }

  inFlightEvents.add(eventId);
  try {
    await processWebhookEvent(eventId, handler);
  } finally {
    inFlightEvents.delete(eventId);
  }
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
      pendingEvents.map((event: any) => processEvent(event.id, event.source))
    );

    // A claimed event may have been taken by another worker between the
    // listing and processing calls. The processor intentionally treats that
    // as a safe no-op; this endpoint reports only handler-level failures.
    // Additionally, inFlightEvents prevents duplicate handling within this
    // runtime, so concurrent retry invocations cannot double-process an event.
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
    description: `Up to ${WEBHOOK_RETRY_CONFIG.maxRetries} retries with exponential backoff (initial: ${WEBHOOK_RETRY_CONFIG.initialDelayMs}ms, multiplier: ${WEBHOOK_RETRY_CONFIG.backoffMultiplier}x, max: ${WEBHOOK_RETRY_CONFIG.maxDelayMs}ms). Concurrent duplicate processing is safe: events already being processed are skipped and no partial state is committed by the retry layer.`,
  };
}
