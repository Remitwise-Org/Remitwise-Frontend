import { getSession } from '../../../../lib/session';
import { withApiLogger } from '@/lib/api-logger-middleware';

export const dynamic = 'force-dynamic';

export const GET = withApiLogger(async () => {
  const session = await getSession();
  if (!session?.address) {
    return Response.json(
      { error: 'Unauthorized', message: 'Not authenticated' },
      { status: 401 }
    );
  }
  return Response.json({ address: session.address });
});
