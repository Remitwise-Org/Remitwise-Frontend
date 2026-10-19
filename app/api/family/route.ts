import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';

async function getHandler(request: NextRequest, session: string) {
  // TODO: Fetch family members from Soroban family_wallet contract
  return NextResponse.json({ members: [] });
}

async function postHandler(request: NextRequest, session: string) {
  const body = await request.json();
  // TODO: Add family member in Soroban family_wallet contract
  return NextResponse.json({ success: true });
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
