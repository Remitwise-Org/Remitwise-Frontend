import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRbacAuditActions1787300000000 implements MigrationInterface {
  name = 'AddRbacAuditActions1787300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'AUTHORIZATION_GRANTED'`,
    );
    await queryRunner.query(
      `ALTER TYPE "audit_logs_action_enum" ADD VALUE IF NOT EXISTS 'AUTHORIZATION_DENIED'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing values from an enum type.
    // A full column rebuild would be required, which is out of scope for
    // a down migration. The new values are harmless if left in place.
  }
}
