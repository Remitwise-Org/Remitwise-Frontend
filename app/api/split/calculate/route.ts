import { NextRequest, NextResponse } from 'next/server';
import { withApiLogger } from '@/lib/api-logger-middleware';
import { validateAuth, unauthorizedResponse } from '@/lib/auth';
import { calculateSplit } from '@/lib/contracts/remittance-split';

export const GET = withApiLogger(async (request: NextRequest) => {
  if (!validateAuth(request)) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(request.url);
    const amountStr = searchParams.get('amount');

    if (!amountStr) {
      return NextResponse.json({ error: 'Amount parameter required' }, { status: 400 });
    }

    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const env = (process.env.STELLAR_NETWORK as 'testnet' | 'mainnet') || 'testnet';
    const amounts = await calculateSplit(amount, env);

    if (!amounts) {
      return NextResponse.json({ error: 'Split configuration not found' }, { status: 404 });
    }

    return NextResponse.json({ amounts });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to calculate split';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
