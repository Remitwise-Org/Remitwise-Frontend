import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { anchorClient } from '@/lib/anchor/client';
import { createPendingAnchorFlow } from '@/lib/anchor/flow-store';
import { recordAuditEvent } from '@/lib/admin/audit';

interface DepositBody {
  amount: string | number;
  currency: string;
  destination?: string;
}

function parseAmount(value: string | number): string {
  const asNumber = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(asNumber) || asNumber <= 0) {
    throw new Error('amount must be a positive number');
  }
  return asNumber.toString();
}

function parseDepositBody(body: unknown): { amount: string; currency: string; destination?: string } {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }
  const input = body as DepositBody;
  if (!input.currency || typeof input.currency !== 'string') {
    throw new Error('currency is required');
  }
  const currency = input.currency.trim().toUpperCase();
  if (!currency) {
    throw new Error('currency is required');
  }

  const amount = parseAmount(input.amount);
  const destination = typeof input.destination === 'string' && input.destination.trim()
    ? input.destination.trim()
    : undefined;

  return { amount, currency, destination };
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

  let parsedBody: { amount: string; currency: string; destination?: string };
  try {
    parsedBody = parseDepositBody(await request.json());
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request body';
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const flowResponse = await anchorClient.startDepositFlow({
      amount: parsedBody.amount,
      currency: parsedBody.currency,
      destination: parsedBody.destination,
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
      type: 'deposit',
      userAddress: auth.address,
      amount: parsedBody.amount,
      currency: parsedBody.currency,
      destination: parsedBody.destination,
      anchorTransactionId: transactionId,
      anchorUrl: flowUrl,
    });

    recordAuditEvent({
      type: 'anchor.deposit.created',
      actor: auth.address,
      message: 'Anchor deposit flow created',
      metadata: {
        flowId: pending.id,
        anchorTransactionId: transactionId,
        currency: parsedBody.currency,
        amount: parsedBody.amount,
      },
    });

    return NextResponse.json({
      flowType: 'deposit',
      pendingFlowId: pending.id,
      anchorTransactionId: transactionId,
      url: flowUrl,
      steps: Array.isArray(flowResponse.steps) ? flowResponse.steps : undefined,
      raw: flowResponse,
    });
  } catch (error) {
    console.error('[POST /api/v1/anchor/deposit] Anchor request failed:', error);
    return NextResponse.json(
      { error: 'Failed to start anchor deposit flow' },
      { status: 502 }
    );
  }
}

