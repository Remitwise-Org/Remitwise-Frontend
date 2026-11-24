import { anchorClient, AnchorTransactionResponse } from '@/lib/anchor/client';
import {
  listStalePendingFlows,
  updateAnchorFlowStatusByTransactionId,
  updateAnchorFlowReconcileAttempts,
  AnchorFlowRecord,
  AnchorFlowStatus,
} from '@/lib/anchor/flow-store';
import { recordAuditEvent } from '@/lib/admin/audit';
import {
  registerShutdownHook,
  runBackgroundJob,
  isShuttingDown,
} from '@/lib/background/runtime';

export const DEFAULT_RECONCILE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes
export const DEFAULT_MAX_RECONCILE_ATTEMPTS = 5;
export const DEFAULT_RECONCILE_BASE_DELAY_MS = 60 * 1000; // 1 minute
export const DEFAULT_RECONCILE_INTERVAL_MS = 60 * 1000; // 1 minute

export interface ReconcileOptions {
  olderThanMs?: number;
  maxAttempts?: number;
  limit?: number;
  baseDelayMs?: number;
  force?: boolean;
}

export interface ReconcileCounts {
  total: number;
  completed: number;
  failed: number;
  stillPending: number;
  stale: number;
  errors: number;
  skipped: number;
}

/**
 * Maps an anchor transaction status string to our internal AnchorFlowStatus.
 */
export function mapAnchorStatusToFlowStatus(anchorStatus: string): AnchorFlowStatus | null {
  const normalized = anchorStatus?.toLowerCase().trim();
  switch (normalized) {
    case 'completed':
    case 'success':
      return 'completed';
    case 'failed':
    case 'error':
    case 'expired':
    case 'refunded':
      return 'failed';
    case 'stale':
      return 'stale';
    case 'pending':
    case 'incomplete':
    case 'pending_anchor':
    case 'pending_stellar':
    case 'pending_trust':
    case 'pending_user':
    case 'pending_user_transfer_start':
    case 'pending_external':
      return 'pending';
    default:
      if (normalized?.startsWith('pending')) {
        return 'pending';
      }
      return null;
  }
}

/**
 * Evaluates whether a flow is ready for another reconciliation attempt based on exponential backoff.
 */
export function isFlowReadyForReconciliation(
  flow: AnchorFlowRecord,
  baseDelayMs: number,
  now: number = Date.now()
): boolean {
  const attempts = flow.reconcileAttempts ?? 0;
  if (attempts === 0) {
    return true;
  }
  const delayMs = baseDelayMs * Math.pow(2, attempts - 1);
  const lastAttemptTime = new Date(flow.updatedAt).getTime();
  return now - lastAttemptTime >= delayMs;
}

/**
 * Reconciles a single pending anchor flow.
 */
