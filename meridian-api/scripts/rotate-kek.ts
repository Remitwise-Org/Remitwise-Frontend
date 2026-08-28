/**
 * KEK rotation operator script (issue #631).
 *
 * Re-wraps every stored Data Encryption Key under a new Key Encryption Key
 * without downtime, then activates the new KEK for the running process.
 *
 * Usage:
 *   NEW_KEK_BASE64="<base64 32-byte key>" npm run rotation:kek
 *
 * After the script completes, deploy with ENCRYPTION_KEK_BASE64 set to the
 * new key (optionally ENCRYPTION_KEK_PREVIOUS_BASE64 = old key while other
 * instances catch up).
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { KeyRotationService } from '../src/crypto/providers/key-rotation.service';

async function main(): Promise<void> {
  const newKek = process.env.NEW_KEK_BASE64;
  if (!newKek) {
    console.error(
      'Missing NEW_KEK_BASE64. Usage: NEW_KEK_BASE64="<base64>" npm run rotation:kek',
    );
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const rotation = app.get(KeyRotationService);
    const result = await rotation.rotateKek(newKek);
    console.log(
      `Rotation complete: ${result.rewrapped} DEK(s) re-wrapped under KEK v${result.kekVersion}`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error('Rotation failed:', error);
  process.exit(1);
});
