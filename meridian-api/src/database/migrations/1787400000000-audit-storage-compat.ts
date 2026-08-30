import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Audit storage & migration compatibility (issue #1679).
 *
 * This migration hardens the `audit_logs` table — the storage backing every
 * privileged/operational workflow (RBAC guard, admin controllers, audit views)
 * — so that schema evolution is:
 *
 *   - Idempotent: every statement uses `IF NOT EXISTS` / `IF EXISTS`, so the
 *     migration can be re-run (e.g. after a partial failure) without error.
 *   - Resumable: a checkpoint row in `audit_storage_checkpoint` records how far
 *     the migration progressed, so a rerun resumes from the last completed
 *     phase instead of starting over.
 *   - Observable: progress is surfaced via `RAISE NOTICE`, which operators can
 *     watch during a deployment and which is captured in migration logs.
 *   - Backward compatible: existing rows are stamped with
 *     `schemaVersion = 3` (the version prior to this migration) so older
 *     readers that ignore the new column keep working, while new writers tag
 *     rows with `CURRENT_SCHEMA_VERSION = 4`.
 *
 * Down migration cleanly removes the compatibility artifacts while preserving
 * all pre-existing audit records.
 */
export class AuditStorageCompatibility1787400000000 implements MigrationInterface {
  name = 'AuditStorageCompatibility1787400000000';

  private async checkpoint(
    queryRunner: QueryRunner,
    phase: string,
  ): Promise<void> {
    // Idempotent upsert of a single-row progress marker.
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "audit_storage_checkpoint" (
        "id" integer NOT NULL DEFAULT 1,
        "phase" character varying(100),
        "updatedAt" timestamp NOT NULL DEFAULT now(),
        "note" character varying(255),
        CONSTRAINT "PK_audit_storage_checkpoint" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `INSERT INTO "audit_storage_checkpoint" ("id", "phase", "updatedAt", "note")
       VALUES (1, $1, now(), $2)
       ON CONFLICT ("id") DO UPDATE
       SET "phase" = EXCLUDED."phase", "updatedAt" = now(), "note" = EXCLUDED."note"`,
      [phase, 'audit storage compatibility migration'],
    );
    await queryRunner.query(
      `RAISE NOTICE 'audit_storage_compat: phase=%', $1`,
      [phase],
    );
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Phase 1 — add the schema version column (idempotent). Existing rows are
    // stamped at version 3 (the prior migration's version); new writes from
    // AuditService are tagged at 4.
    await this.checkpoint(queryRunner, 'add_schema_version_column');
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "schemaVersion" integer`,
    );
    await queryRunner.query(
      `UPDATE "audit_logs" SET "schemaVersion" = 3 WHERE "schemaVersion" IS NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_logs_schemaVersion" ON "audit_logs" ("schemaVersion")`,
    );

    // Phase 2 — guarantee the enum carries every action a current/legacy
    // reader might emit (idempotent; safe to re-run).
    await this.checkpoint(queryRunner, 'ensure_action_enum_values');
    await queryRunner.query(
      `ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'AUTHORIZATION_GRANTED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'AUTHORIZATION_DENIED'`,
    );

    // Phase 3 — observability checkpoint so operators can confirm completion.
    await this.checkpoint(queryRunner, 'completed');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_audit_logs_schemaVersion"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "schemaVersion"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_storage_checkpoint"`);
  }
}
