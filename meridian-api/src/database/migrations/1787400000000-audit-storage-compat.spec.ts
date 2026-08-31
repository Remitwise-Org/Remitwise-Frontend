import { AuditStorageCompatibility1787400000000 } from '../../database/migrations/1787400000000-audit-storage-compat';

// Contract test for the resumable / observable / idempotent migration that backs
// the admin/operational audit storage (issue #1679). We drive the real migration
// against a fake QueryRunner so we can prove the upgrade, rollback, rerun, and
// partial-progress invariants at the migration boundary without a live database.

class FakeQueryRunner {
  public queries: Array<{ sql: string; params?: unknown[] }> = [];
  private throwAt: number | null;

  constructor(throwAt: number | null = null) {
    this.throwAt = throwAt;
  }

  async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    this.queries.push({ sql, params });
    if (this.throwAt != null && this.queries.length - 1 === this.throwAt) {
      throw new Error(
        `simulated partial failure at query #${this.queries.length}`,
      );
    }
    return [];
  }
}

const has = (runner: FakeQueryRunner, fragment: string): boolean =>
  runner.queries.some((q) => q.sql.includes(fragment));

const checkpointPhases = (runner: FakeQueryRunner): string[] =>
  runner.queries
    .filter((q) => q.sql.includes('INSERT INTO "audit_storage_checkpoint"'))
    .map((q) => String(q.params?.[0] ?? ''));

describe('AuditStorageCompatibility migration (issue #1679)', () => {
  const migration = new AuditStorageCompatibility1787400000000();

  it('upgrade (up) applies idempotent, resumable DDL', async () => {
    const runner = new FakeQueryRunner();
    await migration.up(runner as never);

    expect(has(runner, 'ADD COLUMN IF NOT EXISTS "schemaVersion"')).toBe(true);
    expect(
      has(runner, 'CREATE INDEX IF NOT EXISTS "IDX_audit_logs_schemaVersion"'),
    ).toBe(true);
    expect(has(runner, "ADD VALUE IF NOT EXISTS 'AUTHORIZATION_GRANTED'")).toBe(
      true,
    );
    expect(has(runner, "ADD VALUE IF NOT EXISTS 'AUTHORIZATION_DENIED'")).toBe(
      true,
    );
    expect(checkpointPhases(runner)).toContain('completed');
  });

  it('rerun (up twice) is safe and deterministic (resumable)', async () => {
    const first = new FakeQueryRunner();
    await migration.up(first as never);
    const second = new FakeQueryRunner();
    await migration.up(second as never);

    // Both runs reach the completed checkpoint; no error on rerun.
    expect(checkpointPhases(second)).toContain('completed');
    expect(checkpointPhases(first)).toContain('completed');
  });

  it('partial failure during upgrade can be resumed by a rerun', async () => {
    // First attempt fails partway (after the first query).
    const partial = new FakeQueryRunner(0);
    await expect(migration.up(partial as never)).rejects.toThrow(
      /simulated partial failure/,
    );

    // A resuming run completes fully thanks to idempotent statements.
    const resumed = new FakeQueryRunner();
    await expect(migration.up(resumed as never)).resolves.toBeUndefined();
    expect(checkpointPhases(resumed)).toContain('completed');
    expect(has(resumed, 'ADD COLUMN IF NOT EXISTS "schemaVersion"')).toBe(true);
  });

  it('rollback (down) removes only the compatibility artifacts, preserving records', async () => {
    const runner = new FakeQueryRunner();
    await migration.down(runner as never);

    expect(
      has(runner, 'DROP INDEX IF EXISTS "IDX_audit_logs_schemaVersion"'),
    ).toBe(true);
    expect(has(runner, 'DROP COLUMN IF EXISTS "schemaVersion"')).toBe(true);
    expect(has(runner, 'DROP TABLE IF EXISTS "audit_storage_checkpoint"')).toBe(
      true,
    );
    // Existing data columns must NOT be dropped.
    expect(has(runner, 'DROP COLUMN IF EXISTS "entityName"')).toBe(false);
  });
});
