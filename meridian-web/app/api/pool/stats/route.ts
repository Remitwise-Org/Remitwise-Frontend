import { NextResponse } from 'next/server';

/**
 * GET /api/pool/stats
 *
 * Returns the current pool statistics. In production this is fed by the
 * Soroban prize_pool contract and the Supabase leaderboard sync service.
 * The `onChainProof` field carries a Merkle-proof hash so the frontend can
 * surface a "data verified on-chain" indicator.
 *
 * While the Soroban integration is being wired up, the handler reads from
 * environment variables with safe fallbacks so staging and preview deploys
 * still return real-looking data without a live RPC connection.
 */
export async function GET() {
  try {
    const stats: PoolStatsResponse = {
      totalPoolValue: process.env.POOL_TOTAL_VALUE ?? null,
      weeklyApy: process.env.POOL_WEEKLY_APY ?? null,
      totalParticipants: process.env.POOL_TOTAL_PARTICIPANTS
        ? Number(process.env.POOL_TOTAL_PARTICIPANTS)
        : null,
      weeklyYieldPaid: process.env.POOL_WEEKLY_YIELD_PAID ?? null,
      // On-chain proof hash from the prize_pool contract's last settlement tx.
      // Populated by the backend claim-submission service (issue #20).
      onChainProof: process.env.POOL_ONCHAIN_PROOF ?? null,
      lastSettledAt: process.env.POOL_LAST_SETTLED_AT ?? null,
      deltaLabel: process.env.POOL_DELTA_LABEL ?? null,
      deltaVariant: (process.env.POOL_DELTA_VARIANT as PoolStatsResponse['deltaVariant']) ?? null,
    };

    return NextResponse.json(stats, {
      headers: {
        // Allow clients to cache for 60 s; CDN can cache for 120 s.
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    console.error('[/api/pool/stats]', err);
    return NextResponse.json({ error: 'Failed to fetch pool stats' }, { status: 500 });
  }
}

export interface PoolStatsResponse {
  totalPoolValue: string | null;
  weeklyApy: string | null;
  totalParticipants: number | null;
  weeklyYieldPaid: string | null;
  /** SHA-256 of the on-chain settlement transaction hash — null until first settlement. */
  onChainProof: string | null;
  lastSettledAt: string | null;
  deltaLabel: string | null;
  deltaVariant: 'positive' | 'negative' | 'neutral' | null;
}
