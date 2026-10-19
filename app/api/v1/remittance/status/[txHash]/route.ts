import { NextRequest, NextResponse } from 'next/server';
import { fetchTransactionStatus } from '../../../../../../lib/remittance/horizon';

export const dynamic = 'force-dynamic';

/**
 * GET /api/remittance/status/[txHash]
 * Returns current status of a single transaction.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ txHash: string }> }
) {
  try {
    const { txHash } = await params;
    
    if (!txHash) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Missing transaction hash' },
        { status: 400 }
      );
    }

    const status = await fetchTransactionStatus(txHash);
    
    return NextResponse.json({ hash: txHash, status });
  } catch (error: any) {
    console.error('Error fetching transaction status:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }
}
