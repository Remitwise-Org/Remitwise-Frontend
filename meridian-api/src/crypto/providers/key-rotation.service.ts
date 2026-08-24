import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataEncryptionKey } from '../entities/data-encryption-key.entity';
import { CryptoProvider } from './crypto.provider';

/**
 * KEK rotation (issue #631).
 *
 * Rotating the master key only requires re-wrapping every stored DEK under
 * the new KEK — the user data itself is untouched, so rotation is
 * operationally cheap and can run online in batches with no downtime.
 *
 * Flow:
 *  1. Validate the incoming base64 KEK.
 *  2. Unwrap every stored DEK with the currently active (or previous) KEK.
 *  3. Re-wrap it under the incoming KEK and bump `kekVersion`.
 *  4. Activate the new KEK in-memory; the old one is retained as a
 *     decrypt-only fallback so any DEK row missed mid-crash stays readable.
 *
 * After `rotateKek` returns, deployments should set ENCRYPTION_KEK_BASE64 to
 * the new key (and optionally ENCRYPTION_KEK_PREVIOUS_BASE64 to the old one
 * on other instances that haven't rotated yet).
 */
@Injectable()
export class KeyRotationService {
  private readonly logger = new Logger(KeyRotationService.name);

  constructor(
    private readonly cryptoProvider: CryptoProvider,
    @InjectRepository(DataEncryptionKey)
    private readonly dekRepository: Repository<DataEncryptionKey>,
  ) {}

  async rotateKek(
    newKekBase64: string,
    batchSize = 500,
  ): Promise<{ rewrapped: number; kekVersion: number }> {
    // Throws if the key material is not a valid 32-byte base64 key.
    const newKek = CryptoProvider.parseKekMaterial(newKekBase64);

    const deks = await this.dekRepository.find({
      order: { createdAt: 'ASC' },
    });

    let rewrapped = 0;
    for (let i = 0; i < deks.length; i += batchSize) {
      const batch = deks.slice(i, i + batchSize);
      for (const dek of batch) {
        const rawDek = await this.cryptoProvider.unwrapDek(dek);
        dek.wrappedKey = this.cryptoProvider.wrapWithKek(rawDek, newKek);
        dek.kekVersion = this.cryptoProvider.getActiveKekVersion() + 1;
      }
      await this.dekRepository.save(batch);
      rewrapped += batch.length;
    }

    this.cryptoProvider.activateKek(newKekBase64);

    this.logger.log(
      `KEK rotation complete: ${rewrapped} data encryption key(s) re-wrapped under v${this.cryptoProvider.getActiveKekVersion()}`,
    );

    return {
      rewrapped,
      kekVersion: this.cryptoProvider.getActiveKekVersion(),
    };
  }
}
