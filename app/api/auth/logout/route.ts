import { NextRequest, NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/session';

export async function POST(_request: NextRequest) {
  // Clear the session cookie via the centralized helper so the cookie name,
  // path, and flags stay consistent with how the session is created.
  const response = NextResponse.json({
    ok: true,
    message: 'Logged out successfully',
  });
  response.headers.set('Set-Cookie', clearSessionCookie());
  return response;
}
