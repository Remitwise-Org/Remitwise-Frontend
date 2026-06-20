import type { ExchangeRate } from '@/lib/anchor/client';
import { registerCache } from '@/lib/cache/registry';

export const RATES_CACHE_TTL_MS = 5 * 60 * 1000;

export interface AnchorRatesCacheData {
  rates: ExchangeRate[] | null;
  timestamp: number;
}

const initialState: AnchorRatesCacheData = {
  rates: null,
  timestamp: 0,
};

let rateCache: AnchorRatesCacheData = { ...initialState };

export function getAnchorRatesCache(): AnchorRatesCacheData {
  return rateCache;
}

export function setAnchorRatesCache(rates: ExchangeRate[], timestamp: number): void {
  rateCache = { rates, timestamp };
}

export function clearAnchorRatesCache(): void {
  rateCache = { ...initialState };
}

export function isCacheFresh(now: number = Date.now()): boolean {
  return rateCache.rates !== null && now - rateCache.timestamp < RATES_CACHE_TTL_MS;
}

export function isCacheStale(now: number = Date.now()): boolean {
  return rateCache.rates !== null && now - rateCache.timestamp >= RATES_CACHE_TTL_MS;
}

export function getCacheAgeMs(now: number = Date.now()): number | null {
  if (rateCache.rates === null) return null;
  return now - rateCache.timestamp;
}

registerCache('anchor_rates', clearAnchorRatesCache);
