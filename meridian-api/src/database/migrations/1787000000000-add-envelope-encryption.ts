import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Envelope encryption at rest (issue #631).
 *
 * Adds the DEK registry table (`data_encryption_keys`) and the
 * `dataEncryptionKeyId` / `encryptedData` columns to users, refresh_token,
 * and webhooks. Also relaxes `webhooks.secret` to nullable so new webhooks
 * can store the ciphertext envelope in `encryptedData` instead of plaintext.
 *
 * All statements are idempotent so the migration is safe to run on databases
 * that were previously created via `synchronize`.
 */
export class AddEnvelopeEncryption1787000000000 implements MigrationInterface {
  name = 'AddEnvelopeEncryption1787000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "data_encryption_keys" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" integer NULL,
        "wrappedKey" text NOT NULL,
        "kekVersion" integer NOT NULL DEFAULT '1',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "pk_data_encryption_keys" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_data_encryption_keys_user" ON "data_encryption_keys" ("userId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "dataEncryptionKeyId" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "encryptedData" text NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "refresh_token" ADD COLUMN IF NOT EXISTS "dataEncryptionKeyId" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" ADD COLUMN IF NOT EXISTS "encryptedData" text NULL`,
    );

    await queryRunner.query(
      `ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "dataEncryptionKeyId" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhooks" ADD COLUMN IF NOT EXISTS "encryptedData" text NULL`,
    );
    // New webhooks no longer persist the plaintext secret.
    await queryRunner.query(
      `ALTER TABLE "webhooks" ALTER COLUMN "secret" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "webhooks" ALTER COLUMN "secret" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhooks" DROP COLUMN IF EXISTS "encryptedData"`,
    );
    await queryRunner.query(
      `ALTER TABLE "webhooks" DROP COLUMN IF EXISTS "dataEncryptionKeyId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP COLUMN IF EXISTS "encryptedData"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_token" DROP COLUMN IF EXISTS "dataEncryptionKeyId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "encryptedData"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "dataEncryptionKeyId"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "data_encryption_keys"`);
  }
}
