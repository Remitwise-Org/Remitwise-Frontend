import type { ExchangeRate } from '@/lib/anchor/client';
import { registerCache } from '@/lib/cache/registry';

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

registerCache('anchor_rates', clearAnchorRatesCache);

