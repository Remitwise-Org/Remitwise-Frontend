/**
 * Audit storage & migration compatibility (issue #1679).
 *
 * The RBAC guard, admin controllers, and audit views all read/write the
 * `audit_logs` table. This module provides the deterministic, reviewable
 * compatibility contract that guarantees privileged workflows remain safe and
 * diagnosable across schema upgrades, rollbacks, repeats, and storage failures.
 *
 * Invariants (also documented in docs/audit-storage-migration-compatibility.md):
 *
 *  1. Forward compatibility — new writes are always tagged with
 *     `CURRENT_SCHEMA_VERSION` and never exceed the column length bounds that
 *     older readers assume, so a reader one migration behind can still parse
 *     every row produced by a newer writer.
 *  2. Backward compatibility — rows produced by older writers (missing the
 *     `schemaVersion` column or newer nullable columns) are normalized to a
 *     stable shape before they reach any admin/audit view.
 *  3. Resumable & observable migrations — the migration records a checkpoint
 *     and raises progress notices so a partial run can be resumed deterministically.
 *  4. No partial/unauthorized state — repeated or replayed authorization
 *     decisions are de-duplicated and a failed audit write degrades to an
 *     observable marker instead of leaving a half-written record.
 */

// Schema version timeline for `audit_logs`:
//   1 — base table (issue #632 audit foundation)
//   2 — + correlationId column (migration 1787200000000)
//   3 — + AUTHORIZATION_GRANTED / AUTHORIZATION_DENIED enum values (1787300000000)
//   4 — + schemaVersion column + checkpoint table (this work, 1787400000000)
export const MIN_SUPPORTED_SCHEMA_VERSION = 1;
export const CURRENT_SCHEMA_VERSION = 4;
export const SUPPORTED_SCHEMA_VERSIONS: readonly number[] = [1, 2, 3, 4];
export const SCHEMA_VERSION_COLUMN = 'schemaVersion';

export class AuditCompatibilityError extends Error {
  public readonly field?: string;

  constructor(message: string, field?: string) {
    super(message);
    this.name = 'AuditCompatibilityError';
    this.field = field;
  }
}

/**
 * A reader can parse a row if it was produced by a supported writer version.
 * Legacy rows (no version column → `null`) are always readable.
 */
export function isSchemaCompatible(
  version: number | null | undefined,
): boolean {
  if (version == null) {
    return true;
  }
  return (
    version >= MIN_SUPPORTED_SCHEMA_VERSION && version <= CURRENT_SCHEMA_VERSION
  );
}

export interface NormalizedAuditRow {
  id?: number;
  entityName: string;
  entityId: string | null;
  action: string;
  performedById: number | null;
  performedByEmail: string | null;
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt?: Date;
  txHash: string | null;
  contract: string | null;
  contractAction: string | null;
  blockNumber: number | null;
  previousHash: string | null;
  chainHash: string | null;
  stateRoot: string | null;
  rawEvent: Record<string, unknown> | null;
  participantAddress: string | null;
  contributionXp: number;
  epochNumber: number | null;
  correlationId: string | null;
  schemaVersion: number | null;
}

const LEGACY_DEFAULTS: Omit<NormalizedAuditRow, 'entityName' | 'action'> = {
  id: undefined,
  entityId: null,
  performedById: null,
  performedByEmail: null,
  previousValues: null,
  newValues: null,
  ipAddress: null,
  createdAt: undefined,
  txHash: null,
  contract: null,
  contractAction: null,
  blockNumber: null,
  previousHash: null,
  chainHash: null,
  stateRoot: null,
  rawEvent: null,
  participantAddress: null,
  contributionXp: 0,
  epochNumber: null,
  correlationId: null,
  schemaVersion: null,
};

/**
 * Coerce a raw database/legacy row into the canonical, forward+backward
 * compatible shape. Any column introduced after the row was written is filled
 * with a safe default so older records stay readable by newer code. Unknown
 * enum `action` values (from a *future* writer) are surfaced as `UNKNOWN_ACTION`
 * instead of throwing, so a reader one migration behind never crashes.
 */
