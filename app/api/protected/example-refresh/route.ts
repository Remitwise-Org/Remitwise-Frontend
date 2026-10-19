/**
 * Example protected route using getSessionWithRefresh pattern
 * Demonstrates manual session validation with automatic refresh
 */

import { getSessionWithRefresh, clearSessionCookie } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Validate session (with refresh if enabled)
  const session = await getSessionWithRefresh();
  
  if (!session?.address) {
    return Response.json(
      { error: 'Unauthorized', message: 'Session expired' },
      { 
        status: 401,
        headers: { 'Set-Cookie': clearSessionCookie() }
      }
    );
  }
  
  // Process authenticated request
  return Response.json({ 
    message: 'Protected data accessed successfully',
    user: session.address,
    sessionInfo: {
      createdAt: new Date(session.createdAt).toISOString(),
      expiresAt: new Date(session.expiresAt).toISOString()
    }
  });
}
