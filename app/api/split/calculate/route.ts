import { NextRequest, NextResponse } from 'next/server';
import { withAuth, ApiError } from '@/lib/auth';
import { calculateSplit } from '@/lib/contracts/remittance-split';
import { splitCalculateQuerySchema } from '@/lib/validation/split-schemas';
import { createValidationError } from '@/lib/errors/api-errors';

async function handler(request: NextRequest, session: string) {
  try {
    const { searchParams } = new URL(request.url);
    const raw = { amount: searchParams.get('amount') };

    const parsed = splitCalculateQuerySchema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
      return createValidationError('Query parameter validation failed', fieldErrors);
    }

    const { amount } = parsed.data;

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
