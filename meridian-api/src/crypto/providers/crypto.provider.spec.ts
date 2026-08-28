import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { CryptoProvider, constantTimeEqual } from './crypto.provider';
import { DataEncryptionKey } from '../entities/data-encryption-key.entity';
import {
  CryptoError,
  DecryptionFailedError,
  EncryptionKeyUnavailableError,
} from '../errors';

const KEK = randomBytes(32).toString('base64');
const PREVIOUS_KEK = randomBytes(32).toString('base64');

function createProvider(
  env: Record<string, string | undefined> = {},
  deks: Partial<DataEncryptionKey>[] = [],
): { provider: CryptoProvider; dekRepo: jest.Mocked<Partial<Repository<DataEncryptionKey>>> } {
  const dekRepo = {
    findOneBy: jest.fn(async ({ id }: { id: string }) => {
      const match = deks.find((d) => d.id === id);
      return match ? { ...match } : null;
    }),
    create: jest.fn((entity) => entity),
    save: jest.fn(async (entity) => {
      const saved = { id: `dek-${deks.length + 1}`, ...entity };
      deks.push(saved);
      return saved;
    }),
    update: jest.fn(async () => ({ affected: 1 })),
  } as unknown as jest.Mocked<Partial<Repository<DataEncryptionKey>>>;

  const configService = {
    get: jest.fn((key: string) => env[key]),
  } as unknown as ConfigService;

  const provider = new CryptoProvider(configService, dekRepo as never);
  return { provider, dekRepo };
}

