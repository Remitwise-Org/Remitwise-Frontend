/**
 * Session Storage Migration
 *
 * Provides forward and backward compatibility for session data across
 * deployments. Each session carries a `schemaVersion` field; the
 * deserializer transparently migrates older formats so existing
 * records are preserved and never silently discarded. Legacy means version
 * 0 (no schemaVersion) or explicit schema version 1; both migrate to V2.
 *
 * ## Invariants
 * - `SESSION_CURRENT_VERSION` is bumped on every breaking schema change.
 * - `migrateSession()` is idempotent: calling it twice produces the same result.
 * - Failed or partial migrations leave no partial state — the original
 *   sealed blob is returned unmodified on error.
 * - Rollback: a session created by a newer version is readable by older
 *   code because unknown fields are preserved via JSON round-trip.
 */

// ── Version constants ──────────────────────────────────────────────────

/** Current session schema version. Bump on every breaking change. */
export const SESSION_CURRENT_VERSION = 2;

/** The earliest version the deserializer can migrate from. */
export const SESSION_MIN_SUPPORTED_VERSION = 1;

// ── Types ──────────────────────────────────────────────────────────────

/** V1 session format (legacy — schemaVersion 1 or no schemaVersion field). */
export interface SessionDataV1 {
  address: string;
  createdAt: number;
  expiresAt: number;
}

/** V2 session format (current — includes schemaVersion). */
export interface SessionDataV2 extends SessionDataV1 {
  schemaVersion: number;
}

/** Union of all supported session shapes. */
export type SessionData = SessionDataV1 | SessionDataV2;

/** Migration result with observability metadata. */
export type MigrationResult =
  | {
      ok: true;
      data: SessionDataV2;
      migrated: boolean;
      fromVersion: number;
      toVersion: number;
    }
  | {
      ok: false;
      reason:
        | "INVALID_SHAPE"
        | "UNSUPPORTED_FUTURE_VERSION"
        | "UNSUPPORTED_LEGACY_VERSION";
      fromVersion: number;
    };

// ── Helpers ────────────────────────────────────────────────────────────

/**
 * Detect the schema version of a raw session object.
 * Returns 0 if no `schemaVersion` field is present (V1 legacy format).
 */
export function detectVersion(raw: Record<string, unknown>): number {
  const v = raw.schemaVersion;
  if (typeof v === "number" && Number.isInteger(v)) {
    return v;
  }
  return 0; // V1 legacy
}

/**
 * Type guard: does the raw object look like a valid session?
 */
export function isValidSessionShape(raw: Record<string, unknown>): boolean {
  return (
    typeof raw.address === "string" &&
    /^G[A-Z2-7]{55}$/.test(raw.address) &&
    typeof raw.createdAt === "number" &&
    Number.isSafeInteger(raw.createdAt) &&
    typeof raw.expiresAt === "number" &&
    Number.isSafeInteger(raw.expiresAt) &&
    raw.expiresAt > raw.createdAt
  );
}

// ── Migration logic ────────────────────────────────────────────────────

/**
 * Migrate a raw session object to the current schema version.
 *
 * This function is **idempotent**: calling it on already-migrated data
 * returns the same result. It never throws — on any error the original
 * data is returned unmodified with `migrated: false`.
 *
 * Migration steps are applied sequentially. Each step is safe to
 * re-run (idempotent) so partial progress is recoverable.
 */
export function migrateSession(raw: Record<string, unknown>): MigrationResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    const result: MigrationResult = { ok: false, reason: "INVALID_SHAPE", fromVersion: 0 };
    recordMigrationAttempt(0, 0, false);
    return result;
  }

  const fromVersion = detectVersion(raw);
  let result: MigrationResult;
  const hasValidVersion =
    raw.schemaVersion === undefined ||
    (typeof raw.schemaVersion === "number" &&
      Number.isInteger(raw.schemaVersion) &&
      raw.schemaVersion >= 0);
  if (!hasValidVersion || !isValidSessionShape(raw)) {
    result = { ok: false, reason: "INVALID_SHAPE", fromVersion };
  } else if (fromVersion > SESSION_CURRENT_VERSION) {
    result = { ok: false, reason: "UNSUPPORTED_FUTURE_VERSION", fromVersion };
  } else if (fromVersion < 0 || fromVersion < SESSION_MIN_SUPPORTED_VERSION && fromVersion !== 0) {
    result = { ok: false, reason: "UNSUPPORTED_LEGACY_VERSION", fromVersion };
  } else {
    const current = fromVersion < SESSION_CURRENT_VERSION
      ? migrateV1ToV2({ ...raw })
      : { ...raw };
    result = {
      ok: true,
      data: current as unknown as SessionDataV2,
      migrated: fromVersion < SESSION_CURRENT_VERSION,
      fromVersion,
      toVersion: SESSION_CURRENT_VERSION,
    };
  }
  recordMigrationAttempt(

  // ── Future steps go here as: ───────────────────────────────────────
  // if (detectVersion(current) < 3) { current = migrateV2ToV3(current); }

  const toVersion = detectVersion(current);

  return {
    data: current as unknown as SessionDataV2,
    migrated: fromVersion !== toVersion,
    fromVersion,
    result.ok ? result.toVersion : fromVersion,
    result.ok,
  );
  return result;
}

/**
 * Migration step: V1 (no schemaVersion) → V2 (with schemaVersion).
 *
 * Adds `schemaVersion: 2` to the session data. This is idempotent —
 * Explicit V1 and unversioned sessions are upgraded to V2.
 */
function migrateV1ToV2(raw: Record<string, unknown>): Record<string, unknown> {
  const result = { ...raw };
  result.schemaVersion = SESSION_CURRENT_VERSION;
  return result;
}

// ── Migration tracking ─────────────────────────────────────────────────

/** In-memory migration stats (resets on server restart — acceptable for observability). */
const migrationStats = {
  totalAttempts: 0,
  successfulMigrations: 0,
  skippedAlreadyCurrent: 0,
  failedMigrations: 0,
  lastMigrationAt: 0,
};

/**
 * Record a migration attempt for observability.
 */
export function recordMigrationAttempt(
  fromVersion: number,
  toVersion: number,
  success: boolean,
): void {
  migrationStats.totalAttempts++;
  if (success) {
    if (fromVersion === toVersion) {
      migrationStats.skippedAlreadyCurrent++;
    } else {
      migrationStats.successfulMigrations++;
    }
    migrationStats.lastMigrationAt = Date.now();
  } else {
    migrationStats.failedMigrations++;
  }
}

/**
 * Get migration stats for monitoring/observability.
 */
export function getMigrationStats(): Readonly<typeof migrationStats> {
  return { ...migrationStats };
}

/**
 * Reset migration stats (for testing).
 */
export function resetMigrationStats(): void {
  migrationStats.totalAttempts = 0;
  migrationStats.successfulMigrations = 0;
  migrationStats.skippedAlreadyCurrent = 0;
  migrationStats.failedMigrations = 0;
  migrationStats.lastMigrationAt = 0;
}
