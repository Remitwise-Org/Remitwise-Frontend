import {
  registerWebhookHandler,
  startWebhookProcessingLoop,
} from '@/lib/webhooks/retry';
import { updateAnchorFlowStatusByTransactionId } from '@/lib/anchor/flow-store';
import { recordAuditEvent } from '@/lib/admin/audit';

/**
 * Initialize webhook handlers on application startup.
 * This should be called once when the application boots.
 */
export function initializeWebhookHandlers() {
  // Register Anchor webhook handler
  registerWebhookHandler('anchor', async (payload: Record<string, any>) => {
    const { event_type, transaction_id, status } = payload;
    const txId = typeof transaction_id === 'string' ? transaction_id : '';

    console.log(
      `[WebhookInit] Processing anchor event: ${event_type} for tx: ${transaction_id}`
    );

    try {
      switch (event_type) {
        case 'deposit_completed':
          if (txId) {
            updateAnchorFlowStatusByTransactionId(txId, 'completed');
          }
          recordAuditEvent({
            type: 'anchor.webhook.deposit_completed',
            actor: 'anchor-webhook',
            message: `Deposit completed for ${txId || 'unknown'}`,
            metadata: { transaction_id: txId || null, status },
          });
          console.log(`[WebhookInit] Deposit completed for tx ${transaction_id}`);
          return { success: true };

        case 'withdrawal_failed':
          if (txId) {
            updateAnchorFlowStatusByTransactionId(txId, 'failed');
          }
          recordAuditEvent({
            type: 'anchor.webhook.withdrawal_failed',
            actor: 'anchor-webhook',
            message: `Withdrawal failed for ${txId || 'unknown'}`,
            metadata: { transaction_id: txId || null, status },
          });
          console.log(`[WebhookInit] Withdrawal failed for tx ${transaction_id}`);
          return { success: true };

        default:
          console.log(`[WebhookInit] Unhandled event type received: ${event_type}`);
          return { success: true }; // Don't fail on unknown event types
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[WebhookInit] Error handling anchor event: ${errorMsg}`, error);
      return {
        success: false,
        error: errorMsg,
      };
    }
  });

  // Start background processing loop only in Node.js environment
  if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
    const intervalMs = parseInt(process.env.WEBHOOK_PROCESSING_INTERVAL_MS || '30000', 10);
    startWebhookProcessingLoop(intervalMs);
  }

  console.log('[WebhookInit] Webhook handlers initialized');
}
