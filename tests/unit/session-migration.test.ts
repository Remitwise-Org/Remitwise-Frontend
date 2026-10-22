import { describe, it, expect, beforeEach } from "vitest";
import fc from "fast-check";
import {
  SESSION_CURRENT_VERSION,
  SESSION_MIN_SUPPORTED_VERSION,
  detectVersion,
  isValidSessionShape,
  migrateSession,
  recordMigrationAttempt,
  getMigrationStats,
  resetMigrationStats,
  type MigrationResult,
} from "../../lib/auth/session-migration";

// ── Fixtures ───────────────────────────────────────────────────────────

/** V1 session (legacy — no schemaVersion). */
const V1_SESSION = {
  address: `G${"A".repeat(55)}`,
  createdAt: 1700000000000,
  expiresAt: 1700604800000,
};

/** V2 session (current — with schemaVersion). */
const V2_SESSION = {
  address: `G${"A".repeat(55)}`,
  createdAt: 1700000000000,
  expiresAt: 1700604800000,
  schemaVersion: 2,
};

/** Invalid session (missing required fields). */
const INVALID_SESSION = {
  foo: "bar",
};

/** Session with extra unknown fields (forward compat). */
const V1_SESSION_WITH_EXTRAS = {
  ...V1_SESSION,
  extraField: "should be preserved",
  nested: { key: "value" },
};

// ── Tests ──────────────────────────────────────────────────────────────

