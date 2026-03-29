import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin/auth';
import {
  getDLQEvents,
  replayDLQEvent,
  getWebhookEventStats,
} from '@/lib/webhooks/processor';

/**
 * GET /api/v1/admin/webhooks/dlq
 * 
 * List dead-letter queue webhook events (admin only).
 * Query parameters:
 *   - limit: number of items per page (default 50, max 100)
 *   - offset: pagination offset (default 0)
 *   - source: filter by webhook source (e.g. "anchor")
 */
export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    
    const limitRaw = searchParams.get('limit');
    const offsetRaw = searchParams.get('offset');
    const source = searchParams.get('source') || undefined;

    const limit = Math.min(
      Math.max(parseInt(limitRaw || '50', 10) || 50, 1),
      100
    );
    const offset = Math.max(parseInt(offsetRaw || '0', 10) || 0, 0);

    const [dlqData, stats] = await Promise.all([
      getDLQEvents(limit, offset, source),
      getWebhookEventStats(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        events: dlqData.items.map((event) => ({
          id: event.id,
          source: event.source,
          eventType: event.eventType,
          status: event.status,
          retryCount: event.retryCount,
          maxRetries: event.maxRetries,
          lastError: event.lastError,
          createdAt: event.createdAt.toISOString(),
          updatedAt: event.updatedAt.toISOString(),
          rawPayload: event.rawPayload,
        })),
        pagination: {
          limit: dlqData.limit,
          offset: dlqData.offset,
          total: dlqData.total,
          hasMore: dlqData.offset + dlqData.limit < dlqData.total,
        },
        stats: {
          pending: stats.pending,
          processing: stats.processing,
          processed: stats.processed,
          failed: stats.failed,
          dlq: stats.dlq,
          total: stats.total,
        },
      },
    });
  } catch (error) {
    console.error('[Admin DLQ] Error listing events:', error);
    return NextResponse.json(
      { error: 'Failed to list DLQ events' },
      { status: 500 }
    );
  }
}
