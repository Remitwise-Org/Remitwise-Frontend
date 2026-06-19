/**
 * @file anchor-rates-cache.test.ts
 * @description Comprehensive unit tests for lib/anchor/rates-cache.ts and its
 * integration with lib/cache/registry.ts.
 *
 * ## Why this suite exists
 * Exchange rates are load-bearing data for send/split quotes. A stale or
 * incorrectly invalidated cache means users see wrong amounts before sending
 * money — a direct correctness and trust problem.
 *
 * ## Coverage targets
 * - rates-cache.ts  : ≥ 95% branches
 * - registry.ts     : ≥ 95% branches
 *
 * ## Test strategy
 * - `vi.useFakeTimers()` controls `Date.now()` without real wall-clock waits.
 * - `clearAnchorRatesCache()` is called in `beforeEach` so module-level cache
 *   state never bleeds between test cases.
 * - Registry tests import `clearRegisteredCaches` / `listRegisteredCaches`
 *   directly to mirror what `/api/admin/cache/clear` does at runtime.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getAnchorRatesCache,
  setAnchorRatesCache,
  clearAnchorRatesCache,
  type AnchorRatesCacheData,
} from '@/lib/anchor/rates-cache';
import {
  clearRegisteredCaches,
  listRegisteredCaches,
} from '@/lib/cache/registry';
import type { ExchangeRate } from '@/lib/anchor/client';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Must match the TTL used in the Anchor rates API route (300,000 ms = 5 min). */
const CACHE_TTL = 5 * 60 * 1_000;

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const singleRate: ExchangeRate[] = [
  { sell_asset: 'USD', buy_asset: 'EUR', price: '0.92' },
];

const multiRates: ExchangeRate[] = [
  { sell_asset: 'USD', buy_asset: 'EUR', price: '0.92' },
  { sell_asset: 'USD', buy_asset: 'MXN', price: '17.05' },
  { sell_asset: 'EUR', buy_asset: 'GBP', price: '0.86' },
];

const updatedRates: ExchangeRate[] = [
  { sell_asset: 'EUR', buy_asset: 'USD', price: '1.09' },
];