export async function reconcileSingleFlow(
  flow: AnchorFlowRecord,
  options: { maxAttempts: number }
): Promise<'completed' | 'failed' | 'stillPending' | 'stale' | 'error'> {
  const txId = flow.anchorTransactionId;
  const currentAttempts = flow.reconcileAttempts ?? 0;
  const maxAttempts = options.maxAttempts;

  if (!txId) {
    const nextAttempts = currentAttempts + 1;
    if (nextAttempts >= maxAttempts) {
      await updateAnchorFlowStatusByTransactionId(flow.id, 'stale', { reconcileAttempts: nextAttempts });
      recordAuditEvent({
        type: 'anchor.reconcile.stale',
        actor: 'anchor-reconcile',
        message: `Flow ${flow.id} marked stale (missing anchorTransactionId)`,
        metadata: { flowId: flow.id, attempts: nextAttempts, maxAttempts },
      });
      return 'stale';
    }
    return 'stillPending';
  }

  try {
    const statusResponse = await anchorClient.getAnchorTransactionStatus(txId);

    if (!statusResponse) {
      const nextAttempts = currentAttempts + 1;
      if (nextAttempts >= maxAttempts) {
        await updateAnchorFlowStatusByTransactionId(txId, 'stale', { reconcileAttempts: nextAttempts });
        recordAuditEvent({
          type: 'anchor.reconcile.stale',
          actor: 'anchor-reconcile',
          message: `Flow ${flow.id} (${txId}) marked stale after ${nextAttempts} attempts (not found on anchor)`,
          metadata: { flowId: flow.id, anchorTransactionId: txId, attempts: nextAttempts, maxAttempts },
        });
        return 'stale';
      }
      await updateAnchorFlowReconcileAttempts(txId, nextAttempts);
      recordAuditEvent({
        type: 'anchor.reconcile.not_found',
        actor: 'anchor-reconcile',
        message: `Flow ${flow.id} (${txId}) not found on anchor (attempt ${nextAttempts}/${maxAttempts})`,
        metadata: { flowId: flow.id, anchorTransactionId: txId, attempts: nextAttempts, maxAttempts },
      });
      return 'stillPending';
    }

    const anchorStatus = statusResponse.status;
    const mappedStatus = mapAnchorStatusToFlowStatus(anchorStatus);

    if (mappedStatus === 'completed') {
      await updateAnchorFlowStatusByTransactionId(txId, 'completed', {
        reconcileAttempts: currentAttempts + 1,
      });
      recordAuditEvent({
        type: 'anchor.reconcile.completed',
        actor: 'anchor-reconcile',
        message: `Flow ${flow.id} (${txId}) reconciled to completed from anchor status "${anchorStatus}"`,
        metadata: {
          flowId: flow.id,
          anchorTransactionId: txId,
          anchorStatus,
          attempts: currentAttempts + 1,
        },
      });
      return 'completed';
    }

    if (mappedStatus === 'failed') {
      await updateAnchorFlowStatusByTransactionId(txId, 'failed', {
        reconcileAttempts: currentAttempts + 1,
      });
      recordAuditEvent({
        type: 'anchor.reconcile.failed',
        actor: 'anchor-reconcile',
        message: `Flow ${flow.id} (${txId}) reconciled to failed from anchor status "${anchorStatus}"`,
        metadata: {
          flowId: flow.id,
          anchorTransactionId: txId,
          anchorStatus,
          attempts: currentAttempts + 1,
        },
      });
      return 'failed';
    }

    // Anchor status is still pending or other ongoing state
    const nextAttempts = currentAttempts + 1;
    if (nextAttempts >= maxAttempts) {
      await updateAnchorFlowStatusByTransactionId(txId, 'stale', {
        reconcileAttempts: nextAttempts,
      });
      recordAuditEvent({
        type: 'anchor.reconcile.stale',
        actor: 'anchor-reconcile',
        message: `Flow ${flow.id} (${txId}) reached max attempts (${maxAttempts}) while still "${anchorStatus}" and marked stale`,
        metadata: {
          flowId: flow.id,
          anchorTransactionId: txId,
          anchorStatus,
          attempts: nextAttempts,
          maxAttempts,
        },
      });
      return 'stale';
    }

    await updateAnchorFlowReconcileAttempts(txId, nextAttempts);
    recordAuditEvent({
      type: 'anchor.reconcile.still_pending',
      actor: 'anchor-reconcile',
      message: `Flow ${flow.id} (${txId}) still pending on anchor ("${anchorStatus}", attempt ${nextAttempts}/${maxAttempts})`,
      metadata: {
        flowId: flow.id,
        anchorTransactionId: txId,
        anchorStatus,
        attempts: nextAttempts,
        maxAttempts,
      },
    });
    return 'stillPending';
  } catch (error) {
    // Anchor downtime or transient network error: do not crash the loop
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[AnchorReconcile] Error polling status for tx ${txId}:`, errorMsg);

    const nextAttempts = currentAttempts + 1;
    if (nextAttempts >= maxAttempts) {
      await updateAnchorFlowStatusByTransactionId(txId, 'stale', {
        reconcileAttempts: nextAttempts,
      });
      recordAuditEvent({
        type: 'anchor.reconcile.stale',
        actor: 'anchor-reconcile',
        message: `Flow ${flow.id} (${txId}) reached max attempts (${maxAttempts}) during anchor error and marked stale`,
        metadata: {
          flowId: flow.id,
          anchorTransactionId: txId,
          error: errorMsg,
          attempts: nextAttempts,
          maxAttempts,
        },
      });
      return 'stale';
    }

    await updateAnchorFlowReconcileAttempts(txId, nextAttempts);
    recordAuditEvent({
      type: 'anchor.reconcile.error',
      actor: 'anchor-reconcile',
      message: `Anchor downtime or error for tx ${txId}: ${errorMsg}`,
      metadata: {
        flowId: flow.id,
        anchorTransactionId: txId,
        error: errorMsg,
        attempts: nextAttempts,
        maxAttempts,
      },
    });
    return 'error';
  }
}

/**
 * Main reconciliation entrypoint: polls anchor status for stale pending flows and updates them.
 */
export async function reconcilePendingAnchorFlows(
  options?: ReconcileOptions
): Promise<ReconcileCounts> {
  const thresholdMs =
    options?.olderThanMs ??
    parseInt(
      process.env.ANCHOR_RECONCILE_THRESHOLD_MS || String(DEFAULT_RECONCILE_THRESHOLD_MS),
      10
    );
  const maxAttempts =
    options?.maxAttempts ??
    parseInt(
      process.env.ANCHOR_RECONCILE_MAX_ATTEMPTS || String(DEFAULT_MAX_RECONCILE_ATTEMPTS),
      10
    );
  const baseDelayMs = options?.baseDelayMs ?? DEFAULT_RECONCILE_BASE_DELAY_MS;
  const limit = options?.limit ?? 50;
  const force = options?.force ?? false;

  const olderThan = new Date(Date.now() - thresholdMs);
  const flows = await listStalePendingFlows(olderThan, limit);

  const counts: ReconcileCounts = {
    total: 0,
    completed: 0,
    failed: 0,
    stillPending: 0,
    stale: 0,
    errors: 0,
    skipped: 0,
  };

  if (flows.length === 0) {
    return counts;
  }

  for (const flow of flows) {
    if (!force && !isFlowReadyForReconciliation(flow, baseDelayMs)) {
      counts.skipped++;
      continue;
    }

    counts.total++;
    const outcome = await reconcileSingleFlow(flow, { maxAttempts });
    switch (outcome) {
      case 'completed':
        counts.completed++;
        break;
      case 'failed':
        counts.failed++;
        break;
      case 'stillPending':
        counts.stillPending++;
        break;
      case 'stale':
        counts.stale++;
        break;
      case 'error':
        counts.errors++;
        break;
    }
  }

  recordAuditEvent({
    type: 'anchor.reconcile.batch',
    actor: 'anchor-reconcile',
    message: `Batch reconciliation finished: ${counts.completed} completed, ${counts.failed} failed, ${counts.stale} stale, ${counts.stillPending} still pending, ${counts.errors} errors, ${counts.skipped} skipped`,
    metadata: { counts },
  });

  return counts;
}

let reconcileIntervalTimer: NodeJS.Timeout | null = null;

/**
 * Starts the periodic background reconciliation loop.
 */
export function startAnchorReconcileLoop(intervalMs?: number): void {
  if (reconcileIntervalTimer) {
    return;
  }

  const interval =
    intervalMs ??
    parseInt(
      process.env.ANCHOR_RECONCILE_INTERVAL_MS || String(DEFAULT_RECONCILE_INTERVAL_MS),
      10
    );

  registerShutdownHook('anchor-reconcile-loop', () => {
    stopAnchorReconcileLoop();
  });

  reconcileIntervalTimer = setInterval(() => {
    if (isShuttingDown()) {
      stopAnchorReconcileLoop();
      return;
    }

    runBackgroundJob('anchor_reconciliation', async () => {
      try {
        await reconcilePendingAnchorFlows();
      } catch (error) {
        console.error('[AnchorReconcile] Error in reconciliation loop iteration:', error);
      }
    }).catch((error) => {
      console.warn('[AnchorReconcile] Background job rejected:', error);
    });
  }, interval);

  if (typeof reconcileIntervalTimer === 'object' && 'unref' in reconcileIntervalTimer) {
    reconcileIntervalTimer.unref();
  }

  console.log(`[AnchorReconcile] Started background reconciliation loop (interval: ${interval}ms)`);
}

/**
 * Stops the periodic background reconciliation loop.
 */
export function stopAnchorReconcileLoop(): void {
  if (reconcileIntervalTimer) {
    clearInterval(reconcileIntervalTimer);
    reconcileIntervalTimer = null;
    console.log('[AnchorReconcile] Stopped background reconciliation loop');
  }
}
