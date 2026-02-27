import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/session';
import { fetchTransactionHistory } from '../../../../../lib/remittance/horizon';

export const dynamic = 'force-dynamic';

/**
 * GET /api/remittance/history (protected)
 * Returns list of transactions for session user.
 * 
 * Query params: 
 * - limit: number (default 10, max 200)
 * - cursor: string (pagination)
 * - status: 'completed' | 'failed' | 'pending'
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.address) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const cursor = searchParams.get('cursor') || undefined;
    const status = searchParams.get('status') as 'completed' | 'failed' | 'pending' | null;

    const history = await fetchTransactionHistory(session.address, {
      limit: Math.min(limit, 200),
      cursor,
      status: status || undefined,
    });

    return NextResponse.json(history);
  } catch (error: any) {
    console.error('Error fetching remittance history:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
