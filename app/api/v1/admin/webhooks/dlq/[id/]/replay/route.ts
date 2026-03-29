import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthorized } from '@/lib/admin/auth';
import { replayDLQEvent } from '@/lib/webhooks/processor';

/**
 * POST /api/v1/admin/webhooks/dlq/[id]/replay
 * 
 * Replay a dead-letter queue webhook event (admin only).
 * Resets the event status to 'pending' to be processed again.
 * 
 * URL Parameters:
 *   - id: the webhook event ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const eventId = params.id;

    if (!eventId || typeof eventId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid event ID' },
        { status: 400 }
      );
    }

    const success = await replayDLQEvent(eventId);

    if (!success) {
      return NextResponse.json(
        { error: 'Event not found or not in DLQ' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Event ${eventId} has been replayed and moved to pending queue`,
    });
  } catch (error) {
    console.error('[Admin DLQ Replay] Error replaying event:', error);
    return NextResponse.json(
      { error: 'Failed to replay event' },
      { status: 500 }
    );
  }
}
