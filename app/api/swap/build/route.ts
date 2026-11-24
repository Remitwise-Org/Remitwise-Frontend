import { NextRequest, NextResponse } from 'next/server';
import {
  BASE_FEE,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { getHorizonServer } from '@/lib/remittance/horizon';
import { getSession } from '@/lib/session';
import { STELLAR_CONFIG } from '@/lib/config/stellar';
import {
  calculateMinimumReceived,
  findBestSwapPath,
  parseSwapAsset,
  SwapQuoteError,
  validateSlippage,
  type SwapQuoteInput,
} from '@/lib/swap/quote';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.address) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let body: SwapQuoteInput & { slippage?: number };
    try {
      body = (await request.json()) as SwapQuoteInput & { slippage?: number };
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'A swap request body is required.' }, { status: 400 });
    }
    const slippage = validateSlippage(body.slippage);
    const { record, quote } = await findBestSwapPath(body);

    const sourceAsset = parseSwapAsset(body.sourceAsset);
    const destinationAsset = parseSwapAsset(body.destinationAsset);
    const destinationMinimum = calculateMinimumReceived(record.destination_amount, slippage);
    const account = await getHorizonServer().loadAccount(session.address);

    const operation = Operation.pathPaymentStrictSend({
      sendAsset: sourceAsset,
      sendAmount: record.source_amount,
      destination: session.address,
      destAsset: destinationAsset,
      destMin: destinationMinimum,
      path: record.path.map((asset) =>
        parseSwapAsset(asset.asset_type === 'native'
          ? { code: 'XLM' }
          : { code: asset.asset_code ?? '', issuer: asset.asset_issuer ?? '' })
      ),
    });

    const transaction = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_CONFIG.networkPassphrase,
    })
      .addOperation(operation)
      .setTimeout(180)
      .build();

    return NextResponse.json({
      xdr: transaction.toXDR(),
      network: STELLAR_CONFIG.network,
      quote,
      slippage,
      minimumReceived: destinationMinimum,
    });
  } catch (error) {
    if (error instanceof SwapQuoteError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('Failed to build Stellar swap transaction:', error);
    return NextResponse.json({ error: 'Unable to build the swap transaction right now.' }, { status: 502 });
  }
}
