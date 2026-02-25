import { withApiLogger } from '@/lib/api-logger-middleware';
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export const POST = withApiLogger(async () => {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  return NextResponse.json({ success: true });
});
