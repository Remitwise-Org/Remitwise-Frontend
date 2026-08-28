import { useState, useEffect, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PoolStats {
  totalPoolValue: string | null;
  weeklyApy: string | null;
  totalParticipants: number | null;
  weeklyYieldPaid: string | null;
  /** SHA-256 of the on-chain settlement transaction — present when Soroban data is live */
  onChainProof: string | null;
  lastSettledAt: string | null;
  deltaLabel: string | null;
  deltaVariant: 'positive' | 'negative' | 'neutral' | null;
}

export interface UsePoolStatsResult {
  data: PoolStats | null;
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  /** Manually re-fetch stats */
  refetch: () => void;
}

// ---------------------------------------------------------------------------
// Internal cache
// ---------------------------------------------------------------------------

const CACHE_KEY = 'pool_stats_cache';
const CACHE_TTL_MS = 60_000; // 60 seconds

interface CacheEntry {
  data: PoolStats;
  fetchedAt: number;
}

function readCache(): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.fetchedAt > CACHE_TTL_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

function writeCache(data: PoolStats): void {
  try {
    const entry: CacheEntry = { data, fetchedAt: Date.now() };
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // sessionStorage may be unavailable in SSR or private-mode browsers
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches live pool statistics from `/api/pool/stats` with a 60-second
 * session-storage cache. Follows the same useState/useEffect pattern as the
 * other hooks in this project — no external caching library required.
 *
 * Usage:
 * ```tsx
 * const { data, isLoading, isError, refetch } = usePoolStats();
 * ```
 */
export function usePoolStats(): UsePoolStatsResult {
  const [data, setData] = useState<PoolStats | null>(() => readCache()?.data ?? null);
  const [isLoading, setIsLoading] = useState<boolean>(!readCache());
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchTrigger, setFetchTrigger] = useState(0);

  const refetch = useCallback(() => {
    setFetchTrigger((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Serve from cache when fresh
    const cached = readCache();
    if (cached) {
      setData(cached.data);
      setIsLoading(false);
      setIsError(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setError(null);

    const controller = new AbortController();

    fetch('/api/pool/stats', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json() as Promise<PoolStats>;
      })
      .then((stats) => {
        if (cancelled) return;
        writeCache(stats);
        setData(stats);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof Error && err.name === 'AbortError') return;
        setIsError(true);
        setError(err instanceof Error ? err.message : 'Failed to fetch pool stats');
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [fetchTrigger]);

  return { data, isLoading, isError, error, refetch };
}
