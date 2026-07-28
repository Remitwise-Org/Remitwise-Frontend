import { getSession } from '../../../../lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session?.address) {
    return Response.json(
      { error: 'Unauthorized', message: 'Not authenticated' },
      { status: 401 }
    );
  }
  return Response.json({ address: session.address, expiresAt: session.expiresAt });
}
