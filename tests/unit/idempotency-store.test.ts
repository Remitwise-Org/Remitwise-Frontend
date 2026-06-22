import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// vi.hoisted ensures these are available when the vi.mock factories run
const { mockRegisterGracefulShutdown, mockRegisterShutdownHook, mockRegisterCache } =
  vi.hoisted(() => ({
    mockRegisterGracefulShutdown: vi.fn(),
    mockRegisterShutdownHook: vi.fn(),
    mockRegisterCache: vi.fn(),
  }));

vi.mock("@/lib/background/runtime", () => ({
  registerGracefulShutdown: mockRegisterGracefulShutdown,
  registerShutdownHook: mockRegisterShutdownHook,
}));

vi.mock("@/lib/cache/registry", () => ({
  registerCache: mockRegisterCache,
}));

describe("lib/idempotency/store", () => {
  let mod: typeof import("../../lib/idempotency/store");

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.resetModules();
    mockRegisterGracefulShutdown.mockReset();
    mockRegisterShutdownHook.mockReset();
    mockRegisterCache.mockReset();

    mod = await import("../../lib/idempotency/store");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Timer startup ───────────────────────────────────────────────────────────

  describe("startup", () => {
    it("registers a shutdown hook named 'idempotency_cleanup_timer'", () => {
      expect(mockRegisterShutdownHook).toHaveBeenCalledWith(
        "idempotency_cleanup_timer",
        expect.any(Function)
      );
    });

    it("calls registerGracefulShutdown on module init", () => {
      expect(mockRegisterGracefulShutdown).toHaveBeenCalledTimes(1);
    });

    it("registers the store with the cache registry under 'idempotency_store'", () => {
      expect(mockRegisterCache).toHaveBeenCalledWith(
        "idempotency_store",
        expect.any(Function)
      );
    });

    it("double-import does not register duplicate shutdown hooks", async () => {
      // Re-importing the same (already-cached) module should not re-run startCleanupTimer
      await import("../../lib/idempotency/store");
      expect(mockRegisterShutdownHook).toHaveBeenCalledTimes(1);
    });
  });

  // ── Shutdown hook ───────────────────────────────────────────────────────────

  describe("shutdown hook", () => {
    it("clears the interval when the shutdown hook is invoked", () => {
      const clearIntervalSpy = vi.spyOn(global, "clearInterval");
      const [[, shutdownFn]] = mockRegisterShutdownHook.mock.calls;
      shutdownFn();
      expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
    });

    it("is idempotent — invoking twice does not throw", () => {
      const [[, shutdownFn]] = mockRegisterShutdownHook.mock.calls;
      expect(() => {
        shutdownFn();
        shutdownFn();
      }).not.toThrow();
    });
  });

  // ── Cache registry integration ──────────────────────────────────────────────

  describe("cache registry clearer", () => {
    it("clearer function calls clearIdempotencyStore", () => {
      mod.storeIdempotencyRecord("k1", "h1", { status: 200, body: {} });
      expect(mod.getStoreSize()).toBe(1);

      const [[, clearFn]] = mockRegisterCache.mock.calls;
      clearFn();
      expect(mod.getStoreSize()).toBe(0);
    });
  });

  // ── Cleanup timer logic ─────────────────────────────────────────────────────

  describe("cleanup timer", () => {
    it("removes expired records after 1 hour", () => {
      mod.storeIdempotencyRecord("k1", "h1", { status: 200, body: {} }, 100);
      // Advance past the record's TTL (100 ms) AND the 1-hour sweep interval
      vi.advanceTimersByTime(60 * 60 * 1000 + 200);
      expect(mod.getStoreSize()).toBe(0);
    });

    it("keeps records that have not yet expired", () => {
      mod.storeIdempotencyRecord("k1", "h1", { status: 200, body: {} }, 2 * 60 * 60 * 1000);
      vi.advanceTimersByTime(60 * 60 * 1000 + 1);
      expect(mod.getStoreSize()).toBe(1);
    });
  });

  // ── storeIdempotencyRecord ──────────────────────────────────────────────────

  describe("storeIdempotencyRecord()", () => {
    it("stores a new record", () => {
      mod.storeIdempotencyRecord("key-1", "hash-abc", { status: 201, body: { id: 1 } });
      expect(mod.getStoreSize()).toBe(1);
    });

    it("overwrites an existing record with the same key", () => {
      mod.storeIdempotencyRecord("key-1", "hash-abc", { status: 200, body: "first" });
      mod.storeIdempotencyRecord("key-1", "hash-xyz", { status: 200, body: "second" });
      expect(mod.getStoreSize()).toBe(1);
      const result = mod.checkIdempotencyKey("key-1", "hash-xyz");
      expect(result.exists).toBe(true);
      expect(result.conflict).toBe(false);
    });
  });

  // ── checkIdempotencyKey ─────────────────────────────────────────────────────

  describe("checkIdempotencyKey()", () => {
    it("returns {exists:false} for unknown key", () => {
      const r = mod.checkIdempotencyKey("missing", "h");
      expect(r.exists).toBe(false);
      expect(r.conflict).toBe(false);
    });

    it("returns {exists:true, conflict:false} for matching hash", () => {
      mod.storeIdempotencyRecord("k", "h", { status: 200, body: null });
      const r = mod.checkIdempotencyKey("k", "h");
      expect(r.exists).toBe(true);
      expect(r.conflict).toBe(false);
    });

    it("returns {exists:true, conflict:true} for hash mismatch", () => {
      mod.storeIdempotencyRecord("k", "original", { status: 200, body: null });
      const r = mod.checkIdempotencyKey("k", "different");
      expect(r.exists).toBe(true);
      expect(r.conflict).toBe(true);
    });

    it("returns {exists:false} and removes an expired record", () => {
      mod.storeIdempotencyRecord("k", "h", { status: 200, body: null }, 1);
      vi.advanceTimersByTime(2);
      const r = mod.checkIdempotencyKey("k", "h");
      expect(r.exists).toBe(false);
      expect(mod.getStoreSize()).toBe(0);
    });

    it("attaches the stored record on a hit", () => {
      const response = { status: 200, body: { ok: true } };
      mod.storeIdempotencyRecord("k", "h", response);
      const r = mod.checkIdempotencyKey("k", "h");
      expect(r.record?.response).toEqual(response);
    });
  });

  // ── deleteIdempotencyRecord ─────────────────────────────────────────────────

  describe("deleteIdempotencyRecord()", () => {
    it("removes an existing record and returns true", () => {
      mod.storeIdempotencyRecord("k", "h", { status: 200, body: null });
      expect(mod.deleteIdempotencyRecord("k")).toBe(true);
      expect(mod.getStoreSize()).toBe(0);
    });

    it("returns false for a non-existent key", () => {
      expect(mod.deleteIdempotencyRecord("ghost")).toBe(false);
    });
  });

  // ── clearIdempotencyStore ───────────────────────────────────────────────────

  describe("clearIdempotencyStore()", () => {
    it("empties the store", () => {
      mod.storeIdempotencyRecord("a", "h", { status: 200, body: null });
      mod.storeIdempotencyRecord("b", "h", { status: 200, body: null });
      mod.clearIdempotencyStore();
      expect(mod.getStoreSize()).toBe(0);
    });
  });

  // ── getStoreSize ────────────────────────────────────────────────────────────

  describe("getStoreSize()", () => {
    it("returns 0 on a fresh import", () => {
      expect(mod.getStoreSize()).toBe(0);
    });

    it("increments as records are added", () => {
      mod.storeIdempotencyRecord("a", "h", { status: 200, body: null });
      mod.storeIdempotencyRecord("b", "h", { status: 200, body: null });
      expect(mod.getStoreSize()).toBe(2);
    });
  });
});
