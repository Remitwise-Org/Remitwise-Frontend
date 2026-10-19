import { NextRequest, NextResponse } from 'next/server';
import { getBill } from '@/lib/contracts/bill-payments';
import { jsonSuccess, jsonError } from '@/lib/api/types';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token || token !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await context.params;

    if (!id) {
      return jsonError('VALIDATION_ERROR', 'Bill ID is required');
    }

    const owner = new URL(request.url).searchParams.get('owner') ?? token;
    const bill = await getBill(id, owner);

    return jsonSuccess({ bill });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'not-found') {
      return jsonError('NOT_FOUND', 'Bill not found');
    }
    console.error('[GET /api/bills/[id]]', err);
    return jsonError('INTERNAL_ERROR', 'Failed to fetch bill');
  }
}
