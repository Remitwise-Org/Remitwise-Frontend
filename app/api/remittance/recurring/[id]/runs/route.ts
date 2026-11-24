import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { recurringStore } from '@/lib/remittance/recurring-store';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let auth;
  try {
    auth = await requireAuth();
  } catch (error) {
    if (error instanceof Response) return error;
    throw error;
  }

  const schedule = await recurringStore.get(id);
  if (!schedule) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (schedule.userAddress !== auth.address) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const runs = await recurringStore.listPendingRuns(auth.address, id);
  return NextResponse.json({
    runs: runs.map((run) => ({
      id: run.id,
      scheduleId: run.scheduleId,
      dueAt: run.dueAt,
      status: run.status,
      createdAt: run.createdAt,
      unsignedRemittance: {
        recipientAddress: run.recipientAddress,
        amount: run.amount,
        currency: run.currency,
      },
    })),
  });
}