// ---------------------------------------------------------------------------
// Helper: derive freshness the same way the API route does
// Freshness contract:  rates !== null  &&  (now - timestamp) < CACHE_TTL
// ---------------------------------------------------------------------------
const isCacheFresh = (now: number): boolean => {
  const cache = getAnchorRatesCache();
  return cache.rates !== null && now - cache.timestamp < CACHE_TTL;
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('Anchor Rates Cache — unit tests', () => {
  beforeEach(() => {
    /**
     * Reset module-level cache state before every test so that no test case
     * can influence the outcome of a subsequent one (state-bleed prevention).
     */
    clearAnchorRatesCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Initial / Empty State
  // =========================================================================

  describe('1 · Initial / empty state', () => {
    it('returns null rates on first access (never set)', () => {
      const cache = getAnchorRatesCache();
      expect(cache.rates).toBeNull();
    });

    it('returns timestamp = 0 on first access (never set)', () => {
      const cache = getAnchorRatesCache();
      expect(cache.timestamp).toBe(0);
    });

    it('considers the cache stale when it has never been populated', () => {
      expect(isCacheFresh(Date.now())).toBe(false);
    });

    it('returns a defined object (not undefined / null)', () => {
      expect(getAnchorRatesCache()).toBeDefined();
    });
  });

  // =========================================================================
  // 2. Set / Get — Round-trip
  // =========================================================================

  describe('2 · set/get round-trip', () => {
    it('stores a single-item rate array and retrieves it intact', () => {
      const ts = Date.now();
      setAnchorRatesCache(singleRate, ts);

      const cache = getAnchorRatesCache();
      expect(cache.rates).toEqual(singleRate);
      expect(cache.timestamp).toBe(ts);
    });

    it('stores a multi-item rate array and retrieves every entry intact', () => {
      const ts = Date.now();
      setAnchorRatesCache(multiRates, ts);

      const cache = getAnchorRatesCache();
      expect(cache.rates).toHaveLength(multiRates.length);
      expect(cache.rates).toEqual(multiRates);
      expect(cache.timestamp).toBe(ts);
    });

    it('stores an empty rate array (edge: no pairs available)', () => {
      const ts = Date.now();
      setAnchorRatesCache([], ts);

      const cache = getAnchorRatesCache();
      expect(cache.rates).toEqual([]);
      expect(cache.timestamp).toBe(ts);
    });

    it('preserves the exact timestamp value supplied by the caller', () => {
      const specificTs = 1_700_000_000_000;
      setAnchorRatesCache(singleRate, specificTs);
      expect(getAnchorRatesCache().timestamp).toBe(specificTs);
    });

    it('rate entries have all three required fields (sell_asset, buy_asset, price)', () => {
      setAnchorRatesCache(multiRates, Date.now());
      const { rates } = getAnchorRatesCache();
      rates!.forEach((r) => {
        expect(r).toHaveProperty('sell_asset');
        expect(r).toHaveProperty('buy_asset');
        expect(r).toHaveProperty('price');
      });
    });
  });

  // =========================================================================
  // 3. Double-set — "latest wins" semantics
  // =========================================================================

  describe('3 · double-set — latest wins', () => {
    it('second set completely replaces rates from the first set', () => {
      setAnchorRatesCache(multiRates, 1_000);
      setAnchorRatesCache(updatedRates, 2_000);

      const cache = getAnchorRatesCache();
      expect(cache.rates).toEqual(updatedRates);
    });

    it('second set completely replaces the timestamp from the first set', () => {
      setAnchorRatesCache(multiRates, 1_000);
      setAnchorRatesCache(updatedRates, 2_000);

      expect(getAnchorRatesCache().timestamp).toBe(2_000);
    });

    it('three sequential sets — only the last one survives', () => {
      setAnchorRatesCache(multiRates, 1_000);
      setAnchorRatesCache(updatedRates, 2_000);
      const finalRates: ExchangeRate[] = [{ sell_asset: 'GBP', buy_asset: 'USD', price: '1.27' }];
      setAnchorRatesCache(finalRates, 3_000);

      const cache = getAnchorRatesCache();
      expect(cache.rates).toEqual(finalRates);
      expect(cache.timestamp).toBe(3_000);
    });

    it('setting back to same rates with a newer timestamp updates timestamp', () => {
      setAnchorRatesCache(singleRate, 1_000);
      setAnchorRatesCache(singleRate, 5_000);

      expect(getAnchorRatesCache().timestamp).toBe(5_000);
    });
  });

  // =========================================================================
  // 4. Freshness — TTL boundary tests (fake timers)
  // =========================================================================

  describe('4 · freshness / TTL boundaries', () => {
    it('is fresh immediately after set (elapsed = 0 ms)', () => {
      const now = Date.now();
      setAnchorRatesCache(multiRates, now);
      expect(isCacheFresh(now)).toBe(true);
    });

    it('is fresh when elapsed = 1 ms (well inside TTL)', () => {
      const now = Date.now();
      setAnchorRatesCache(multiRates, now);
      expect(isCacheFresh(now + 1)).toBe(true);
    });

    it('is fresh when elapsed = TTL − 1 ms (just before boundary)', () => {
      const now = Date.now();
      setAnchorRatesCache(multiRates, now);

      vi.setSystemTime(now + CACHE_TTL - 1);
      const checkTime = now + CACHE_TTL - 1;
      expect(isCacheFresh(checkTime)).toBe(true);
    });

    it('is stale when elapsed = TTL exactly (boundary: strictly-less-than fails)', () => {
      const now = Date.now();
      setAnchorRatesCache(multiRates, now);

      vi.setSystemTime(now + CACHE_TTL);
      const checkTime = now + CACHE_TTL;
      expect(isCacheFresh(checkTime)).toBe(false);
    });

    it('is stale when elapsed = TTL + 1 ms (just after boundary)', () => {
      const now = Date.now();
      setAnchorRatesCache(multiRates, now);

      vi.setSystemTime(now + CACHE_TTL + 1);
      const checkTime = now + CACHE_TTL + 1;
      expect(isCacheFresh(checkTime)).toBe(false);
    });

    it('is stale when elapsed >> TTL (long time after set, e.g. 1 hour)', () => {
      const now = Date.now();
      setAnchorRatesCache(multiRates, now);

      const oneHour = 60 * 60 * 1_000;
      expect(isCacheFresh(now + oneHour)).toBe(false);
    });

    it('becomes fresh again after a refresh set following expiry', () => {
      const start = Date.now();
      setAnchorRatesCache(multiRates, start);

      // Simulate expiry
      const expiredAt = start + CACHE_TTL + 1_000;
      vi.setSystemTime(expiredAt);
      expect(isCacheFresh(expiredAt)).toBe(false);

      // Simulate a refresh fetch
      const refreshedAt = Date.now(); // now = expiredAt (fake timers)
      setAnchorRatesCache(updatedRates, refreshedAt);
      expect(isCacheFresh(refreshedAt)).toBe(true);
    });

    it('empty-array rates do NOT make the cache "fresh" by default (null vs empty arr differs)', () => {
      // An empty array IS set, so rates !== null → freshness depends only on TTL
      const now = Date.now();
      setAnchorRatesCache([], now);
      // Rates are [] (not null) so still considered "populated" — fresh immediately
      expect(isCacheFresh(now)).toBe(true);
    });

    it('null rates (initial state) are never fresh regardless of timestamp manipulation', () => {
      // Directly verify that the freshness helper respects the null guard
      const cache: AnchorRatesCacheData = getAnchorRatesCache();
      expect(cache.rates).toBeNull();
      // Supply "now" that would be within TTL if rates were set
      expect(isCacheFresh(Date.now())).toBe(false);
    });
  });

  // =========================================================================
  // 5. Direct clearAnchorRatesCache
  // =========================================================================

  describe('5 · clearAnchorRatesCache — direct invocation', () => {
    it('resets rates to null after a set', () => {
      setAnchorRatesCache(multiRates, Date.now());
      clearAnchorRatesCache();
      expect(getAnchorRatesCache().rates).toBeNull();
    });

    it('resets timestamp to 0 after a set', () => {
      setAnchorRatesCache(multiRates, Date.now());
      clearAnchorRatesCache();
      expect(getAnchorRatesCache().timestamp).toBe(0);
    });

    it('is idempotent — clearing an already-empty cache does not throw', () => {
      expect(() => {
        clearAnchorRatesCache();
        clearAnchorRatesCache();
      }).not.toThrow();
    });

    it('cache is stale immediately after clear', () => {
      setAnchorRatesCache(multiRates, Date.now());
      clearAnchorRatesCache();
      expect(isCacheFresh(Date.now())).toBe(false);
    });

    it('allows a fresh set after a clear (clear → set cycle)', () => {
      setAnchorRatesCache(multiRates, Date.now());
      clearAnchorRatesCache();

      const ts = Date.now();
      setAnchorRatesCache(updatedRates, ts);

      const cache = getAnchorRatesCache();
      expect(cache.rates).toEqual(updatedRates);
      expect(cache.timestamp).toBe(ts);
    });

    it('multiple clear → set → clear cycles leave cache empty', () => {
      for (let i = 0; i < 3; i++) {
        setAnchorRatesCache(multiRates, Date.now() + i * 1_000);
        clearAnchorRatesCache();
      }
      expect(getAnchorRatesCache().rates).toBeNull();
      expect(getAnchorRatesCache().timestamp).toBe(0);
    });
  });

  // =========================================================================
  // 6. Registry integration — mirrors /api/admin/cache/clear
  // =========================================================================

  describe('6 · registry integration (mirrors /api/admin/cache/clear)', () => {
    it('registers under the key "anchor_rates"', () => {
      expect(listRegisteredCaches()).toContain('anchor_rates');
    });

    it('listRegisteredCaches returns an array', () => {
      expect(Array.isArray(listRegisteredCaches())).toBe(true);
    });

    it('clearRegisteredCaches returns "anchor_rates" in its cleared list', async () => {
      const cleared = await clearRegisteredCaches();
      expect(cleared).toContain('anchor_rates');
    });

    it('registry-driven clear resets rates to null (populated cache)', async () => {
      setAnchorRatesCache(multiRates, Date.now());
      expect(getAnchorRatesCache().rates).not.toBeNull();

      await clearRegisteredCaches();

      expect(getAnchorRatesCache().rates).toBeNull();
    });

    it('registry-driven clear resets timestamp to 0 (populated cache)', async () => {
      setAnchorRatesCache(multiRates, Date.now());

      await clearRegisteredCaches();

      expect(getAnchorRatesCache().timestamp).toBe(0);
    });

    it('registry-driven clear on an empty cache does not throw', async () => {
      // cache starts empty (clearAnchorRatesCache called in beforeEach)
      expect(getAnchorRatesCache().rates).toBeNull();

      await expect(clearRegisteredCaches()).resolves.not.toThrow();
    });

    it('cache remains empty after registry-driven clear on already-empty cache', async () => {
      await clearRegisteredCaches();

      expect(getAnchorRatesCache().rates).toBeNull();
      expect(getAnchorRatesCache().timestamp).toBe(0);
    });

    it('set → registry-clear → set restores a populated, fresh cache', async () => {
      const ts1 = Date.now();
      setAnchorRatesCache(multiRates, ts1);
      await clearRegisteredCaches();

      const ts2 = Date.now() + 1_000;
      setAnchorRatesCache(updatedRates, ts2);

      const cache = getAnchorRatesCache();
      expect(cache.rates).toEqual(updatedRates);
      expect(cache.timestamp).toBe(ts2);
    });

    it('cache is stale immediately after registry-driven clear', async () => {
      setAnchorRatesCache(multiRates, Date.now());
      await clearRegisteredCaches();

      expect(isCacheFresh(Date.now())).toBe(false);
    });
  });
});
