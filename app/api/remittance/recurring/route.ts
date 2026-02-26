import { NextRequest, NextResponse } from 'next/server';
import {
  createRecurringRemittance,
  getRecurringRemittances,
} from '@/lib/mockdata/recurringRemittances';
import { requireAuth } from '@/lib/session';
import { StrKey } from '@stellar/stellar-sdk';

// POST /api/remittance/recurring
export async function POST(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuth();
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }
  const { recipientAddress, amount, currency, frequency } = await req.json();
  // Validation
  if (!recipientAddress || !StrKey.isValidEd25519PublicKey(recipientAddress)) {
    return NextResponse.json({ error: 'Invalid recipientAddress' }, { status: 400 });
  }
  if (typeof amount !== 'number' || amount <= 0) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }
  if (!currency || typeof currency !== 'string') {
    return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
  }
  if (!['weekly','biweekly','monthly'].includes(frequency)) {
    return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
  }
  const remittance = createRecurringRemittance({ userAddress: auth.address, recipientAddress, amount, currency, frequency });
  return NextResponse.json(remittance);
}

// GET /api/remittance/recurring
export async function GET(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuth();
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }
  const remittances = getRecurringRemittances(auth.address);
  return NextResponse.json(remittances);
}
