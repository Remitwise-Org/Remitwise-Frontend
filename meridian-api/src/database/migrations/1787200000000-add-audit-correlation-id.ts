import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditCorrelationId1787200000000 implements MigrationInterface {
  name = 'AddAuditCorrelationId1787200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "correlationId" character varying(64)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_audit_logs_correlationId" ON "audit_logs" ("correlationId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_audit_logs_correlationId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "correlationId"`,
    );
  }
}