export const UNKNOWN_ACTION_FALLBACK = 'UNKNOWN_ACTION';

export function normalizeLegacyAuditRow(
  row: Record<string, unknown>,
): NormalizedAuditRow {
  const actionRaw = row['action'];
  const knownActions = new Set<string>([
    'CREATE',
    'READ',
    'UPDATE',
    'DELETE',
    'CONTRACT_EVENT',
    'AUTHORIZATION_GRANTED',
    'AUTHORIZATION_DENIED',
  ]);
  const action =
    typeof actionRaw === 'string' && knownActions.has(actionRaw)
      ? actionRaw
      : UNKNOWN_ACTION_FALLBACK;

  return {
    ...LEGACY_DEFAULTS,
    id: (row['id'] as number | undefined) ?? undefined,
    entityName: (row['entityName'] as string) ?? '',
    action,
    entityId: (row['entityId'] as string | null) ?? null,
    performedById: (row['performedById'] as number | null) ?? null,
    performedByEmail: (row['performedByEmail'] as string | null) ?? null,
    previousValues:
      (row['previousValues'] as Record<string, unknown> | null) ?? null,
    newValues: (row['newValues'] as Record<string, unknown> | null) ?? null,
    ipAddress: (row['ipAddress'] as string | null) ?? null,
    createdAt: (row['createdAt'] as Date | undefined) ?? undefined,
    txHash: (row['txHash'] as string | null) ?? null,
    contract: (row['contract'] as string | null) ?? null,
    contractAction: (row['contractAction'] as string | null) ?? null,
    blockNumber: (row['blockNumber'] as number | null) ?? null,
    previousHash: (row['previousHash'] as string | null) ?? null,
    chainHash: (row['chainHash'] as string | null) ?? null,
    stateRoot: (row['stateRoot'] as string | null) ?? null,
    rawEvent: (row['rawEvent'] as Record<string, unknown> | null) ?? null,
    participantAddress: (row['participantAddress'] as string | null) ?? null,
    contributionXp:
      typeof row['contributionXp'] === 'number'
        ? (row['contributionXp'] as number)
        : 0,
    epochNumber: (row['epochNumber'] as number | null) ?? null,
    correlationId: (row['correlationId'] as string | null) ?? null,
    schemaVersion: (row[SCHEMA_VERSION_COLUMN] as number | null) ?? null,
  };
}

/**
 * The string columns an audit writer may populate, with the maximum length
 * that existing (and older) readers assume. A writer that exceeds these bounds
 * would produce a row that older readers or the migration cannot safely
 * migrate/parse, so we reject the write up-front (forward compatibility).
 */
export interface AuditWriteShape {
  entityName: string;
  entityId?: string | null;
  performedByEmail?: string | null;
  ipAddress?: string | null;
  txHash?: string | null;
  contract?: string | null;
  contractAction?: string | null;
  chainHash?: string | null;
  stateRoot?: string | null;
  correlationId?: string | null;
  participantAddress?: string | null;
}

const LENGTH_BOUNDS: Record<string, number> = {
  entityName: 100,
  entityId: 255,
  performedByEmail: 255,
  ipAddress: 45,
  txHash: 128,
  contract: 100,
  contractAction: 100,
  chainHash: 128,
  stateRoot: 128,
  correlationId: 64,
  participantAddress: 255,
};

/**
 * Forward-compatibility gate: throws {@link AuditCompatibilityError} when a
 * write would violate the length bounds assumed by older readers. Callers must
 * treat a thrown error as "degrade the audit write, but never block the
 * authorization decision".
 */
export function assertWriteBackwardCompatible(record: AuditWriteShape): void {
  for (const [field, max] of Object.entries(LENGTH_BOUNDS)) {
    const value = (record as unknown as Record<string, unknown>)[field];
    if (typeof value === 'string' && value.length > max) {
      throw new AuditCompatibilityError(
        `Audit field "${field}" length ${value.length} exceeds backward-compatible bound ${max}`,
        field,
      );
    }
  }
}
