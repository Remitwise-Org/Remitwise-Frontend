import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { CryptoProvider } from './crypto.provider';
import { KeyRotationService } from './key-rotation.service';
import { DataEncryptionKey } from '../entities/data-encryption-key.entity';
import { CryptoError } from '../errors';

const KEK = randomBytes(32).toString('base64');
const NEW_KEK = randomBytes(32).toString('base64');

function buildEnvironment(
  deks: Partial<DataEncryptionKey>[],
): {
  rotation: KeyRotationService;
  cryptoProvider: CryptoProvider;
  dekRepo: jest.Mocked<Partial<Repository<DataEncryptionKey>>>;
} {
  const dekRepo = {
    find: jest.fn(async () => deks.map((d) => ({ ...d }))),
    save: jest.fn(async (entities) => {
      const batch = Array.isArray(entities) ? entities : [entities];
      for (const entity of batch) {
        const index = deks.findIndex((d) => d.id === entity.id);
        if (index >= 0) deks[index] = entity;
      }
      return batch;
    }),
    findOneBy: jest.fn(async ({ id }: { id: string }) => {
      const match = deks.find((d) => d.id === id);
      return match ? { ...match } : null;
    }),
    create: jest.fn((e) => e),
    update: jest.fn(),
  } as unknown as jest.Mocked<Partial<Repository<DataEncryptionKey>>>;

  const configService = {
    get: jest.fn((key: string) => (key === 'ENCRYPTION_KEK_BASE64' ? KEK : undefined)),
  } as unknown as ConfigService;

  const cryptoProvider = new CryptoProvider(configService, dekRepo as never);
  const rotation = new KeyRotationService(cryptoProvider, dekRepo as never);

  return { rotation, cryptoProvider, dekRepo };
}

describe('KeyRotationService (issue #631)', () => {
  it('rejects an invalid incoming KEK', async () => {
    const { rotation } = buildEnvironment([]);
    await expect(
      rotation.rotateKek(Buffer.alloc(16).toString('base64')),
    ).rejects.toBeInstanceOf(CryptoError);
  });

  it('re-wraps every DEK under the new KEK and bumps kekVersion', async () => {
    const deks: Partial<DataEncryptionKey>[] = [];
    const { rotation, cryptoProvider, dekRepo } = buildEnvironment(deks);

    // Seed 3 DEKs under the current KEK.
    for (let i = 0; i < 3; i++) {
      const dek = await cryptoProvider.createDek(i + 1);
      deks.push(dek);
    }
    expect(deks.every((d) => d.kekVersion === 1)).toBe(true);
    const wrappedBefore = deks.map((d) => d.wrappedKey);

    const result = await rotation.rotateKek(NEW_KEK);

    expect(result.rewrapped).toBe(3);
    expect(result.kekVersion).toBe(2);
    expect(dekRepo.save).toHaveBeenCalled();
    // All DEKs now reference the new KEK generation and have new wrapped keys.
    expect(deks.every((d) => d.kekVersion === 2)).toBe(true);
    expect(deks.every((d) => d.wrappedKey !== undefined)).toBe(true);
    deks.forEach((d, i) => expect(d.wrappedKey).not.toBe(wrappedBefore[i]));
  });

  it('keeps previously encrypted data decryptable after rotation', async () => {
    const deks: Partial<DataEncryptionKey>[] = [];
    const { rotation, cryptoProvider } = buildEnvironment(deks);

    const userDek = await cryptoProvider.createDek(7);
    deks.push(userDek);

    const { ciphertext } = await cryptoProvider.encrypt('sensitive-value', {
      dekId: userDek.id,
    });

    // Rotate to a brand-new KEK.
    await rotation.rotateKek(NEW_KEK);

    // Data encrypted before the rotation must still decrypt (DEK re-wrapped
    // under the new KEK, which is now active).
    await expect(cryptoProvider.decrypt(ciphertext)).resolves.toBe(
      'sensitive-value',
    );
    // New encryptions use the re-wrapped DEK seamlessly.
    const fresh = await cryptoProvider.encrypt('after-rotation', {
      dekId: userDek.id,
    });
    await expect(cryptoProvider.decrypt(fresh.ciphertext)).resolves.toBe(
      'after-rotation',
    );
  });

  it('handles an empty DEK registry without error', async () => {
    const { rotation } = buildEnvironment([]);
    const result = await rotation.rotateKek(NEW_KEK);
    expect(result).toEqual({ rewrapped: 0, kekVersion: 2 });
  });
});