describe('CryptoProvider (issue #631)', () => {
  describe('envelope round-trip', () => {
    it('encrypts and decrypts a value back to the original plaintext', async () => {
      const { provider } = createProvider({ ENCRYPTION_KEK_BASE64: KEK });

      const { ciphertext, dekId } = await provider.encrypt('super-secret');

      expect(ciphertext).not.toContain('super-secret');
      expect(dekId).toBeTruthy();
      expect(JSON.parse(ciphertext)).toMatchObject({ v: 1, keyId: dekId });

      await expect(provider.decrypt(ciphertext)).resolves.toBe('super-secret');
    });

    it('produces a unique ciphertext per call (random IV)', async () => {
      const { provider } = createProvider({ ENCRYPTION_KEK_BASE64: KEK });

      const a = await provider.encrypt('same');
      const b = await provider.encrypt('same');

      expect(a.ciphertext).not.toBe(b.ciphertext);
      expect(a.dekId).not.toBe(b.dekId);
    });

    it('reuses the provided DEK instead of minting a new one', async () => {
      const { provider } = createProvider({ ENCRYPTION_KEK_BASE64: KEK });
      const dek = await provider.createDek(42);

      const { dekId } = await provider.encrypt('value', { dekId: dek.id });
      const { dekId: again } = await provider.encrypt('value2', {
        dekId: dek.id,
      });

      expect(dekId).toBe(dek.id);
      expect(again).toBe(dek.id);
    });

    it('creates a replacement DEK when the referenced one is missing', async () => {
      const { provider } = createProvider({ ENCRYPTION_KEK_BASE64: KEK });

      const { ciphertext, dekId } = await provider.encrypt('value', {
        dekId: 'ghost-dek',
      });

      expect(dekId).not.toBe('ghost-dek');
      await expect(provider.decrypt(ciphertext)).resolves.toBe('value');
    });
  });

  describe('integrity', () => {
    it('rejects tampered ciphertext (GCM auth tag)', async () => {
      const { provider } = createProvider({ ENCRYPTION_KEK_BASE64: KEK });
      const { ciphertext } = await provider.encrypt('important');

      const envelope = JSON.parse(ciphertext);
      const bytes = Buffer.from(envelope.ct, 'base64');
      bytes[0] ^= 0xff;
      envelope.ct = bytes.toString('base64');

      await expect(provider.decrypt(JSON.stringify(envelope))).rejects.toBeInstanceOf(
        DecryptionFailedError,
      );
    });

    it('rejects an envelope with an unsupported version (fail closed)', async () => {
      const { provider } = createProvider({ ENCRYPTION_KEK_BASE64: KEK });
      const { ciphertext } = await provider.encrypt('x');
      const envelope = JSON.parse(ciphertext);
      envelope.v = 999;

      await expect(provider.decrypt(JSON.stringify(envelope))).rejects.toBeInstanceOf(
        DecryptionFailedError,
      );
    });
  });

  describe('transparent fallback when KEK is unavailable', () => {
    it('returns the plaintext unchanged from encrypt() without touching the DEK store', async () => {
      const { provider, dekRepo } = createProvider({});
      expect(provider.isEnabled()).toBe(false);

      const { ciphertext, dekId } = await provider.encrypt('plain-value');

      expect(ciphertext).toBe('plain-value');
      expect(dekId).toBeNull();
      expect(dekRepo.save).not.toHaveBeenCalled();
    });

    it('passes legacy plaintext through decrypt() unchanged', async () => {
      const { provider } = createProvider({});
      await expect(provider.decrypt('legacy-plaintext')).resolves.toBe(
        'legacy-plaintext',
      );
    });

    it('throws EncryptionKeyUnavailableError when asked to decrypt a real envelope without a KEK', async () => {
      const { provider } = createProvider({});
      const envelope = JSON.stringify({
        v: 1,
        keyId: 'dek-1',
        iv: Buffer.alloc(12).toString('base64'),
        tag: Buffer.alloc(16).toString('base64'),
        ct: Buffer.from('data').toString('base64'),
      });

      await expect(provider.decrypt(envelope)).rejects.toBeInstanceOf(
        EncryptionKeyUnavailableError,
      );
    });

    it('throws EncryptionKeyUnavailableError when creating a DEK without a KEK', async () => {
      const { provider } = createProvider({});
      await expect(provider.createDek()).rejects.toBeInstanceOf(
        EncryptionKeyUnavailableError,
      );
    });
  });

  describe('KEK versions & rotation fallback', () => {
    it('validates KEK material is exactly 32 bytes', () => {
      expect(() =>
        CryptoProvider.parseKekMaterial(Buffer.alloc(16).toString('base64')),
      ).toThrow(CryptoError);
      expect(() =>
        CryptoProvider.parseKekMaterial('not-base64!!'),
      ).toThrow(CryptoError);
      expect(() => CryptoProvider.parseKekMaterial(KEK)).not.toThrow();
    });

    it('unwraps DEKs written under the previous KEK', async () => {
      const { provider } = createProvider({
        ENCRYPTION_KEK_BASE64: KEK,
        ENCRYPTION_KEK_PREVIOUS_BASE64: PREVIOUS_KEK,
      });

      // Simulate a DEK wrapped under the *previous* KEK with kekVersion 0.
      const legacy = provider['wrapWithKek'](
        randomBytes(32),
        CryptoProvider.parseKekMaterial(PREVIOUS_KEK),
      );
      const dek: Partial<DataEncryptionKey> = {
        id: 'legacy-dek',
        wrappedKey: legacy,
        kekVersion: 0,
      };

      await expect(provider.unwrapDek(dek as DataEncryptionKey)).resolves.toHaveLength(32);
    });

    it('unwraps DEKs wrapped under the active KEK', async () => {
      const { provider } = createProvider({ ENCRYPTION_KEK_BASE64: KEK });
      const dek = await provider.createDek();

      await expect(provider.unwrapDek(dek)).resolves.toHaveLength(32);
    });

    it('fails loudly when no KEK can unwrap a DEK', async () => {
      const { provider } = createProvider({ ENCRYPTION_KEK_BASE64: KEK });
      const dek = await provider.createDek();
      dek.wrappedKey = provider['wrapWithKek'](
        randomBytes(32),
        CryptoProvider.parseKekMaterial(PREVIOUS_KEK),
      );

      await expect(provider.unwrapDek(dek)).rejects.toBeInstanceOf(
        DecryptionFailedError,
      );
    });

    it('activateKek retains the old key as the decrypt-only fallback', async () => {
      const { provider } = createProvider({ ENCRYPTION_KEK_BASE64: KEK });
      const dek = await provider.createDek();

      const nextKek = randomBytes(32).toString('base64');
      provider.activateKek(nextKek);
      expect(provider.getActiveKekVersion()).toBe(2);

      // The DEK was wrapped under v1 (active at the time); it must still
      // unwrap because the old active KEK is now the previous KEK.
      await expect(provider.unwrapDek(dek)).resolves.toHaveLength(32);
    });
  });

  describe('constantTimeEqual', () => {
    it('compares strings without leaking length', () => {
      expect(constantTimeEqual('abc', 'abc')).toBe(true);
      expect(constantTimeEqual('abc', 'abd')).toBe(false);
      expect(constantTimeEqual('abc', 'abcd')).toBe(false);
      expect(constantTimeEqual('', '')).toBe(true);
    });
  });
});
