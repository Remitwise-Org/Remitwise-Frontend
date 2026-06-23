/**
 * Comprehensive unit tests for contract cache
 * Target: 95%+ code coverage
 * 
 * Run with: npm test or vitest
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  cachedContractCall,
  invalidate,
  invalidatePattern,
  clearCache,
  getCacheStats,
  getCacheKeys,
  resetMetrics,
  CacheError,
  CacheErrorCode,
  CONTRACT_IDS,
  CACHE_TTL,
} from '@/lib/cache/contract-cache';

describe('Contract Cache - Core Functionality', () => {
  beforeEach(() => {
    clearCache();
    resetMetrics();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cachedContractCall', () => {
    it('should cache results and return cached data on second call', async () => {
      let callCount = 0;
      const fetchFn = vi.fn(async () => {
        callCount++;
        return { data: 'test' };
      });

      const result1 = await cachedContractCall(
        CONTRACT_IDS.INSURANCE,
        'getActivePolicies',
        { owner: 'GXXX' },
        30,
        fetchFn
      );

      const result2 = await cachedContractCall(
        CONTRACT_IDS.INSURANCE,
        'getActivePolicies',
        { owner: 'GXXX' },
        30,
        fetchFn
      );

      expect(callCount).toBe(1);
      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
      expect(result1).toEqual({ data: 'test' });
    });

    it('should fetch fresh data after TTL expires', async () => {
      vi.useFakeTimers();
      let callCount = 0;
      const fetchFn = vi.fn(async () => {
        callCount++;
        return { data: `call-${callCount}` };
      });

      const result1 = await cachedContractCall(
        CONTRACT_IDS.INSURANCE,
        'getActivePolicies',
        { owner: 'GXXX' },
        2, // 2 second TTL
        fetchFn
      );

      // Advance time by 3 seconds
      vi.advanceTimersByTime(3000);

      const result2 = await cachedContractCall(
        CONTRACT_IDS.INSURANCE,
        'getActivePolicies',
        { owner: 'GXXX' },
        2,
        fetchFn
      );

      expect(callCount).toBe(2);
      expect(result1).toEqual({ data: 'call-1' });
      expect(result2).toEqual({ data: 'call-2' });

      vi.useRealTimers();
    });

    it('should cache different results for different args', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      await cachedContractCall(
        CONTRACT_IDS.INSURANCE,
        'getActivePolicies',
        { owner: 'GXXX1' },
        30,
        fetchFn
      );

      await cachedContractCall(
        CONTRACT_IDS.INSURANCE,
        'getActivePolicies',
        { owner: 'GXXX2' },
        30,
        fetchFn
      );

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should update cache hit/miss metrics', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      // First call - miss
      await cachedContractCall(
        CONTRACT_IDS.INSURANCE,
        'getActivePolicies',
        { owner: 'GXXX' },
        30,
        fetchFn
      );

      // Second call - hit
      await cachedContractCall(
        CONTRACT_IDS.INSURANCE,
        'getActivePolicies',
        { owner: 'GXXX' },
        30,
        fetchFn
      );

      const stats = getCacheStats();
      expect(stats.hitRate).toBe(0.5); // 1 hit out of 2 calls
      expect(stats.missRate).toBe(0.5);
    });
  });

  describe('Input Validation', () => {
    it('should throw CacheError for invalid contract ID', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      await expect(
        cachedContractCall('INVALID_CONTRACT', 'method', {}, 30, fetchFn)
      ).rejects.toThrow(CacheError);

      await expect(
        cachedContractCall('INVALID_CONTRACT', 'method', {}, 30, fetchFn)
      ).rejects.toThrow('Invalid contract ID');
    });

    it('should throw CacheError for empty contract ID', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      await expect(
        cachedContractCall('', 'method', {}, 30, fetchFn)
      ).rejects.toThrow(CacheError);
    });

    it('should throw CacheError for invalid method name', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      await expect(
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'invalid-method!', {}, 30, fetchFn)
      ).rejects.toThrow(CacheError);

      await expect(
        cachedContractCall(CONTRACT_IDS.INSURANCE, '', {}, 30, fetchFn)
      ).rejects.toThrow(CacheError);
    });

    it('should throw CacheError for invalid TTL', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      // TTL too short
      await expect(
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', {}, 0, fetchFn)
      ).rejects.toThrow(CacheError);

      // TTL too long
      await expect(
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', {}, 4000, fetchFn)
      ).rejects.toThrow(CacheError);

      // TTL not a number
      await expect(
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', {}, NaN, fetchFn)
      ).rejects.toThrow(CacheError);

      // TTL is Infinity
      await expect(
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', {}, Infinity, fetchFn)
      ).rejects.toThrow(CacheError);
    });

    it('should throw CacheError for non-object args', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      await expect(
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', null as any, 30, fetchFn)
      ).rejects.toThrow(CacheError);

      await expect(
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', [] as any, 30, fetchFn)
      ).rejects.toThrow(CacheError);

      await expect(
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', 'string' as any, 30, fetchFn)
      ).rejects.toThrow(CacheError);
    });

    it('should throw CacheError for non-serializable args', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));
      const circular: any = {};
      circular.self = circular;

      await expect(
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', circular, 30, fetchFn)
      ).rejects.toThrow(CacheError);
    });

    it('should throw CacheError for args exceeding size limit', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));
      const largeArgs = { data: 'x'.repeat(20000) }; // > 10KB

      await expect(
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', largeArgs, 30, fetchFn)
      ).rejects.toThrow(CacheError);
    });

    it('should throw CacheError for non-function fetchFn', async () => {
      await expect(
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', {}, 30, null as any)
      ).rejects.toThrow(CacheError);
    });

    it('should throw CacheError when fetchFn returns null', async () => {
      const fetchFn = vi.fn(async () => null);

      await expect(
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', {}, 30, fetchFn)
      ).rejects.toThrow(CacheError);
    });

    it('should throw CacheError when fetchFn returns undefined', async () => {
      const fetchFn = vi.fn(async () => undefined);

      await expect(
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', {}, 30, fetchFn)
      ).rejects.toThrow(CacheError);
    });
  });

  describe('Error Handling', () => {
    it('should propagate fetchFn errors', async () => {
      const fetchFn = vi.fn(async () => {
        throw new Error('RPC Error');
      });

      await expect(
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', {}, 30, fetchFn)
      ).rejects.toThrow('RPC Error');
    });

    it('should not cache failed fetch results', async () => {
      let callCount = 0;
      const fetchFn = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First call fails');
        }
        return { data: 'success' };
      });

      await expect(
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', {}, 30, fetchFn)
      ).rejects.toThrow('First call fails');

      const result = await cachedContractCall(
        CONTRACT_IDS.INSURANCE,
        'method',
        {},
        30,
        fetchFn
      );

      expect(result).toEqual({ data: 'success' });
      expect(callCount).toBe(2);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate consistent keys for same inputs', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      await cachedContractCall(
        CONTRACT_IDS.INSURANCE,
        'method',
        { a: 1, b: 2 },
        30,
        fetchFn
      );

      await cachedContractCall(
        CONTRACT_IDS.INSURANCE,
        'method',
        { a: 1, b: 2 },
        30,
        fetchFn
      );

      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should generate same key regardless of arg order', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      await cachedContractCall(
        CONTRACT_IDS.INSURANCE,
        'method',
        { a: 1, b: 2 },
        30,
        fetchFn
      );

      await cachedContractCall(
        CONTRACT_IDS.INSURANCE,
        'method',
        { b: 2, a: 1 },
        30,
        fetchFn
      );

      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('should generate different keys for different values', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      await cachedContractCall(
        CONTRACT_IDS.INSURANCE,
        'method',
        { a: 1 },
        30,
        fetchFn
      );

      await cachedContractCall(
        CONTRACT_IDS.INSURANCE,
        'method',
        { a: 2 },
        30,
        fetchFn
      );

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('invalidate', () => {
    it('should invalidate specific cache entry', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      await cachedContractCall(
        CONTRACT_IDS.INSURANCE,
        'method',
        { owner: 'GXXX' },
        30,
        fetchFn
      );

      const existed = invalidate(CONTRACT_IDS.INSURANCE, 'method', { owner: 'GXXX' });

      expect(existed).toBe(true);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Should fetch again after invalidation
      await cachedContractCall(
        CONTRACT_IDS.INSURANCE,
        'method',
        { owner: 'GXXX' },
        30,
        fetchFn
      );

      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('should return false when invalidating non-existent entry', () => {
      const existed = invalidate(CONTRACT_IDS.INSURANCE, 'method', { owner: 'GXXX' });
      expect(existed).toBe(false);
    });

    it('should throw CacheError for invalid inputs', () => {
      expect(() => invalidate('INVALID', 'method', {})).toThrow(CacheError);
      expect(() => invalidate(CONTRACT_IDS.INSURANCE, 'invalid!', {})).toThrow(CacheError);
    });
  });

  describe('invalidatePattern', () => {
    it('should invalidate all entries matching pattern', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method1', { owner: 'GXXX1' }, 30, fetchFn);
      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method1', { owner: 'GXXX2' }, 30, fetchFn);
      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method2', { owner: 'GXXX1' }, 30, fetchFn);
      await cachedContractCall(CONTRACT_IDS.REMITTANCE_SPLIT, 'getSplit', { env: 'testnet' }, 30, fetchFn);

      const count = invalidatePattern('INSURANCE_CONTRACT:method1');

      expect(count).toBe(2);
      expect(fetchFn).toHaveBeenCalledTimes(4);
    });

    it('should invalidate all entries for a contract', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method1', {}, 30, fetchFn);
      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method2', {}, 30, fetchFn);
      await cachedContractCall(CONTRACT_IDS.REMITTANCE_SPLIT, 'getSplit', {}, 30, fetchFn);

      const count = invalidatePattern('INSURANCE_CONTRACT');

      expect(count).toBe(2);
    });

    it('should throw CacheError for invalid pattern', () => {
      expect(() => invalidatePattern('')).toThrow(CacheError);
      expect(() => invalidatePattern('pattern with <script>')).toThrow(CacheError);
      expect(() => invalidatePattern('x'.repeat(2000))).toThrow(CacheError);
    });
  });

  describe('clearCache', () => {
    it('should clear all cache entries', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method1', {}, 30, fetchFn);
      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method2', {}, 30, fetchFn);

      clearCache();

      const stats = getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hitRate).toBeUndefined();
    });

    it('should reset metrics', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', {}, 30, fetchFn);
      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', {}, 30, fetchFn);

      clearCache();

      const stats = getCacheStats();
      expect(stats.hitRate).toBeUndefined();
      expect(stats.missRate).toBeUndefined();
    });
  });

  describe('getCacheStats', () => {
    it('should return correct statistics', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method1', {}, 30, fetchFn);
      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method2', {}, 30, fetchFn);

      const stats = getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(500);
      expect(stats.itemCount).toBe(2);
    });

    it('should calculate hit rate correctly', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      // 1 miss
      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', {}, 30, fetchFn);
      // 1 hit
      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', {}, 30, fetchFn);
      // 1 hit
      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', {}, 30, fetchFn);

      const stats = getCacheStats();
      expect(stats.hitRate).toBeCloseTo(2 / 3);
      expect(stats.missRate).toBeCloseTo(1 / 3);
    });
  });

  describe('getCacheKeys', () => {
    it('should return all cache keys', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method1', {}, 30, fetchFn);
      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method2', {}, 30, fetchFn);

      const keys = getCacheKeys();
      expect(keys).toHaveLength(2);
      expect(keys[0]).toContain('INSURANCE_CONTRACT');
    });

    it('should return frozen array', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'test' }));
      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', {}, 30, fetchFn);

      const keys = getCacheKeys();
      expect(Object.isFrozen(keys)).toBe(true);
    });
  });

  describe('TTL Mismatch Protection', () => {
    it('should not return cached data if TTL differs', async () => {
      vi.useFakeTimers();
      const fetchFn = vi.fn(async () => ({ data: 'test' }));

      // Cache with 60s TTL
      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', {}, 60, fetchFn);

      // Try to retrieve with 30s TTL - should fetch again
      await cachedContractCall(CONTRACT_IDS.INSURANCE, 'method', {}, 30, fetchFn);

      expect(fetchFn).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('Constants', () => {
    it('should have valid CONTRACT_IDS', () => {
      expect(CONTRACT_IDS.REMITTANCE_SPLIT).toBe('REMITTANCE_SPLIT_CONTRACT');
      expect(CONTRACT_IDS.SAVINGS_GOALS).toBe('SAVINGS_GOALS_CONTRACT');
      expect(CONTRACT_IDS.BILL_PAYMENTS).toBe('BILL_PAYMENTS_CONTRACT');
      expect(CONTRACT_IDS.INSURANCE).toBe('INSURANCE_CONTRACT');
    });

    it('should have valid CACHE_TTL values', () => {
      expect(CACHE_TTL.getSplit).toBe(60);
      expect(CACHE_TTL.getActivePolicies).toBe(45);
      expect(CACHE_TTL.getGoals).toBe(30);
    });
  });

  describe('In-Flight Request Coalescing', () => {
    // Small deferred helper so tests control exactly when a fetch settles,
    // letting us hold several callers "in flight" simultaneously.
    function deferred<T>() {
      let resolve!: (value: T) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    }

    it('coalesces concurrent misses for the same key into a single fetch', async () => {
      const d = deferred<{ data: string }>();
      let callCount = 0;
      const fetchFn = vi.fn(() => {
        callCount++;
        return d.promise;
      });

      // Three concurrent callers miss the cold cache for the same key.
      const p1 = cachedContractCall(CONTRACT_IDS.INSURANCE, 'getActivePolicies', { owner: 'GXXX' }, 30, fetchFn);
      const p2 = cachedContractCall(CONTRACT_IDS.INSURANCE, 'getActivePolicies', { owner: 'GXXX' }, 30, fetchFn);
      const p3 = cachedContractCall(CONTRACT_IDS.INSURANCE, 'getActivePolicies', { owner: 'GXXX' }, 30, fetchFn);

      // Only the leader has touched the network so far.
      expect(callCount).toBe(1);

      d.resolve({ data: 'shared' });
      const [r1, r2, r3] = await Promise.all([p1, p2, p3]);

      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(callCount).toBe(1);
      // All waiters receive the identical resolved value from the single fetch.
      expect(r1).toEqual({ data: 'shared' });
      expect(r2).toBe(r1);
      expect(r3).toBe(r1);
    });

    it('does not coalesce concurrent misses for different keys', async () => {
      const d = deferred<{ data: string }>();
      const fetchFn = vi.fn(() => d.promise);

      const p1 = cachedContractCall(CONTRACT_IDS.INSURANCE, 'm', { owner: 'A' }, 30, fetchFn);
      const p2 = cachedContractCall(CONTRACT_IDS.INSURANCE, 'm', { owner: 'B' }, 30, fetchFn);

      // Distinct keys → distinct flights → two network calls.
      expect(fetchFn).toHaveBeenCalledTimes(2);

      d.resolve({ data: 'ok' });
      await Promise.all([p1, p2]);
    });

    it('clears the in-flight entry on resolve so later misses re-fetch', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'v1' }));

      await Promise.all([
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'm', { o: 'G' }, 30, fetchFn),
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'm', { o: 'G' }, 30, fetchFn),
      ]);
      expect(fetchFn).toHaveBeenCalledTimes(1);

      // Invalidate to force a fresh miss. If the resolved flight were left
      // dangling, this re-fetch would never fire — it does, proving cleanup.
      invalidate(CONTRACT_IDS.INSURANCE, 'm', { o: 'G' });
      const r = await cachedContractCall(CONTRACT_IDS.INSURANCE, 'm', { o: 'G' }, 30, fetchFn);

      expect(r).toEqual({ data: 'v1' });
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    it('rejects all coalesced waiters and clears in-flight on failure (no poisoning)', async () => {
      let callCount = 0;
      const fetchFn = vi.fn(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error('RPC down');
        }
        return { data: 'recovered' };
      });

      const p1 = cachedContractCall(CONTRACT_IDS.INSURANCE, 'm', { o: 'G' }, 30, fetchFn);
      const p2 = cachedContractCall(CONTRACT_IDS.INSURANCE, 'm', { o: 'G' }, 30, fetchFn);

      // Both concurrent callers share the single failing flight.
      await expect(p1).rejects.toThrow('RPC down');
      await expect(p2).rejects.toThrow('RPC down');
      expect(callCount).toBe(1);

      // Failure must not poison the cache nor leave a stuck pending entry.
      expect(getCacheKeys()).toHaveLength(0);

      // The next call retries from scratch and succeeds.
      const r = await cachedContractCall(CONTRACT_IDS.INSURANCE, 'm', { o: 'G' }, 30, fetchFn);
      expect(r).toEqual({ data: 'recovered' });
      expect(callCount).toBe(2);
    });

    it('serves a fresh cache hit after a coalesced batch resolves (no extra fetch)', async () => {
      const fetchFn = vi.fn(async () => ({ data: 'cached' }));

      await Promise.all([
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'm', { o: 'G' }, 30, fetchFn),
        cachedContractCall(CONTRACT_IDS.INSURANCE, 'm', { o: 'G' }, 30, fetchFn),
      ]);

      // A later sequential call is a plain cache hit — the flight populated it.
      const r = await cachedContractCall(CONTRACT_IDS.INSURANCE, 'm', { o: 'G' }, 30, fetchFn);
      expect(r).toEqual({ data: 'cached' });
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    it('clearCache mid-flight resets coalescing so a new caller starts its own fetch', async () => {
      const d1 = deferred<{ data: string }>();
      const d2 = deferred<{ data: string }>();
      const fetchFn = vi
        .fn()
        .mockImplementationOnce(() => d1.promise)
        .mockImplementationOnce(() => d2.promise);

      const p1 = cachedContractCall(CONTRACT_IDS.INSURANCE, 'm', { o: 'G' }, 30, fetchFn);

      // Registry-driven clear lands while the leader's fetch is still pending.
      clearCache();

      // A new caller for the same key must NOT join the cleared flight.
      const p2 = cachedContractCall(CONTRACT_IDS.INSURANCE, 'm', { o: 'G' }, 30, fetchFn);

      d1.resolve({ data: 'first' });
      d2.resolve({ data: 'second' });
      const [r1, r2] = await Promise.all([p1, p2]);

      expect(fetchFn).toHaveBeenCalledTimes(2);
      expect(r1).toEqual({ data: 'first' });
      expect(r2).toEqual({ data: 'second' });
    });
  });
});

describe('CacheError', () => {
  it('should create error with correct properties', () => {
    const error = new CacheError('Test error', CacheErrorCode.INVALID_INPUT, { detail: 'test' });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CacheError);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe(CacheErrorCode.INVALID_INPUT);
    expect(error.details).toEqual({ detail: 'test' });
    expect(error.name).toBe('CacheError');
  });

  it('should have proper stack trace', () => {
    const error = new CacheError('Test error', CacheErrorCode.INVALID_INPUT);
    expect(error.stack).toBeDefined();
  });
});
