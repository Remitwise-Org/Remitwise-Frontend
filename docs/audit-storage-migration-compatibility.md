# Audit storage & migration compatibility (Issue #1679)

Area: authorization / resilience — privileged workflows, audit views, errors, and
degraded-mode behavior for the `meridian-api` administrative surface.

This change guarantees that the storage backing every privileged/operational
workflow (the RBAC guard, admin controllers, and the audit review views) is
**deterministically compatible across schema upgrades, rollbacks, repeats, and
storage failures**.

## Design & invariants

The contract lives in `src/audit/audit-storage.compatibility.ts` and is enforced
by the guard (`src/auth/guard/rbac/rbac.guard.ts`), the audit writer
(`src/audit/audit.service.ts`), and a new migration
(`src/database/migrations/1787400000000-audit-storage-compat.ts`).

| # | Invariant | Enforcement |
|---|-----------|-------------|
| 1 | **Forward compatibility** — new writers never emit rows unreadable by an older reader | `assertWriteBackwardCompatible()` rejects writes that exceed the column length bounds older readers assume; every new row is stamped `schemaVersion = CURRENT_SCHEMA_VERSION` (4). |
| 2 | **Backward compatibility** — rows written by older versions stay readable | `normalizeLegacyAuditRow()` fills safe defaults for columns introduced after a row was written (`correlationId`, `chainHash`, `contributionXp`, `epochNumber`, `schemaVersion`, …). Unknown future enum `action` values degrade to `UNKNOWN_ACTION` instead of crashing the reader. |
| 3 | **Resumable & observable migrations** | The migration uses only `IF NOT EXISTS` / `IF EXISTS` DDL and records a single-row `audit_storage_checkpoint` (phase + timestamp), surfacing progress via `RAISE NOTICE`. A partial run resumes cleanly on rerun. |
| 4 | **No partial/unauthorized state** | Repeated or replayed authorization decisions share an identity key and are de-duplicated within a 5s window, so a retry cannot leave duplicate audit rows. A failed audit write degrades to a structured `audit.degraded_mode` marker while the authorization decision remains authoritative. |

### Schema version timeline (`audit_logs`)
- `1` — base table (issue #632 audit foundation)
- `2` — `+ correlationId` (migration `1787200000000`)
- `3` — `+ AUTHORIZATION_GRANTED` / `AUTHORIZATION_DENIED` enum values (`1787300000000`)
- `4` — `+ schemaVersion` column + `audit_storage_checkpoint` table (this work)

Legacy rows (no `schemaVersion` column) are normalized to `null` and treated as
readable by `isSchemaCompatible(null) === true`.

## Failure behavior & compatibility impact

- **Audit store unavailable / slow:** the authorization decision is unaffected.
  A `ForbiddenException`/`UnauthorizedException` is still thrown/allowed, the
  audit write is attempted once, and on failure a `audit.degraded_mode` +
  `audit.write_failed` structured log pair is emitted for operator diagnosis.
- **Oversized audit field:** the write is skipped with an `audit.write_compat_skipped`
  warning rather than producing a row that older readers cannot parse. The
  decision still proceeds.
- **Replay / duplicate request:** collapsed to a single audit record (idempotency).
- **Rejected/stale request:** no audit row is emitted before authentication
  succeeds, so a rejected token leaves no audit or partial state.

## Migration / rollback considerations

- Deploy the migration (`npm run migration:run`) **before** deploying this code
  so the `schemaVersion` column exists when writers start stamping it. Because
  all DDL is idempotent, running the migration twice (or after a partial
  failure) is safe.
- Rollback: `npm run migration:revert` removes the `schemaVersion` column and
  the `audit_storage_checkpoint` table. It does **not** delete any pre-existing
  audit records. Older code that ignores the column continues to work.
- The new `enum` values added in `1787300000000` are intentionally not removed
  on down (PostgreSQL cannot drop enum values without a column rebuild); they
  are harmless if left in place.

## Operational limitations

- The audit write remains **best-effort**: a sustained audit-store outage means
  privileged actions still succeed but are not recorded until the store
  recovers. The `audit.degraded_mode` marker is the operator signal for this gap.
- In-process de-duplication is per-instance and not shared across horizontally
  scaled replicas; it bounds duplicate noise within a single instance's 5s window,
  not globally. Global de-duplication would require a shared store (out of scope).

## Security assumptions

- Audit records are non-authoritative for access control; the RBAC decision is
  computed from the JWT claims and never depends on audit storage being healthy.
- `correlationId` is treated as operator-provided untrusted input for length
  bounding only; it is never used to relax authorization.
- Normalization never elevates privilege: unknown `action` values are surfaced
  for review, never mapped to a granted/denied authorization outcome.
