import { NextRequest } from 'next/server';
import { requireAuth } from '../../../../../lib/session';
import { fetchTransactionHistory } from '../../../../../lib/remittance/horizon';
import { validatePaginationParams } from '../../../../../lib/utils/pagination';

export const dynamic = 'force-dynamic';

/**
 * GET /api/v1/remittance/history (protected)
 * Returns list of transactions for session user.
 *
 * Query params:
 * - limit: number (default 10, max 200)
 * - cursor: string (pagination)
 * - status: 'completed' | 'failed' | 'pending'
 */
export async function GET(req: NextRequest) {
  try {
    const { address } = await requireAuth();

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : undefined;
    const { limit, cursor } = validatePaginationParams({
      limit: parsedLimit,
      cursor: searchParams.get('cursor') || undefined,
    });
    const status = searchParams.get('status') as 'completed' | 'failed' | 'pending' | null;

    const history = await fetchTransactionHistory(address, {
      limit,
      cursor,
      status: status || undefined,
    });

    return Response.json({
      ...history,
      hasMore: !!history.nextCursor,
      userAddress: address,
    });
  } catch (error: any) {
    if (error instanceof Response && error.status === 401) {
      return Response.json(
        { error: 'Unauthorized', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const horizonStatus =
      error?.response?.status ??
      error?.status;
    if (typeof horizonStatus === 'number' && horizonStatus >= 500) {
      return Response.json(
        { error: 'Bad Gateway', message: 'Horizon service unavailable' },
        { status: 502 }
      );
    }

    console.error('Error fetching remittance history:', error);
    return Response.json(
      { error: 'Internal Server Error', message: error?.message ?? 'Unexpected error' },
      { status: 500 }
    );
  }
}
