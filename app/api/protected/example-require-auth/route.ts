/**
 * Example protected route using requireAuth helper
 * Demonstrates try-catch pattern for automatic 401 handling
 */

import { requireAuth } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Validate session or throw 401 Response
    const { address } = await requireAuth();
    
    // Process authenticated request with user data
    return Response.json({ 
      message: 'Protected data accessed successfully',
      user: address,
      data: {
        // Example protected data
        accountBalance: 1000,
        recentTransactions: []
      }
    });
  } catch (res) {
    // requireAuth throws Response on auth failure
    if (res instanceof Response) return res;
    throw res;
  }
}
