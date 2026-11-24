import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import {
  calculateMinimumReceived,
  findBestSwapPath,
  SwapQuoteError,
  validateSlippage,
  type SwapQuoteInput,
} from '@/lib/swap/quote';

export const dynamic = 'force-dynamic';

function readQuoteInput(params: URLSearchParams): SwapQuoteInput {
  return {
    sourceAsset: {
      code: params.get('sourceCode') ?? '',
      issuer: params.get('sourceIssuer') || undefined,
    },
    destinationAsset: {
      code: params.get('destinationCode') ?? '',
      issuer: params.get('destinationIssuer') || undefined,
    },
    amount: params.get('amount') ?? '',
  };
}

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.address) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rawSlippage = request.nextUrl.searchParams.get('slippage');
    const slippage = validateSlippage(rawSlippage === null ? undefined : Number(rawSlippage));
    const { quote } = await findBestSwapPath(readQuoteInput(request.nextUrl.searchParams));
    const minimumReceived = calculateMinimumReceived(quote.destinationAmount, slippage);
    return NextResponse.json({ quote, slippage, minimumReceived });
  } catch (error) {
    if (error instanceof SwapQuoteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Failed to fetch Stellar swap quote:', error);
    return NextResponse.json({ error: 'Unable to retrieve a swap quote right now.' }, { status: 502 });
  }
}
