/**
 * Client-side rates cache for anchor exchange rates.
 * Caches rates in memory with a configurable TTL and exposes staleness metadata.
 */

export interface AnchorRate {
  asset: string;
  buy_price: number;
  sell_price: number;
  base_asset: string;
  expires_at: number;
}

export interface RatesCacheEntry {
  rates: AnchorRate[];
  fetchedAt: number;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000;
const STALE_WARN_MS = 90_000;

let cache: RatesCacheEntry | null = null;

export function getCachedRates(): RatesCacheEntry | null {
  return cache;
}

export function setRatesCache(rates: AnchorRate[]): RatesCacheEntry {
  const now = Date.now();
  cache = { rates, fetchedAt: now, expiresAt: now + CACHE_TTL_MS };
  return cache;
}

export function isRateStale(): boolean {
  if (!cache) return true;
  return Date.now() > cache.fetchedAt + STALE_WARN_MS;
}

export function isRateExpired(): boolean {
  if (!cache) return true;
  return Date.now() > cache.expiresAt;
}

export function clearRatesCache(): void {
  cache = null;
}
