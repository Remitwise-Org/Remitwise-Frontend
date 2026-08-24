import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/pool/leaderboard
 *
 * Returns the weekly XP leaderboard ranked by descending XP. Each entry
 * includes a `verified` flag sourced from the Soroban identity contract and
 * an optional `onChainProof` Merkle hash so the UI can show the
 * "verified on-chain" indicator per row.
 *
 * Query params:
 *   limit  – max entries to return (default 10, max 100)
 *   offset – pagination offset (default 0)
 *
 * While the Soroban RPC integration is being built, this returns a stable
 * mock dataset keyed to the `LEADERBOARD_MOCK` env var (set "false" to
 * return an empty list for empty-state testing).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const limit = Math.min(Number(searchParams.get('limit') ?? '10'), 100);
    const offset = Number(searchParams.get('offset') ?? '0');

    const useMock = process.env.LEADERBOARD_MOCK !== 'false';

    if (useMock) {
      const all: LeaderboardEntry[] = MOCK_ENTRIES;
      const page = all.slice(offset, offset + limit);

      return NextResponse.json(
        { entries: page, total: all.length } satisfies LeaderboardResponse,
        {
          headers: {
            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
          },
        },
      );
    }

    // TODO: replace with Soroban RPC + Supabase leaderboard query (issue #20)
    return NextResponse.json(
      { entries: [], total: 0 } satisfies LeaderboardResponse,
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=30',
        },
      },
    );
  } catch (err) {
    console.error('[/api/pool/leaderboard]', err);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

export interface LeaderboardEntry {
  rank: number;
  /** Display name or truncated wallet address */
  name: string;
  xp: number;
  /** Formatted yield string e.g. "$1,250" */
  yieldAmount: string;
  /** True when the identity contract has verified this wallet */
  verified: boolean;
  /**
   * Merkle-proof hash from the prize_pool settlement tx for this entry.
   * Null until the backend claim-submission service (issue #20) provides it.
   */
  onChainProof: string | null;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  total: number;
}

// ---------------------------------------------------------------------------
// Stable mock data — mirrors README prize table + identity section
// ---------------------------------------------------------------------------
const MOCK_ENTRIES: LeaderboardEntry[] = [
  {
    rank: 1,
    name: 'Alex Chen',
    xp: 15420,
    yieldAmount: '$1,250',
    verified: true,
    onChainProof: 'a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1',
  },
  {
    rank: 2,
    name: 'Sarah Williams',
    xp: 14890,
    yieldAmount: '$1,180',
    verified: true,
    onChainProof: 'b4e9c3d2e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0b2',
  },
  {
    rank: 3,
    name: 'Marcus Johnson',
    xp: 13650,
    yieldAmount: '$1,095',
    verified: false,
    onChainProof: null,
  },
  {
    rank: 4,
    name: 'Emma Davis',
    xp: 12340,
    yieldAmount: '$987',
    verified: true,
    onChainProof: 'c5f0d4e3f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0c3',
  },
  {
    rank: 5,
    name: 'James Wilson',
    xp: 11890,
    yieldAmount: '$945',
    verified: false,
    onChainProof: null,
  },
  {
    rank: 6,
    name: 'Priya Patel',
    xp: 10750,
    yieldAmount: '$860',
    verified: true,
    onChainProof: 'd6a1e5f4a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0d4',
  },
  {
    rank: 7,
    name: 'Yuki Tanaka',
    xp: 9830,
    yieldAmount: '$786',
    verified: false,
    onChainProof: null,
  },
  {
    rank: 8,
    name: 'Carlos Rivera',
    xp: 8920,
    yieldAmount: '$714',
    verified: true,
    onChainProof: 'e7b2f6a5b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0e5',
  },
  {
    rank: 9,
    name: 'Amara Osei',
    xp: 8100,
    yieldAmount: '$648',
    verified: false,
    onChainProof: null,
  },
  {
    rank: 10,
    name: 'Nina Kowalski',
    xp: 7540,
    yieldAmount: '$603',
    verified: true,
    onChainProof: 'f8c3a7b6c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0f6',
  },
];
