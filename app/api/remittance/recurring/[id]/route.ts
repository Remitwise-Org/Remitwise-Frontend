import { NextRequest, NextResponse } from 'next/server';
import { updateRecurringRemittance, deleteRecurringRemittance } from '@/lib/mockdata/recurringRemittances';
import { requireAuth } from '@/lib/session';
import { StrKey } from '@stellar/stellar-sdk';

// PATCH /api/remittance/recurring/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  let auth;
  try {
    auth = await requireAuth();
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }
  const updates = await req.json();
  // Validate recipientAddress if present
  if (updates.recipientAddress && !StrKey.isValidEd25519PublicKey(updates.recipientAddress)) {
    return NextResponse.json({ error: 'Invalid recipientAddress' }, { status: 400 });
  }
  if (updates.amount && (typeof updates.amount !== 'number' || updates.amount <= 0)) {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }
  if (updates.currency && typeof updates.currency !== 'string') {
    return NextResponse.json({ error: 'Invalid currency' }, { status: 400 });
  }
  if (updates.frequency && !['weekly','biweekly','monthly'].includes(updates.frequency)) {
    return NextResponse.json({ error: 'Invalid frequency' }, { status: 400 });
  }
  // Only allow update if schedule belongs to user
  const updated = updateRecurringRemittance(params.id, updates);
  if (!updated || updated.userAddress !== auth.address) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
  return NextResponse.json(updated);
}

// DELETE /api/remittance/recurring/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  let auth;
  try {
    auth = await requireAuth();
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }
  // Only allow delete if schedule belongs to user
  const updated = updateRecurringRemittance(params.id, {});
  if (!updated || updated.userAddress !== auth.address) return NextResponse.json({ error: 'Not found or forbidden' }, { status: 404 });
  const deleted = deleteRecurringRemittance(params.id);
  if (!deleted) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
