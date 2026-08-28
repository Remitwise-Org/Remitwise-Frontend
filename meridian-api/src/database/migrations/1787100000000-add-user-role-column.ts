import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * RBAC (issue #632): adds the `role` column to the users table.
 *
 * Existing rows default to 'user' (Role.USER) so nothing regresses; new
 * sign-ups are promoted to 'verified_user' on email verification. Kept as a
 * plain varchar to avoid creating a Postgres enum type in migrations.
 */
export class AddUserRoleColumn1787100000000 implements MigrationInterface {
  name = 'AddUserRoleColumn1787100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" character varying(32) NOT NULL DEFAULT 'user'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "role"`,
    );
  }
}
