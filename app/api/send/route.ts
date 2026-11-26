import { NextRequest, NextResponse } from 'next/server';
import { StrKey } from '@stellar/stellar-sdk';
import { withAuth } from '@/lib/auth';
import { BuildPaymentError, buildPayment } from '@/lib/remittance/build-payment';
import { hasAtMostDecimals } from '@/lib/utils/decimal-places';
import type {
  SendTransactionRequest,
  SendTransactionResponse,
  SendTransactionErrorResponse,
} from '@/lib/types/api';
import { withIdempotency } from '@/lib/idempotency';

function isValidAmount(value: unknown): value is number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value <= 0 ||
    !hasAtMostDecimals(value, 7)
  ) {
    return false;
  }

  const amount = value.toFixed(7);
  if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(amount)) return false;

  const [whole, fraction = ''] = amount.split('.');
  const stroops = BigInt(whole) * 10_000_000n + BigInt(fraction.padEnd(7, '0'));
  return stroops <= 9_223_372_036_854_775_807n;
}

/**
 * POST /api/send
 *
 * Builds an unsigned Stellar payment transaction for the connected wallet.
 *
 * Request body: {@link SendTransactionRequest}
 * Success response: {@link SendTransactionResponse}
 * Error response:   {@link SendTransactionErrorResponse}
 *
 * @param request - The incoming Next.js request containing the send payload.
 * @param session - The authenticated user address (resolved by withAuth).
 */
async function handler(
  request: NextRequest,
  session: string,
  body: Partial<SendTransactionRequest>,
): Promise<NextResponse<SendTransactionResponse | SendTransactionErrorResponse>> {
  const { recipient, amount } = body;

  if (!recipient || typeof recipient !== 'string' || recipient.trim() === '') {
    return NextResponse.json<SendTransactionErrorResponse>(
      { success: false, error: 'recipient is required.' },
      { status: 400 },
    );
  }

  // The client-side RecipientAddressInput form already blocks invalid
  // addresses, but that's UI, not a security boundary — a request sent
  // directly to this route bypasses it entirely. Re-validate here, at the
  // actual boundary that builds the payout.
  if (!StrKey.isValidEd25519PublicKey(recipient.trim())) {
    return NextResponse.json<SendTransactionErrorResponse>(
      { success: false, error: 'recipient must be a valid Stellar public key (G...).' },
      { status: 400 },
    );
  }

  if (!isValidAmount(amount)) {
    return NextResponse.json<SendTransactionErrorResponse>(
      {
        success: false,
        error: 'amount must be positive, within Stellar limits, and have at most 7 decimal places.',
      },
      { status: 400 },
    );
  }

  const currency =
    typeof body.currency === 'string' ? body.currency.trim().toUpperCase() : '';
  if (currency !== 'XLM' && currency !== 'USDC') {
    return NextResponse.json<SendTransactionErrorResponse>(
      { success: false, error: 'currency must be either XLM or USDC.' },
      { status: 400 },
    );
  }

  if (body.memo !== undefined && typeof body.memo !== 'string') {
    return NextResponse.json<SendTransactionErrorResponse>(
      { success: false, error: 'memo must be a string.' },
      { status: 400 },
    );
  }
  const memo = body.memo;
  if (memo && new TextEncoder().encode(memo).length > 28) {
    return NextResponse.json<SendTransactionErrorResponse>(
      { success: false, error: 'memo must be 28 bytes or less.' },
      { status: 400 },
    );
  }

  try {
    const payment = await buildPayment({
      sourceAddress: session,
      recipient: recipient.trim(),
      amount,
      currency,
      memo,
    });
    return NextResponse.json<SendTransactionResponse>({
      success: true,
      ...payment,
    });
  } catch (error) {
    if (error instanceof BuildPaymentError) {
      return NextResponse.json<SendTransactionErrorResponse>(
        { success: false, error: error.message },
        { status: error.status },
      );
    }
    console.error('Failed to build unsigned Stellar payment:', error);
    return NextResponse.json<SendTransactionErrorResponse>(
      { success: false, error: 'Unable to build the payment transaction right now.' },
      { status: 502 },
    );
  }
}

export const POST = withAuth((request, session) =>
  withIdempotency(request, (body) => handler(request, session, body))
);
