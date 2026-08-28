import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  rank: number;
  /** Display name or truncated wallet address */
  name: string;
  xp: number;
  /** Formatted yield string e.g. "$1,250" */
  yieldAmount: string;
  /** True when the on-chain identity contract has verified this wallet */
  verified: boolean;
  /**
   * Merkle-proof hash from the prize_pool settlement tx for this entry.
   * Null until the backend claim-submission service provides it.
   */
  onChainProof: string | null;
}

export interface UseLeaderboardOptions {
  /** Number of entries to fetch (default 5) */
  limit?: number;
  /** Pagination offset (default 0) */
  offset?: number;
}

export interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  total: number;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  /** Manually re-fetch */
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Internal cache — keyed by limit+offset so paginated views are independent
// ---------------------------------------------------------------------------

const CACHE_PREFIX = 'leaderboard_cache_';
const CACHE_TTL_MS = 60_000; // 60 seconds

interface CacheEntry {
  entries: LeaderboardEntry[];
  total: number;
  fetchedAt: number;
}

function readCache(cacheKey: string): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

function writeCache(cacheKey: string, entries: LeaderboardEntry[], total: number): void {
  try {
    const entry: CacheEntry = { entries, total, fetchedAt: Date.now() };
    sessionStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch {
    // sessionStorage may be unavailable
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches the weekly leaderboard from `/api/pool/leaderboard` with a
 * 60-second session-storage cache. Follows the same useState/useEffect
 * pattern as other hooks in this project.
 *
 * Usage:
 * ```tsx
 * const { entries, isLoading, isError, refetch } = useLeaderboard({ limit: 5 });
 * ```
 */
export function useLeaderboard({
  limit = 5,
  offset = 0,
}: UseLeaderboardOptions = {}): UseLeaderboardResult {
  const cacheKey = `${CACHE_PREFIX}${limit}_${offset}`;

  const initialCache = readCache(cacheKey);
  const [entries, setEntries] = useState<LeaderboardEntry[]>(
    () => readCache(cacheKey)?.entries ?? [],
  );
  const [total, setTotal] = useState<number>(() => initialCache?.total ?? 0);
  const [isLoading, setIsLoading] = useState<boolean>(!initialCache);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    // Bust the cache for this page so the next effect run does a fresh fetch
    try {
      sessionStorage.removeItem(cacheKey);
    } catch {
      // ignore
    }
    setFetchTrigger((n) => n + 1);
  }, [cacheKey]);

  useEffect(() => {
    let cancelled = false;

    // Serve from cache when fresh
    const cached = readCache(cacheKey);
    if (cached) {
      setEntries(cached.entries);
      setTotal(cached.total);
      setIsLoading(false);
      setIsError(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    const controller = new AbortController();
    const url = `/api/pool/leaderboard?limit=${limit}&offset=${offset}`;

    fetch(url, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json() as Promise<{ entries: LeaderboardEntry[]; total: number }>;
      })
      .then(({ entries: newEntries, total: newTotal }) => {
        if (cancelled) return;
        writeCache(cacheKey, newEntries, newTotal);
        setEntries(newEntries);
        setTotal(newTotal);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setIsError(true);
        setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [cacheKey, limit, offset, fetchTrigger]);

  return { entries, total, isLoading, isError, error, refetch };
}
