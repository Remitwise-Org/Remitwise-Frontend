import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie, requireAuth } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import { recordAuditEvent } from '@/lib/admin/audit';

/**
 * POST /api/auth/logout-all
 *
 * Bumps the user's sessionVersion in the database, invalidating every
 * existing session cookie for that user on all devices. The caller's
 * own cookie is also cleared in the response.
 *
 * Returns 401 if the caller has no valid session.
 */
export async function POST(request: NextRequest) {
  let address: string;
  try {
    const auth = await requireAuth();
    address = auth.address;
  } catch (err) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Atomically increment sessionVersion — any cookie with an older version
    // will be rejected on the next request.
    await (prisma as any).user.update({
      where: { stellar_address: address },
      data: { sessionVersion: { increment: 1 } },
    });
  } catch (dbError) {
    console.error('[logout-all] DB update failed', dbError);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Could not revoke sessions' },
      { status: 500 },
    );
  }

  // Record audit event (fire-and-forget)
  recordAuditEvent({
    type: 'session.revoked_all',
    actor: address,
    message: 'User signed out of all devices',
    metadata: { stellar_address: address },
  });

  const response = NextResponse.json({
    ok: true,
    message: 'All sessions revoked. You have been signed out of all devices.',
  });
  response.headers.set('Set-Cookie', clearSessionCookie());
  return response;
}
