/**
 * @file rates-cache.ts
 * @description In-memory cache for Anchor exchange rates.
 *
 * ## Freshness Contract
 * - **Initial State**: The cache is empty (i.e. rates are `null` and timestamp is `0`).
 * - **TTL (Time To Live)**: The cache has a configured TTL of **5 minutes**
 *   (300,000 milliseconds) as defined in the rates API route.
 * - **Validity Criteria**: The cache is considered fresh (valid) at a given time
 *   `now` if and only if:
 *   1. `rates` is not `null` (the cache has been populated at least once), AND
 *   2. `(now - timestamp) < 300_000` (strictly less than 5 minutes have elapsed).
 * - **Staleness**: If the cache is empty (`rates === null`) **or** the elapsed time
 *   since `timestamp` is **greater than or equal to** 300,000 ms, it is stale.
 *   Note the strict inequality: `elapsed === TTL` is already stale.
 * - **Empty array vs null**: An empty `rates` array (`[]`) is treated as a
 *   successful (but empty) fetch — it is **not** null and therefore participates
 *   in normal TTL freshness checks.
 * - **Invalidation**: Calling `clearAnchorRatesCache()` or triggering the central
 *   registry (`clearRegisteredCaches()`) resets the cache to its initial state
 *   (`{ rates: null, timestamp: 0 }`), making it immediately stale.
 * - **Double-set / latest-wins**: A subsequent `setAnchorRatesCache` call fully
 *   overwrites the previous rates and timestamp; no merging occurs.
 */

import type { ExchangeRate } from '@/lib/anchor/client';
import { registerCache } from '@/lib/cache/registry';

/**
 * Structure of the cached anchor exchange rates data.
 */
export interface AnchorRatesCacheData {
  /** The list of exchange rates returned by the Anchor API, or `null` if not yet populated. */
  rates: ExchangeRate[] | null;
  /**
   * The epoch timestamp (ms) at which `rates` was last fetched and stored.
   * Initialised to `0` so that `(now - 0) >= TTL` is always true, ensuring
   * the cache is treated as stale before it has ever been populated.
   */
  timestamp: number;
}

const initialState: AnchorRatesCacheData = {
  rates: null,
  timestamp: 0,
};

let rateCache: AnchorRatesCacheData = { ...initialState };

/**
 * Retrieves the current cached anchor exchange rates and timestamp.
 *
 * **Callers are responsible for freshness checks.** Use the freshness
 * contract documented at the top of this file to decide whether to
 * use the returned value or re-fetch from the Anchor API.
 *
 * @returns The cached rates data containing rates list and set timestamp.
 */
export function getAnchorRatesCache(): AnchorRatesCacheData {
  return rateCache;
}

/**
 * Sets/updates the cached anchor exchange rates with a new list of rates
 * and a timestamp. Overwrites any previously stored rates (latest-wins).
 *
 * @param rates     - The array of exchange rates to cache. May be empty (`[]`)
 *                    if the Anchor API returned no pairs.
 * @param timestamp - The epoch timestamp (ms) at which the rates were fetched.
 *                    Typically `Date.now()` at fetch time.
 */
export function setAnchorRatesCache(rates: ExchangeRate[], timestamp: number): void {
  rateCache = { rates, timestamp };
}

/**
 * Clears the cached rates, resetting the storage to its initial/empty state
 * (`{ rates: null, timestamp: 0 }`).
 *
 * This is idempotent — calling it on an already-empty cache is safe and
 * produces no side-effects.
 *
 * Called directly by `clearAnchorRatesCache()` and indirectly by the
 * central registry (e.g. from `/api/admin/cache/clear`).
 */
export function clearAnchorRatesCache(): void {
  rateCache = { ...initialState };
}

// Register with central cache registry for admin/on-demand cache clear capabilities
registerCache('anchor_rates', clearAnchorRatesCache);
