import { NextRequest, NextResponse } from 'next/server';
import { withApiLogger } from '@/lib/api-logger-middleware';
import { validateAuth, unauthorizedResponse } from '@/lib/auth';

export const GET = withApiLogger(async (request: NextRequest) => {
  if (!validateAuth(request)) return unauthorizedResponse();
  // TODO: Fetch bills from Soroban bill_payments contract
  return NextResponse.json({ bills: [] });
});

export const POST = withApiLogger(async (request: NextRequest) => {
  if (!validateAuth(request)) return unauthorizedResponse();
  const body = await request.json();
  // TODO: Create/pay bill in Soroban bill_payments contract
  return NextResponse.json({ success: true });
});
