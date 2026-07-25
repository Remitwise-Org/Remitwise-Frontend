import { NextRequest, NextResponse } from 'next/server';
import { recurringStore } from '@/lib/remittance/recurring-store';
import { requireAuth } from '@/lib/session';

// PATCH /api/remittance/recurring/[id]
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let auth;
  try {
    auth = await requireAuth();
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }

  const existing = await recurringStore.get(id);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (existing.userAddress !== auth.address) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const updates = await req.json();
    const updated = await recurringStore.update(id, updates);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Invalid request input' }, { status: 400 });
  }
}

// DELETE /api/remittance/recurring/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let auth;
  try {
    auth = await requireAuth();
  } catch (res) {
    if (res instanceof Response) return res;
    throw res;
  }

  const existing = await recurringStore.get(id);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (existing.userAddress !== auth.address) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const deleted = await recurringStore.delete(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
