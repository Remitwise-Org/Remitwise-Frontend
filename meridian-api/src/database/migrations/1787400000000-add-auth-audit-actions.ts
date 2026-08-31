import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends the `audit_logs_action_enum` PostgreSQL enum type with the auth
 * session / email-verification lifecycle actions consumed by
 * `meridian-api/src/auth` (issue #1689).
 *
 * `IF NOT EXISTS` keeps the migration idempotent so re-running it against a
 * database that already carries the values (e.g. one provisioned from a
 * synchronize=true dev instance) cannot fail.
 *
 * Rollback: PostgreSQL cannot remove values from an enum type. The new values
 * are additive and harmless to older application versions (they are only ever
 * written, never matched on by legacy code paths), so `down` intentionally
 * leaves them in place — consistent with 1787300000000-add-rbac-audit-actions.
 */
export class AddAuthAuditActions1787400000000 implements MigrationInterface {
  name = 'AddAuthAuditActions1787400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'SIGN_IN'`,
    );
    await queryRunner.query(
      `ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'REFRESH'`,
    );
    await queryRunner.query(
      `ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'LOGOUT'`,
    );
    await queryRunner.query(
      `ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'LOGOUT_ALL'`,
    );
    await queryRunner.query(
      `ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'VERIFY_EMAIL'`,
    );
    await queryRunner.query(
      `ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'RESEND_VERIFICATION'`,
    );
    await queryRunner.query(
      `ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'ISSUE_VERIFICATION_TOKEN'`,
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing values from an enum type; the
    // additive values are inert for older code paths (see class comment).
  }
}
