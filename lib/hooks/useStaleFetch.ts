'use client';

/**
 * useStaleFetch
 *
 * A generic data-fetching hook that returns the last-good (cached) response
 * when a live fetch fails, together with a `isStale` flag so the UI can warn
 * the user that the displayed data may be outdated.
 *
 * ## Cache contract
 * - Last-good data is stored in `sessionStorage` (keyed by the supplied `cacheKey`).
 * - On a successful fetch the new payload overwrites the cached entry.
 * - On a failed fetch (network error, non-2xx response, or null from session-expiry
 *   flow) the hook falls back to the last cached payload. If no cache entry exists
 *   the state falls through to `'error'` exactly as before.
 * - Session-expiry (`null` return from `apiClient`) is passed through untouched: the
 *   session-expiry UI takes over and no stale banner is shown.
 *
 * ## State machine
 * ```
 * 'loading' ──success──► 'ready'   (isStale=false)
 *           ──failure──► 'stale'   (isStale=true, cached data present)
 *                     ──► 'error'  (no cache, isStale=false)
 * ```
 *
 * @example
 * ```tsx
 * const { state, data, isStale, load } = useStaleFetch<DashboardResponse>({
 *   url: '/api/dashboard',
 *   cacheKey: 'dashboard-data',
 * });
 * ```
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/client/apiClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FetchState = 'loading' | 'stale' | 'ready' | 'error';

export interface UseStaleFetchOptions {
  /** API endpoint to `GET`. */
  url: string;
  /**
   * Unique key used as the `sessionStorage` cache key.
   * Keep it stable across renders (e.g. a string literal, not a dynamic value
   * that changes on every render).
   */
  cacheKey: string;
  /**
   * Maximum age (in milliseconds) for the sessionStorage entry to be considered
   * usable as stale fallback. Defaults to **5 minutes**.
   * Set to `0` to disable age gating (any cached entry is acceptable).
   */
  maxStaleAgeMs?: number;
}

export interface UseStaleFetchResult<T> {
  /** Current fetch state. */
  state: FetchState;
  /** Fetched (or stale-cached) payload, or `null` when not yet available. */
  data: T | null;
  /**
   * `true` when `data` was served from the cache because the live fetch failed.
   * Always `false` when `state` is `'ready'` or `'error'`.
   */
  isStale: boolean;
  /**
   * Timestamp (ms, `Date.now()`) at which the stale data was originally cached.
   * `null` when `isStale` is `false`.
   */
  staleAt: number | null;
  /** Triggers a fresh fetch. Safe to call from event handlers. */
  load: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default maximum age for stale fallback data: 5 minutes. */
const DEFAULT_MAX_STALE_AGE_MS = 5 * 60 * 1000;

/** Envelope stored in sessionStorage. */
interface CacheEnvelope<T> {
  readonly data: T;
  readonly cachedAt: number;
}

type FetchResult<T> =
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'session-expired' };

/**
 * Shares GETs that overlap for the same URL. React Strict Mode intentionally
 * replays mount effects in development, and multiple consumers can mount in
 * the same render, but neither case should allocate an identical request.
 *
 * The response body is parsed inside the shared promise because a Response
 * stream cannot safely be consumed by each caller independently.
 */
const inFlightFetches = new Map<string, Promise<FetchResult<unknown>>>();

function fetchJsonOnce<T>(url: string): Promise<FetchResult<T>> {
  const existing = inFlightFetches.get(url);
  if (existing) return existing as Promise<FetchResult<T>>;

  const request = (async (): Promise<FetchResult<T>> => {
    const response = await apiClient.get(url);
    if (response === null) return { status: 'session-expired' };
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    return {
      status: 'success',
      data: (await response.json()) as T,
    };
  })();

  inFlightFetches.set(url, request as Promise<FetchResult<unknown>>);

  const clear = () => {
    if (inFlightFetches.get(url) === request) {
      inFlightFetches.delete(url);
    }
  };
  void request.then(clear, clear);

  return request;
}

// ---------------------------------------------------------------------------
// Storage helpers — wrapping sessionStorage so SSR and quota errors are safe
// ---------------------------------------------------------------------------

function readCache<T>(key: string): CacheEnvelope<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CacheEnvelope<T>;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  try {
    const envelope: CacheEnvelope<T> = { data, cachedAt: Date.now() };
    sessionStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Quota exceeded or private browsing — degrade silently.
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useStaleFetch<T>({
  url,
  cacheKey,
  maxStaleAgeMs = DEFAULT_MAX_STALE_AGE_MS,
}: UseStaleFetchOptions): UseStaleFetchResult<T> {
  const [state, setState] = useState<FetchState>('loading');
  const [data, setData] = useState<T | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [staleAt, setStaleAt] = useState<number | null>(null);

  // Track whether the component is still mounted to avoid state updates after
  // unmount (e.g. when navigating away while a fetch is in progress).
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!mountedRef.current) return;
    setState('loading');
    setIsStale(false);
    setStaleAt(null);

    try {
      const result = await fetchJsonOnce<T>(url);

      // The session-expired result means the redirect flow already took over.
      // We do not fall back to stale data in this case — just let the
      // session-expiry UI handle it.
      if (result.status === 'session-expired') {
        if (mountedRef.current) setState('error');
        return;
      }

      if (!mountedRef.current) return;
      writeCache(cacheKey, result.data);
      setData(result.data);
      setState('ready');
    } catch {
      if (!mountedRef.current) return;

      // Attempt to serve from sessionStorage cache.
      const envelope = readCache<T>(cacheKey);
      if (envelope) {
        const ageMs = Date.now() - envelope.cachedAt;
        if (maxStaleAgeMs === 0 || ageMs <= maxStaleAgeMs) {
          setData(envelope.data);
          setIsStale(true);
          setStaleAt(envelope.cachedAt);
          setState('stale');
          return;
        }
      }

      // No usable cache — hard error.
      setState('error');
    }
  }, [url, cacheKey, maxStaleAgeMs]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, data, isStale, staleAt, load };
}
