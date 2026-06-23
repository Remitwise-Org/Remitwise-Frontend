import { NextRequest, NextResponse } from 'next/server';
import { recurringStore } from '@/lib/remittance/recurring-store';
import { requireAuth } from '@/lib/session';

// POST /api/remittance/recurring
export async function POST(req: NextRequest) {
  let auth;
  try {
    auth = await requireAuth();
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }

  try {
    const { recipientAddress, amount, currency, frequency } = await req.json();

    // Check presence of required parameters
    if (!recipientAddress) {
      return NextResponse.json({ error: 'Invalid recipientAddress' }, { status: 400 });
    }
    if (amount === undefined) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }
    if (!currency) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
    }
    if (!frequency) {
      return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
    }

    const remittance = await recurringStore.create({
      userAddress: auth.address,
      recipientAddress,
      amount,
      currency,
      frequency,
    });
    return NextResponse.json(remittance);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Invalid request input' }, { status: 400 });
  }
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
  const remittances = await recurringStore.list(auth.address);
  return NextResponse.json(remittances);
}
