import { NextRequest, NextResponse } from 'next/server';
import { withApiLogger } from '@/lib/api-logger-middleware';
import { validateAuth, unauthorizedResponse } from '@/lib/auth';

export const POST = withApiLogger(async (request: NextRequest) => {
  if (!validateAuth(request)) return unauthorizedResponse();
  const body = await request.json();
  // TODO: Create and submit Stellar transaction
  return NextResponse.json({
    transactionId: 'placeholder',
    success: true
  });
});
