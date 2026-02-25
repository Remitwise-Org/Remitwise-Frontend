import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';

async function getHandler(request: NextRequest, session: string) {
  // TODO: Fetch bills from Soroban bill_payments contract
  return NextResponse.json({ bills: [] });
}

async function postHandler(request: NextRequest, session: string) {
  const body = await request.json();
  // TODO: Create/pay bill in Soroban bill_payments contract
  return NextResponse.json({ success: true });
}

export const GET = withAuth(getHandler);
export const POST = withAuth(postHandler);
