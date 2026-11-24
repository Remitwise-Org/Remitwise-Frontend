import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized, getAdminIdentity } from '@/lib/admin/auth';
import { recordAuditEvent } from '@/lib/admin/audit';
import { reconcilePendingAnchorFlows, ReconcileOptions } from '@/lib/anchor/reconcile';

/**
 * POST /api/v1/admin/anchor/reconcile
 *
 * Admin trigger endpoint to reconcile pending anchor deposit/withdraw flows
 * whose webhooks were missed or delayed.
 *
 * Guarded by isAdminAuthorized (requires x-admin-key header or admin cookie matching ADMIN_SECRET).
 */
export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    let bodyOptions: Partial<ReconcileOptions> = {};
    try {
      const bodyText = await request.text();
      if (bodyText && bodyText.trim()) {
        bodyOptions = JSON.parse(bodyText);
      }
    } catch {
      // Body is optional; query params or defaults take precedence if parsing fails
    }

    const limitParam = searchParams.get('limit');
    const olderThanMsParam = searchParams.get('olderThanMs');
    const forceParam = searchParams.get('force');
    const maxAttemptsParam = searchParams.get('maxAttempts');

    const limit = Math.min(
      Math.max(
        parseInt(limitParam || String(bodyOptions.limit || '50'), 10) || 50,
        1
      ),
      500
    );

    const olderThanMs = olderThanMsParam
      ? parseInt(olderThanMsParam, 10)
      : bodyOptions.olderThanMs;

    const maxAttempts = maxAttemptsParam
      ? parseInt(maxAttemptsParam, 10)
      : bodyOptions.maxAttempts;

    const force =
      forceParam === 'true' ||
      forceParam === '1' ||
      Boolean(bodyOptions.force);

    const counts = await reconcilePendingAnchorFlows({
      limit,
      olderThanMs,
      maxAttempts,
      force,
    });

    const actor = getAdminIdentity(request);

    recordAuditEvent({
      type: 'admin.anchor.reconcile',
      actor,
      message: `Admin triggered anchor reconciliation: ${counts.completed} completed, ${counts.failed} failed, ${counts.stale} stale, ${counts.stillPending} still pending, ${counts.errors} errors`,
      metadata: {
        counts,
        limit,
        force,
        olderThanMs,
        maxAttempts,
      },
    });

    return NextResponse.json({
      success: true,
      counts,
      total: counts.total,
      completed: counts.completed,
      failed: counts.failed,
      stillPending: counts.stillPending,
      stale: counts.stale,
      errors: counts.errors,
      skipped: counts.skipped,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Admin Anchor Reconcile] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reconcile anchor flows',
        details: errorMsg,
      },
      { status: 500 }
    );
  }
}
