import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/session';
import { fetchTransactionHistory } from '@/lib/remittance/horizon';
import { getAllBills } from '@/lib/contracts/bill-payments';
import { getActivePolicies } from '@/lib/contracts/insurance-cached';
import { getAllGoals } from '@/lib/contracts/savings-goal';
import {
  aggregateInsights,
  isInsightsPeriod,
} from '@/lib/insights/aggregate';

export const dynamic = 'force-dynamic';

const HISTORY_LIMIT = 200;

export async function GET(request: NextRequest) {
  const requestedPeriod = new URL(request.url).searchParams.get('period');
  const period = requestedPeriod ?? 'current_month';

  if (!isInsightsPeriod(period)) {
    return Response.json(
      {
        error: 'Invalid period',
        allowedPeriods: ['current_month', 'last_3_months', 'last_year'],
      },
      { status: 400 },
    );
  }

  try {
    const { address } = await requireAuth();
    const results = await Promise.allSettled([
      fetchTransactionHistory(address, { limit: HISTORY_LIMIT }),
      getAllBills(address),
      getActivePolicies(address),
      getAllGoals(address),
    ] as const);

    const sourceNames: readonly string[] = ['payments', 'bills', 'policies', 'goals'];
    const failedSources: string[] = [];

    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        failedSources.push(sourceNames[index]);
        console.error(`[GET /api/insights] ${sourceNames[index]} source failed`, result.reason);
      }
    });

    const [paymentsResult, billsResult, policiesResult, goalsResult] = results;
    const aggregate = aggregateInsights({
      address,
      period,
      payments:
        paymentsResult.status === 'fulfilled'
          ? paymentsResult.value.transactions
          : [],
      bills: billsResult.status === 'fulfilled' ? billsResult.value : [],
      policies:
        policiesResult.status === 'fulfilled' ? policiesResult.value : [],
      goals: goalsResult.status === 'fulfilled' ? goalsResult.value : [],
    });

    return Response.json({
      ...aggregate,
      partial: failedSources.length > 0,
      failedSources,
    });
  } catch (error) {
    if (error instanceof Response) return error;

    console.error('[GET /api/insights] request failed', error);
    return Response.json(
      { error: 'Failed to compute insights' },
      { status: 500 },
    );
  }
}
