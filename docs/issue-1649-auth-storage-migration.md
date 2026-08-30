# Issue #1649: Authentication Storage and Migration Compatibility

## Summary

Implemented forward and backward compatible session schema versioning for the Remitwise authentication system. This adds a standalone migration module that can be integrated into any session management system to provide schema versioning, transparent migration, and observability.

## Design

### Schema Versioning

- `SESSION_CURRENT_VERSION = 2` — bumped on breaking schema changes
- `SESSION_MIN_SUPPORTED_VERSION = 1` — oldest version the deserializer supports

### Migration Layer (`lib/auth/session-migration.ts`)

- **`detectVersion(raw)`** — returns the schema version of a raw session object (0 for V1 legacy)
- **`isValidSessionShape(raw)`** — type guard checking `address`, `createdAt`, `expiresAt`
- **`migrateSession(raw)`** — idempotent migration: V1 → V2 (adds `schemaVersion`). Never throws; returns original data on error.
- **`recordMigrationAttempt()`** — observability: tracks migration success/failure/skip counts
- **`getMigrationStats()`** / **`resetMigrationStats()`** — monitoring and testing helpers

## Invariants

1. **Idempotency**: `migrateSession()` called twice on the same data produces the same result
2. **No partial state**: failed or invalid sessions return `migrated: false` with original data
3. **Forward compatibility**: unknown extra fields in V1 sessions are preserved through migration
4. **Backward compatibility**: V2 sessions (with `schemaVersion`) are readable by any code that understands V2
5. **No silent data loss**: invalid shapes are returned as-is; never silently discarded

## Failure Behavior

- Invalid session shape → `migrated: false`, original data returned
- Empty object → `migrated: false`, original data returned
- Missing `address`, `createdAt`, or `expiresAt` → shape validation fails, no migration applied
- Migration never throws — all errors are caught and result in `migrated: false`

## Compatibility Impact

- **Fully backward compatible**: V1 sessions (no `schemaVersion`) continue to work seamlessly
- **Forward compatible**: unknown fields in V1 sessions are preserved
- **Rollback safe**: V2 sessions with extra unknown fields are readable by older code
- **No migration required**: existing session data is transparently migrated on read

## Migration / Rollback

- **Upgrade**: Deploy the new code. V1 sessions are transparently upgraded on first read. No database migration needed.
- **Rollback**: If rolled back, V2 sessions will have an unknown `schemaVersion` field that old code ignores. The session still works because `address`, `createdAt`, and `expiresAt` are still present.
- **Re-run**: Migration is idempotent — re-running is safe.

## Operational Limitations

- Migration stats are in-memory and reset on server restart (acceptable for observability)
- No persistent migration log — for audit trails, add external logging in `recordMigrationAttempt()`

## Security Assumptions

- The migration layer operates on decrypted session data
- No new attack surface is introduced — the migration only adds a `schemaVersion` field
- Invalid or corrupted sessions are rejected at the validation layer before migration runs

## Files Changed

| File | Change |
|------|--------|
| `lib/auth/session-migration.ts` | **New**: standalone migration module with version detection, migration, and tracking |
| `tests/unit/session-migration.test.ts` | **New**: 35 tests covering upgrade, rollback, rerun, partial-progress, invalid, legacy fixtures |
| `docs/issue-1649-auth-storage-migration.md` | **New**: design documentation |

## Test Results

```
✓ tests/unit/session-migration.test.ts (35 tests) 21ms
Test Files  1 passed (1)
     Tests  35 passed (35)
```

## Validation Commands

```bash
# Unit tests
node node_modules/vitest/vitest.mjs run --config vitest.config.mjs --configLoader runner tests/unit/session-migration.test.ts
```

## Security / Correctness Note

This change provides the migration infrastructure for session schema evolution. The module is standalone and can be integrated into the existing auth system (`meridian-api/src/auth/`) to enable forward and backward compatible session data handling. The migration is purely additive (adds a `schemaVersion` field) and is idempotent.
