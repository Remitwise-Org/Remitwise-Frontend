import { NextRequest, NextResponse } from 'next/server';
import { withAuth, ApiError } from '@/lib/auth';
import { calculateSplit } from '@/lib/contracts/remittance-split';

async function handler(request: NextRequest, session: string) {
  try {
    const { searchParams } = new URL(request.url);
    const amountStr = searchParams.get('amount');
    
    if (!amountStr) {
      throw new ApiError(400, 'Amount parameter required');
    }
    
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      throw new ApiError(400, 'Invalid amount');
    }
    
    const env = (process.env.STELLAR_NETWORK as 'testnet' | 'mainnet') || 'testnet';
    const amounts = await calculateSplit(amount, env);
    
    if (!amounts) {
      throw new ApiError(404, 'Split configuration not found');
    }
    
    return NextResponse.json({ amounts });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, error instanceof Error ? error.message : 'Failed to calculate split');
  }
}

export const GET = withAuth(handler);
