import { NextRequest, NextResponse } from 'next/server';
import { withApiLogger } from '@/lib/api-logger-middleware';
import { withAuth, ApiError } from '@/lib/auth';
import { getSplit } from '@/lib/contracts/remittance-split';

export const GET = withApiLogger(async () => {
  try {
    const env = (process.env.STELLAR_NETWORK as 'testnet' | 'mainnet') || 'testnet';
    const config = await getSplit(env);

    if (!config) {
      return NextResponse.json({ error: 'Split configuration not found' }, { status: 404 });
    }

    return NextResponse.json({
      percentages: {
        savings: config.savings_percent,
        bills: config.bills_percent,
        insurance: config.insurance_percent,
        family: config.family_percent
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch split config';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
