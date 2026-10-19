import { NextRequest, NextResponse } from 'next/server';
import { withAuth, ApiError } from '@/lib/auth';
import { getSplit } from '@/lib/contracts/remittance-split-cached';

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

async function postHandler(request: NextRequest, session: string) {
  const body = await request.json();
  // TODO: Call Soroban remittance_split contract to update config
  return NextResponse.json({ success: true });
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
