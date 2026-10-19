import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin/auth';
import { processPendingWebhooks } from '@/lib/webhooks/retry';

/**
 * POST /api/v1/admin/webhooks/process
 * 
 * Manually trigger processing of pending webhook events (admin only).
 * Useful for testing or manual intervention.
 * 
 * Query parameters:
 *   - limit: max number of events to process in this call (default 100, max 500)
 */
export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const limitRaw = searchParams.get('limit');
    
    const limit = Math.min(
      Math.max(parseInt(limitRaw || '100', 10) || 100, 1),
      500
    );

    const result = await processPendingWebhooks(limit);

    return NextResponse.json({
      success: true,
      data: {
        processed: result.processed,
        failed: result.failed,
        error: result.error || null,
        message: `Processed ${result.processed} webhooks (${result.failed} failed)`,
      },
    });
  } catch (error) {
    console.error('[Admin Webhook Process] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process webhooks',
      },
      { status: 500 }
    );
  }
}
