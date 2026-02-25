import { NextResponse } from 'next/server';
import { withApiLogger } from '@/lib/api-logger-middleware';

export const GET = withApiLogger(async () => {
  return NextResponse.json({ status: 'ok' });
});
