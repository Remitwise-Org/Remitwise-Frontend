import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import type {
  SendTransactionRequest,
  SendTransactionResponse,
  SendTransactionErrorResponse,
} from '@/lib/types/api';

/**
 * POST /api/send
 *
 * Builds a remittance send transaction (non-custodial: returns unsigned XDR
 * or a placeholder until Stellar broadcasting is wired).
 *
 * Request body: {@link SendTransactionRequest}
 * Success response: {@link SendTransactionResponse}
 * Error response:   {@link SendTransactionErrorResponse}
 *
 * @param request - The incoming Next.js request containing the send payload.
 * @param _session - The authenticated user address (resolved by withAuth).
 */
async function handler(
  request: NextRequest,
  _session: string,
): Promise<NextResponse<SendTransactionResponse | SendTransactionErrorResponse>> {
  let body: Partial<SendTransactionRequest>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json<SendTransactionErrorResponse>(
      { success: false, error: 'Invalid JSON body.' },
      { status: 400 },
    );
  }

  const { recipient, amount, currency } = body;

  if (!recipient || typeof recipient !== 'string' || recipient.trim() === '') {
    return NextResponse.json<SendTransactionErrorResponse>(
      { success: false, error: 'recipient is required.' },
      { status: 400 },
    );
  }

  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json<SendTransactionErrorResponse>(
      { success: false, error: 'amount must be a number greater than zero.' },
      { status: 400 },
    );
  }

  if (!currency || typeof currency !== 'string' || currency.trim() === '') {
    return NextResponse.json<SendTransactionErrorResponse>(
      { success: false, error: 'currency is required.' },
      { status: 400 },
    );
  }

  // TODO: Build and optionally sign a Stellar/Soroban transaction here.
  // For now, return a placeholder transactionId so the UI flow can be
  // exercised end-to-end before Stellar wiring is complete.
  return NextResponse.json<SendTransactionResponse>({
    success: true,
    transactionId: `TX_PLACEHOLDER_${Date.now()}`,
  });
}

export const POST = withAuth(handler);
