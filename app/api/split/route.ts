import { NextRequest, NextResponse } from 'next/server';
import { withAuth, ApiError } from '@/lib/auth';
import { getSplit } from '@/lib/contracts/remittance-split-cached';
import { POST as updatePost } from '@/app/api/split/update/route';

async function getHandler(request: NextRequest, session: string) {
  try {
    const env = (process.env.STELLAR_NETWORK as 'testnet' | 'mainnet') || 'testnet';
    const config = await getSplit(env);

    if (!config) {
      throw new ApiError(404, 'Split configuration not found');
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
    if (error instanceof ApiError) throw error;
    throw new ApiError(500, error instanceof Error ? error.message : 'Failed to fetch split config');
  }
}

/**
 * POST /api/split builds an unsigned split update transaction.
 *
 * Request percentages use spending/savings/bills/insurance. GET /api/split
 * is a read view that exposes the contract categories as savings/bills/insurance/family.
 */
export const GET = withAuth(getHandler);
export const POST = updatePost;
