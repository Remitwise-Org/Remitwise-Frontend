import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { anchorClient } from '@/lib/anchor/client';
import { createPendingAnchorFlow } from '@/lib/anchor/flow-store';
import { recordAuditEvent } from '@/lib/admin/audit';

interface WithdrawBody {
  amount: string | number;
  currency: string;
  destinationAccount?: string;
}

function parseAmount(value: string | number): string {
  const asNumber = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(asNumber) || asNumber <= 0) {
    throw new Error('amount must be a positive number');
  }
  return asNumber.toString();
}

function parseWithdrawBody(body: unknown): { amount: string; currency: string; destinationAccount?: string } {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }
  const input = body as WithdrawBody;
  if (!input.currency || typeof input.currency !== 'string') {
    throw new Error('currency is required');
  }
  const currency = input.currency.trim().toUpperCase();
  if (!currency) {
    throw new Error('currency is required');
  }

  const amount = parseAmount(input.amount);
  const destinationAccount =
    typeof input.destinationAccount === 'string' && input.destinationAccount.trim()
      ? input.destinationAccount.trim()
      : undefined;

  return { amount, currency, destinationAccount };
}

export async function POST(request: NextRequest) {
  let auth;
  try {
    auth = await requireAuth();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!anchorClient.isConfigured()) {
    return NextResponse.json(
      { error: 'Anchor integration is not configured' },
      { status: 501 }
    );
  }

  let parsedBody: { amount: string; currency: string; destinationAccount?: string };
  try {
    parsedBody = parseWithdrawBody(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request body';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const flowResponse = await anchorClient.startWithdrawFlow({
      amount: parsedBody.amount,
      currency: parsedBody.currency,
      destination: parsedBody.destinationAccount,
      account: auth.address,
    });

    const flowUrl =
      typeof flowResponse.url === 'string'
        ? flowResponse.url
        : typeof flowResponse.interactive_url === 'string'
          ? flowResponse.interactive_url
          : undefined;
    const transactionId =
      typeof flowResponse.transaction_id === 'string'
        ? flowResponse.transaction_id
        : typeof flowResponse.id === 'string'
          ? flowResponse.id
          : undefined;

    const pending = createPendingAnchorFlow({
      type: 'withdraw',
      userAddress: auth.address,
      amount: parsedBody.amount,
      currency: parsedBody.currency,
      destination: parsedBody.destinationAccount,
      anchorTransactionId: transactionId,
      anchorUrl: flowUrl,
    });

    recordAuditEvent({
      type: 'anchor.withdraw.created',
      actor: auth.address,
      message: 'Anchor withdrawal flow created',
      metadata: {
        flowId: pending.id,
        anchorTransactionId: transactionId,
        currency: parsedBody.currency,
        amount: parsedBody.amount,
      },
    });

    return NextResponse.json({
      flowType: 'withdraw',
      pendingFlowId: pending.id,
      anchorTransactionId: transactionId,
      url: flowUrl,
      steps: Array.isArray(flowResponse.steps) ? flowResponse.steps : undefined,
      raw: flowResponse,
    });
  } catch (error) {
    console.error('[POST /api/v1/anchor/withdraw] Anchor request failed:', error);
    return NextResponse.json(
      { error: 'Failed to start anchor withdrawal flow' },
      { status: 502 }
    );
  }
}

