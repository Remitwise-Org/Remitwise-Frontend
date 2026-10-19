import { getSessionWithRefresh } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await getSessionWithRefresh();
  
  if (!session?.address) {
    return Response.json(
      { error: 'Unauthorized', message: 'Session expired' },
      { status: 401 }
    );
  }
  
  return Response.json({ success: true, address: session.address, expiresAt: session.expiresAt });
}
