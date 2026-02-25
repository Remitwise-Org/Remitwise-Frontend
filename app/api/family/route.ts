import { NextRequest, NextResponse } from 'next/server';
import { withApiLogger } from '@/lib/api-logger-middleware';
import { validateAuth, unauthorizedResponse } from '@/lib/auth';

export const GET = withApiLogger(async (request: NextRequest) => {
  if (!validateAuth(request)) return unauthorizedResponse();
  // TODO: Fetch family members from Soroban family_wallet contract
  return NextResponse.json({ members: [] });
});

export const POST = withApiLogger(async (request: NextRequest) => {
  if (!validateAuth(request)) return unauthorizedResponse();
  const body = await request.json();
  // TODO: Add family member in Soroban family_wallet contract
  return NextResponse.json({ success: true });
});
