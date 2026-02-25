import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';

async function handler(request: NextRequest, session: string) {
  const body = await request.json();
  // TODO: Create and submit Stellar transaction
  return NextResponse.json({ 
    transactionId: 'placeholder',
    success: true 
  });
}

export const POST = withAuth(handler);
