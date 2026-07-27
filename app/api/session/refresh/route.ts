import { getSessionWithRefresh, clearSessionCookie } from '@/lib/session';
import { jsonSuccess, jsonError } from '@/lib/api/types';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getSessionWithRefresh();

  if (!session?.address) {
    return Response.json(
      { error: 'Unauthorized', message: 'Session expired' },
      {
        status: 401,
        headers: { 'Set-Cookie': clearSessionCookie() },
      }
    );
  }

  return jsonSuccess({
    address: session.address,
    expiresAt: session.expiresAt,
  });
}