describe("session-migration", () => {
  beforeEach(() => {
    resetMigrationStats();
  });

  // ── detectVersion ───────────────────────────────────────────────────

  describe("detectVersion", () => {
    it("returns 0 for V1 session (no schemaVersion)", () => {
      expect(detectVersion(V1_SESSION)).toBe(0);
    });

    it("returns 2 for V2 session", () => {
      expect(detectVersion(V2_SESSION)).toBe(2);
    });

    it("returns 0 for invalid schemaVersion (string)", () => {
      expect(detectVersion({ schemaVersion: "2" })).toBe(0);
    });

    it("returns 0 for invalid schemaVersion (float)", () => {
      expect(detectVersion({ schemaVersion: 2.5 })).toBe(0);
    });

    it("returns 0 for empty object", () => {
      expect(detectVersion({})).toBe(0);
    });
  });

  // ── isValidSessionShape ─────────────────────────────────────────────

  describe("isValidSessionShape", () => {
    it("returns true for valid V1 session", () => {
      expect(isValidSessionShape(V1_SESSION)).toBe(true);
    });

    it("returns true for valid V2 session", () => {
      expect(isValidSessionShape(V2_SESSION)).toBe(true);
    });

    it("returns false for missing address", () => {
      expect(isValidSessionShape({ createdAt: 1, expiresAt: 2 })).toBe(false);
    });

    it("returns false for missing createdAt", () => {
      expect(isValidSessionShape({ address: "G...", expiresAt: 2 })).toBe(
        false,
      );
    });

    it("returns false for missing expiresAt", () => {
      expect(isValidSessionShape({ address: "G...", createdAt: 1 })).toBe(
        false,
      );
    });

    it("returns false for wrong types", () => {
      expect(
        isValidSessionShape({ address: 123, createdAt: "a", expiresAt: "b" }),
      ).toBe(false);
    });

    it("returns false for empty object", () => {
      expect(isValidSessionShape({})).toBe(false);
    });

    it("returns false for null-like values", () => {
      expect(isValidSessionShape(INVALID_SESSION)).toBe(false);
    });
  });

  // ── migrateSession ──────────────────────────────────────────────────

  describe("migrateSession", () => {
    // ── Upgrade (V1 → V2) ────────────────────────────────────────────

    describe("upgrade", () => {
      it("upgrades explicit V1 and V0 versions", () => {
        for (const version of [0, 1]) {
          const result = migrateSession({ ...V1_SESSION, schemaVersion: version });
          expect(result.ok).toBe(true);
          if (result.ok) {
            expect(result.toVersion).toBe(2);
            expect(result.migrated).toBe(true);
          }
        }
      });

      it("rejects negative and future versions", () => {
        expect(migrateSession({ ...V1_SESSION, schemaVersion: -1 })).toMatchObject({
          ok: false,
          reason: "INVALID_SHAPE",
        });
        expect(migrateSession({ ...V1_SESSION, schemaVersion: 3 })).toMatchObject({
          ok: false,
          reason: "UNSUPPORTED_FUTURE_VERSION",
        });
      });

      it("adds schemaVersion to V1 session", () => {
        const result = migrateSession(V1_SESSION);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.migrated).toBe(true);
        expect(result.fromVersion).toBe(0);
        expect(result.toVersion).toBe(SESSION_CURRENT_VERSION);
        expect(result.data.schemaVersion).toBe(SESSION_CURRENT_VERSION);
      });

      it("preserves all V1 fields during upgrade", () => {
        const result = migrateSession(V1_SESSION);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.address).toBe(V1_SESSION.address);
        expect(result.data.createdAt).toBe(V1_SESSION.createdAt);
        expect(result.data.expiresAt).toBe(V1_SESSION.expiresAt);
      });

      it("preserves unknown extra fields during upgrade (forward compat)", () => {
        const result = migrateSession(V1_SESSION_WITH_EXTRAS);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.migrated).toBe(true);
        expect((result.data as Record<string, unknown>).extraField).toBe(
          "should be preserved",
        );
        expect((result.data as Record<string, unknown>).nested).toEqual({
          key: "value",
        });
      });
    });

    // ── No migration needed (already current) ─────────────────────────

    describe("already current", () => {
      it("does not migrate V2 session", () => {
        const result = migrateSession(V2_SESSION);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.migrated).toBe(false);
        expect(result.fromVersion).toBe(2);
        expect(result.toVersion).toBe(2);
        expect(result.data.schemaVersion).toBe(2);
      });
    });

    // ── Rollback (reading V2 from older code) ─────────────────────────

    describe("rollback compatibility", () => {
      it("V2 session is readable and valid", () => {
        const result = migrateSession(V2_SESSION);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.migrated).toBe(false);
        expect(result.data.address).toBe(V2_SESSION.address);
        expect(result.data.expiresAt).toBe(V2_SESSION.expiresAt);
      });

      it("unknown fields in V2 session are preserved", () => {
        const v2WithExtra = { ...V2_SESSION, futureField: 42 };
        const result = migrateSession(v2WithExtra);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect((result.data as Record<string, unknown>).futureField).toBe(42);
      });
    });

    // ── Idempotency (rerun) ──────────────────────────────────────────

    describe("rerun (idempotency)", () => {
      it("is idempotent for generated valid V1/V2 sessions and never throws", () => {
        const sessionArbitrary = fc.record({
          address: fc.constant(V1_SESSION.address),
          createdAt: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER - 1 }),
          expiresAt: fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
          schemaVersion: fc.option(fc.constantFrom(1, 2), { nil: undefined }),
        }).filter(({ createdAt, expiresAt }) => expiresAt > createdAt);
        fc.assert(fc.property(sessionArbitrary, (session) => {
          expect(() => migrateSession(session)).not.toThrow();
          const first = migrateSession(session);
          expect(first.ok).toBe(true);
          if (!first.ok) return;
          const second = migrateSession(first.data as unknown as Record<string, unknown>);
          expect(second.ok).toBe(true);
          if (second.ok) {
            expect(second.data).toEqual(first.data);
            expect(second.migrated).toBe(false);
          }
        }));
      });

      it("migrating V1 twice produces same result", () => {
        const first = migrateSession(V1_SESSION);
        expect(first.ok).toBe(true);
        if (!first.ok) return;
        const second = migrateSession(first.data as Record<string, unknown>);
        expect(second.ok).toBe(true);
        if (!second.ok) return;
        expect(second.migrated).toBe(false);
        expect(second.fromVersion).toBe(SESSION_CURRENT_VERSION);
        expect(second.toVersion).toBe(SESSION_CURRENT_VERSION);
        expect(second.data.schemaVersion).toBe(SESSION_CURRENT_VERSION);
      });

      it("migrating V2 twice is a no-op", () => {
        const first = migrateSession(V2_SESSION);
        expect(first.ok).toBe(true);
        if (!first.ok) return;
        const second = migrateSession(first.data as Record<string, unknown>);
        expect(second.ok).toBe(true);
        if (!second.ok) return;
        expect(second.migrated).toBe(false);
        expect(second.data).toEqual(first.data);
      });
    });

    // ── Invalid / malformed data ──────────────────────────────────────

    describe("invalid data", () => {
      it.each([
        [{ ...V1_SESSION, createdAt: Number.NaN }, "non-finite createdAt"],
        [{ ...V1_SESSION, expiresAt: Number.POSITIVE_INFINITY }, "non-finite expiresAt"],
        [{ ...V1_SESSION, expiresAt: V1_SESSION.createdAt }, "equal timestamps"],
        [{ ...V1_SESSION, address: "alice" }, "invalid address"],
      ])("rejects %s", (session) => {
        expect(migrateSession(session)).toMatchObject({
          ok: false,
          reason: "INVALID_SHAPE",
        });
      });

      it("rejects invalid shape without exposing it as V2 data", () => {
        const result = migrateSession(
          INVALID_SESSION as unknown as Record<string, unknown>,
        );
        expect(result).toMatchObject({ ok: false, reason: "INVALID_SHAPE" });
      });

      it("returns original data for empty object", () => {
        const result = migrateSession({});
        expect(result.ok).toBe(false);
      });

      it("handles missing address gracefully", () => {
        const result = migrateSession({ createdAt: 1, expiresAt: 2 });
        expect(result.ok).toBe(false);
      });
    });

    // ── Partial progress ──────────────────────────────────────────────

    describe("partial progress", () => {
      it("V1 session with some fields missing still migrates", () => {
        const partial = { address: "G..." };
        const result = migrateSession(
          partial as unknown as Record<string, unknown>,
        );
        // Shape validation fails, so no migration
        expect(result.migrated).toBe(false);
      });

      it("V1 session with all required fields migrates successfully", () => {
        const result = migrateSession(V1_SESSION);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.migrated).toBe(true);
        expect(result.data.schemaVersion).toBe(SESSION_CURRENT_VERSION);
      });
    });

    // ── Legacy data fixtures ──────────────────────────────────────────

    describe("legacy data fixtures", () => {
      it("handles realistic V1 session fixture", () => {
        const legacyFixture = {
          address: "GCKFJITYYV7YZE7LXYL7YXJSPOGKHMNQDMVF4HPAHNQ3ELQY4LZM5L6Z",
          createdAt: 1700000000000,
          expiresAt: 1700604800000,
        };
        const result = migrateSession(legacyFixture);
        expect(result.migrated).toBe(true);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        expect(result.data.address).toBe(legacyFixture.address);
        expect(result.data.schemaVersion).toBe(SESSION_CURRENT_VERSION);
      });

      it("rejects V1 session with zero timestamps", () => {
        const edgeCase = { address: "G...", createdAt: 0, expiresAt: 0 };
        const result = migrateSession(edgeCase);
        expect(result).toMatchObject({ ok: false, reason: "INVALID_SHAPE" });
      });

      it("rejects V1 session with very large equal timestamps", () => {
        const edgeCase = {
          address: "G...",
          createdAt: Number.MAX_SAFE_INTEGER,
          expiresAt: Number.MAX_SAFE_INTEGER,
        };
        const result = migrateSession(edgeCase);
        expect(result).toMatchObject({ ok: false, reason: "INVALID_SHAPE" });
      });
    });
  });

  // ── Migration stats (observability) ─────────────────────────────────

  describe("migration stats", () => {
    it("records successful upgrades, current sessions, and failures", () => {
      migrateSession(V1_SESSION);
      migrateSession(V2_SESSION);
      migrateSession(INVALID_SESSION);
      expect(getMigrationStats()).toMatchObject({
        totalAttempts: 3,
        successfulMigrations: 1,
        skippedAlreadyCurrent: 1,
        failedMigrations: 1,
      });
    });

    it("tracks successful migrations", () => {
      recordMigrationAttempt(0, 2, true);
      const stats = getMigrationStats();
      expect(stats.totalAttempts).toBe(1);
      expect(stats.successfulMigrations).toBe(1);
      expect(stats.failedMigrations).toBe(0);
    });

    it("tracks skipped (already current)", () => {
      recordMigrationAttempt(2, 2, true);
      const stats = getMigrationStats();
      expect(stats.totalAttempts).toBe(1);
      expect(stats.skippedAlreadyCurrent).toBe(1);
      expect(stats.successfulMigrations).toBe(0);
    });

    it("tracks failed migrations", () => {
      recordMigrationAttempt(0, 2, false);
      const stats = getMigrationStats();
      expect(stats.totalAttempts).toBe(1);
      expect(stats.failedMigrations).toBe(1);
    });

    it("reset clears all stats", () => {
      recordMigrationAttempt(0, 2, true);
      recordMigrationAttempt(2, 2, true);
      resetMigrationStats();
      const stats = getMigrationStats();
      expect(stats.totalAttempts).toBe(0);
      expect(stats.successfulMigrations).toBe(0);
    });
  });

  // ── Version constants ───────────────────────────────────────────────

  describe("version constants", () => {
    it("current version is at least min supported version", () => {
      expect(SESSION_CURRENT_VERSION).toBeGreaterThanOrEqual(
        SESSION_MIN_SUPPORTED_VERSION,
      );
    });

    it("min supported version is 1", () => {
      expect(SESSION_MIN_SUPPORTED_VERSION).toBe(1);
    });
  });
});
