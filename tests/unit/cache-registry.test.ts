/**
 * Unit tests for the central cache registry fan-out.
 *
 * Covers:
 * - registerCache: adds caches, validates inputs, handles double-registration
 * - clearRegisteredCaches: fan-out to all registered clearers, error isolation
 * - invalidateCache: selective single-cache invalidation, unknown names
 * - listRegisteredCaches: snapshot of registered names
 * - resetRegistry: test-only cleanup
 *
 * Run: npx vitest run tests/unit/cache-registry.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  registerCache,
  clearRegisteredCaches,
  invalidateCache,
  listRegisteredCaches,
  resetRegistry,
} from "@/lib/cache/registry";

describe("Cache Registry", () => {
  beforeEach(() => {
    resetRegistry();
  });

  afterEach(() => {
    resetRegistry();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // registerCache
  // ─────────────────────────────────────────────────────────────────────────

  describe("registerCache", () => {
    it("should register a cache clearer under a unique name", () => {
      const clearer = vi.fn();
      registerCache("test_cache", clearer);

      expect(listRegisteredCaches()).toContain("test_cache");
    });

    it("should reject empty name", () => {
      const clearer = vi.fn();
      expect(() => registerCache("", clearer)).toThrow("non-empty string");
    });

    it("should reject non-string name", () => {
      const clearer = vi.fn();
      expect(() => registerCache(123 as unknown as string, clearer)).toThrow(
        "non-empty string"
      );
    });

    it("should reject non-function clearer", () => {
      expect(() => registerCache("bad", "not-a-function" as unknown as () => void)).toThrow(
        "must be a function"
      );
    });

    it("should overwrite on double-registration (no memory leak)", () => {
      const clearer1 = vi.fn();
      const clearer2 = vi.fn();

      registerCache("dup", clearer1);
      registerCache("dup", clearer2);

      expect(listRegisteredCaches()).toEqual(["dup"]);
      expect(listRegisteredCaches()).toHaveLength(1);
    });

    it("should call the most recent clearer after double-registration", async () => {
      const clearer1 = vi.fn();
      const clearer2 = vi.fn();

      registerCache("dup", clearer1);
      registerCache("dup", clearer2);

      await clearRegisteredCaches();

      expect(clearer1).not.toHaveBeenCalled();
      expect(clearer2).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // clearRegisteredCaches (fan-out)
  // ─────────────────────────────────────────────────────────────────────────

  describe("clearRegisteredCaches", () => {
    it("should return empty array when no caches are registered", async () => {
      const cleared = await clearRegisteredCaches();
      expect(cleared).toEqual([]);
    });

    it("should invoke every registered cache clearer (fan-out)", async () => {
      const contractClear = vi.fn();
      const ratesClear = vi.fn();
      const billClear = vi.fn();

      registerCache("contract_cache", contractClear);
      registerCache("anchor_rates", ratesClear);
      registerCache("bill_cache", billClear);

      const cleared = await clearRegisteredCaches();

      expect(contractClear).toHaveBeenCalledTimes(1);
      expect(ratesClear).toHaveBeenCalledTimes(1);
      expect(billClear).toHaveBeenCalledTimes(1);
      expect(cleared).toEqual(["contract_cache", "anchor_rates", "bill_cache"]);
    });

    it("should await async clearers", async () => {
      let resolved = false;
      const asyncClear = vi.fn(async () => {
        await new Promise((r) => setTimeout(r, 10));
        resolved = true;
      });

      registerCache("async_cache", asyncClear);
      await clearRegisteredCaches();

      expect(resolved).toBe(true);
      expect(asyncClear).toHaveBeenCalledTimes(1);
    });

    it("should continue fan-out when one clearer throws (error isolation)", async () => {
      const goodClear = vi.fn();
      const badClear = vi.fn(() => {
        throw new Error("Cache clear failed");
      });
      const anotherGood = vi.fn();

      registerCache("good", goodClear);
      registerCache("bad", badClear);
      registerCache("another_good", anotherGood);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const cleared = await clearRegisteredCaches();
      consoleSpy.mockRestore();

      expect(goodClear).toHaveBeenCalledTimes(1);
      expect(badClear).toHaveBeenCalledTimes(1);
      expect(anotherGood).toHaveBeenCalledTimes(1);
      // Only successful clears are returned
      expect(cleared).toEqual(["good", "another_good"]);
    });

    it("should log errors for failed clearers", async () => {
      const badClear = vi.fn(() => {
        throw new Error("Boom");
      });
      registerCache("explodes", badClear);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      await clearRegisteredCaches();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("explodes"),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it("should be idempotent (clearing twice yields same result)", async () => {
      const clear = vi.fn();
      registerCache("idempotent", clear);

      const first = await clearRegisteredCaches();
      const second = await clearRegisteredCaches();

      expect(clear).toHaveBeenCalledTimes(2);
      expect(first).toEqual(second);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // invalidateCache (selective)
  // ─────────────────────────────────────────────────────────────────────────

  describe("invalidateCache", () => {
    it("should clear only the named cache", async () => {
      const targetClear = vi.fn();
      const otherClear = vi.fn();

      registerCache("target", targetClear);
      registerCache("other", otherClear);

      const ok = await invalidateCache("target");

      expect(ok).toBe(true);
      expect(targetClear).toHaveBeenCalledTimes(1);
      expect(otherClear).not.toHaveBeenCalled();
    });

    it("should return false for unknown cache name", async () => {
      const ok = await invalidateCache("nonexistent");
      expect(ok).toBe(false);
    });

    it("should reject empty name", async () => {
      await expect(invalidateCache("")).rejects.toThrow("non-empty string");
    });

    it("should reject non-string name", async () => {
      await expect(invalidateCache(123 as unknown as string)).rejects.toThrow(
        "non-empty string"
      );
    });

    it("should propagate clearer errors (unlike clear-all)", async () => {
      const badClear = vi.fn(() => {
        throw new Error("Selective clear failed");
      });
      registerCache("bad_selective", badClear);

      await expect(invalidateCache("bad_selective")).rejects.toThrow(
        "Selective clear failed"
      );
    });

    it("should await async selective clearer", async () => {
      let resolved = false;
      const asyncClear = vi.fn(async () => {
        await new Promise((r) => setTimeout(r, 5));
        resolved = true;
      });

      registerCache("selective_async", asyncClear);
      const ok = await invalidateCache("selective_async");

      expect(ok).toBe(true);
      expect(resolved).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // listRegisteredCaches
  // ─────────────────────────────────────────────────────────────────────────

  describe("listRegisteredCaches", () => {
    it("should return empty array when no caches registered", () => {
      expect(listRegisteredCaches()).toEqual([]);
    });

    it("should return names in insertion order", () => {
      registerCache("first", vi.fn());
      registerCache("second", vi.fn());
      registerCache("third", vi.fn());

      expect(listRegisteredCaches()).toEqual(["first", "second", "third"]);
    });

    it("should reflect the latest state after double-registration", () => {
      registerCache("a", vi.fn());
      registerCache("b", vi.fn());
      registerCache("a", vi.fn()); // overwrite

      expect(listRegisteredCaches()).toEqual(["a", "b"]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // resetRegistry (test-only)
  // ─────────────────────────────────────────────────────────────────────────

  describe("resetRegistry", () => {
    it("should remove all registered caches", () => {
      registerCache("one", vi.fn());
      registerCache("two", vi.fn());

      resetRegistry();

      expect(listRegisteredCaches()).toEqual([]);
    });

    it("should make clearRegisteredCaches return empty after reset", async () => {
      registerCache("gone", vi.fn());
      resetRegistry();

      const cleared = await clearRegisteredCaches();
      expect(cleared).toEqual([]);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Integration: admin route fan-out simulation
  // ─────────────────────────────────────────────────────────────────────────

  describe("admin clear route fan-out (simulated)", () => {
    it("should trigger all registered caches when admin route calls clearRegisteredCaches", async () => {
      // Simulate the caches that real subsystems would register
      const contractCacheClear = vi.fn();
      const ratesCacheClear = vi.fn();
      const billCacheClear = vi.fn();

      // These mirror the real registrations in the codebase:
      // lib/cache/contract-cache.ts → registerCache('contract_cache', clearCache)
      // lib/anchor/rates-cache.ts   → registerCache('anchor_rates', clearAnchorRatesCache)
      registerCache("contract_cache", contractCacheClear);
      registerCache("anchor_rates", ratesCacheClear);
      registerCache("bill_cache", billCacheClear);

      // Simulate what app/api/admin/cache/clear/route.ts does
      const cleared = await clearRegisteredCaches();

      expect(cleared).toHaveLength(3);
      expect(cleared).toContain("contract_cache");
      expect(cleared).toContain("anchor_rates");
      expect(cleared).toContain("bill_cache");

      expect(contractCacheClear).toHaveBeenCalledTimes(1);
      expect(ratesCacheClear).toHaveBeenCalledTimes(1);
      expect(billCacheClear).toHaveBeenCalledTimes(1);
    });

    it("should allow selective invalidation via admin route", async () => {
      const contractClear = vi.fn();
      const ratesClear = vi.fn();

      registerCache("contract_cache", contractClear);
      registerCache("anchor_rates", ratesClear);

      // Simulate selective invalidation (e.g., after rates update)
      const ok = await invalidateCache("anchor_rates");

      expect(ok).toBe(true);
      expect(ratesClear).toHaveBeenCalledTimes(1);
      expect(contractClear).not.toHaveBeenCalled();
    });

    it("should handle a real-world failure scenario gracefully", async () => {
      // Simulate: contract cache is healthy, rates cache is broken
      const contractClear = vi.fn();
      const ratesClear = vi.fn(() => {
        throw new Error("Redis connection lost");
      });

      registerCache("contract_cache", contractClear);
      registerCache("anchor_rates", ratesClear);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const cleared = await clearRegisteredCaches();
      consoleSpy.mockRestore();

      // contract_cache still clears despite rates_cache failing
      expect(contractClear).toHaveBeenCalledTimes(1);
      expect(cleared).toEqual(["contract_cache"]);
    });
  });
});