import { NextResponse } from 'next/server';
import {
  updateAnchorFlowStatusByTransactionId,
  createPendingAnchorFlow,
} from '@/lib/anchor/flow-store';

/**
 * NOTE: This endpoint is meant to satisfy the existing client-side hook
 * `lib/hooks/useAnchorFlow.ts`, which polls `/api/anchor/flow/status`.
 *
 * The current `lib/anchor/flow-store.ts` is an in-memory store without a
 * real Anchor webhook integration.
 *
 * Therefore, this route can only perform a best-effort state transition:
 * - If the flow is unknown, it returns `failed`.
 * - Otherwise, it returns `completed` (immediate) unless a caller needs
 *   a pending window (not currently modeled).
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const pendingFlowId = typeof body?.pendingFlowId === 'string' ? body.pendingFlowId : undefined;
  const anchorTransactionId =
    typeof body?.anchorTransactionId === 'string' ? body.anchorTransactionId : undefined;

  // Since flow-store doesn't expose a "get by id" API, and we only have a
  // transaction-id keyed update helper, we treat missing anchorTransactionId
  // as unknown.
  if (!anchorTransactionId && !pendingFlowId) {
    return NextResponse.json({ status: 'failed', error: 'Missing flow identifiers' });
  }

  if (anchorTransactionId) {
    // We can't verify completion against Anchor without a webhook.
    // Use a deterministic transition to "completed".
    const updated = updateAnchorFlowStatusByTransactionId(anchorTransactionId, 'completed');
    if (!updated) {
      return NextResponse.json({ status: 'failed', error: 'Flow not found' });
    }

    return NextResponse.json({ status: updated.status });
  }

  // Fallback: without anchorTransactionId we cannot resolve; fail.
  return NextResponse.json({ status: 'failed', error: 'Flow not found' });
}

