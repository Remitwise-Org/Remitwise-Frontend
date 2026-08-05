import { NextRequest, NextResponse } from 'next/server';
import { getTotalUnpaid, getUnpaidBills } from '@/lib/contracts/bill-payments';
import { jsonSuccess, jsonError } from '@/lib/api/types';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authHeader = request.headers.get('authorization') ?? '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

  if (!token || token !== process.env.AUTH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const owner = new URL(request.url).searchParams.get('owner') ?? token;

    // Fetch the unpaid bills once and derive the total from them, instead
    // of getTotalUnpaid(owner) and getUnpaidBills(owner) each independently
    // re-fetching the same underlying list.
    const bills = await getUnpaidBills(owner);
    const total = await getTotalUnpaid(owner, bills);

    return jsonSuccess({
      totalUnpaid: total,
      count: bills.length,
      bills,
    });
  } catch (err) {
    console.error('[GET /api/bills/total-unpaid]', err);
    return jsonError('INTERNAL_ERROR', 'Failed to fetch total unpaid bills');
  }
}