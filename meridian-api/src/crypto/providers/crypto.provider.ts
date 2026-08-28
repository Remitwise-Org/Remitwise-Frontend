import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'crypto';
import { DataEncryptionKey } from '../entities/data-encryption-key.entity';
import {
  CryptoError,
  DecryptionFailedError,
  EncryptionKeyUnavailableError,
} from '../errors';

/**
 * Envelope-encryption provider (issue #631).
 *
 * Sensitive values are encrypted with AES-256-GCM under a per-user (or
 * per-row) Data Encryption Key (DEK). The DEK itself is never stored in the
 * clear: it is wrapped under a master Key Encryption Key (KEK) and persisted
 * in `data_encryption_keys`. The encrypted payload is a self-describing JSON
 * envelope (`{ v, keyId, iv, tag, ct }`) that callers store in the
 * `encryptedData` column; `dataEncryptionKeyId` mirrors the envelope's keyId
 * so rows can be located by key without parsing JSON.
 *
 * KEK resolution (in priority order):
 *  1. `ENCRYPTION_KEK_BASE64` — base64-encoded 32-byte key (active KEK).
 *  2. `ENCRYPTION_KEK_URL` — endpoint returning `{ "key": "<base64>" }`.
 *  3. `ENCRYPTION_KEK_PREVIOUS_BASE64` — the previous KEK generation, used
 *     only to unwrap DEKs written before rotation (decrypt-only fallback).
 *
 * If no KEK is configured the provider runs in *transparent fallback* mode:
 * `encrypt()` returns the plaintext unchanged and `decrypt()` passes input
 * through. This keeps development/test environments functional, but the env
 * schema rejects production boots without a KEK so plaintext can never be
 * silently persisted there.
 */
@Injectable()
export class CryptoProvider implements OnModuleInit {
  private readonly logger = new Logger(CryptoProvider.name);

  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_BYTES = 12;
  private static readonly TAG_BYTES = 16;
  private static readonly KEK_BYTES = 32;
  private static readonly DEK_BYTES = 32;
  private static readonly ENVELOPE_VERSION = 1;

  private activeKek: Buffer | null = null;
  private previousKek: Buffer | null = null;
  private activeKekVersion = 1;
  private warnedFallback = false;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(DataEncryptionKey)
    private readonly dekRepository: Repository<DataEncryptionKey>,
  ) {
    this.activeKek = this.loadKekFromConfig('ENCRYPTION_KEK_BASE64');
    this.previousKek = this.loadKekFromConfig('ENCRYPTION_KEK_PREVIOUS_BASE64');
  }

  /** Fetches the KEK from ENCRYPTION_KEK_URL when no base64 var is set. */
  async onModuleInit(): Promise<void> {
    if (this.activeKek) return;

    const url = this.configService.get<string>('ENCRYPTION_KEK_URL');
    if (!url) {
      this.logFallbackWarning();
      return;
    }

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new CryptoError(`KEK endpoint responded with ${response.status}`);
      }
      const body = (await response.json()) as { key?: unknown };
      const key = typeof body.key === 'string' ? body.key : null;
      if (!key) {
        throw new CryptoError('KEK endpoint returned no "key" field');
      }
      this.activeKek = CryptoProvider.parseKekMaterial(key);
      this.logger.log('KEK loaded from ENCRYPTION_KEK_URL');
    } catch (error) {
      this.logger.error(
        `Failed to load KEK from ${url}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      this.logFallbackWarning();
    }
  }

  /** True when an active KEK is available (i.e. real encryption is on). */
  isEnabled(): boolean {
    return this.activeKek !== null;
  }

  getActiveKekVersion(): number {
    return this.activeKekVersion;
  }

  /**
   * Encrypt `plaintext` under a DEK. When `opts.dekId` is given the matching
   * DEK is reused (per-user DEKs); otherwise a fresh DEK is created and
   * persisted. Returns the envelope string plus the DEK id used so callers
   * can populate both `encryptedData` and `dataEncryptionKeyId`.
   */
  async encrypt(
    plaintext: string,
    opts: { dekId?: string } = {},
  ): Promise<{ ciphertext: string; dekId: string | null }> {
    if (!this.isEnabled()) {
      this.logFallbackWarning();
      return { ciphertext: plaintext, dekId: null };
    }

    let dek: DataEncryptionKey | null = null;
    if (opts.dekId) {
      dek = await this.dekRepository.findOneBy({ id: opts.dekId });
      if (!dek) {
        this.logger.warn(
          `Data encryption key "${opts.dekId}" not found; creating a replacement`,
        );
      }
    }
    if (!dek) {
      dek = await this.createDek();
    }

    const rawDek = await this.unwrapDek(dek);
    const iv = randomBytes(CryptoProvider.IV_BYTES);
    const cipher = createCipheriv(CryptoProvider.ALGORITHM, rawDek, iv);
    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    const envelope = {
      v: CryptoProvider.ENVELOPE_VERSION,
      keyId: dek.id,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ct: ciphertext.toString('base64'),
    };

    return { ciphertext: JSON.stringify(envelope), dekId: dek.id };
  }

  /**
   * Decrypt a value previously produced by `encrypt`. Non-envelope input
   * (legacy plaintext, or transparent-fallback values) is returned as-is so
   * pre-migration rows keep working. A genuine envelope with no KEK throws
   * `EncryptionKeyUnavailableError` rather than leaking the ciphertext.
   */
  async decrypt(payload: string): Promise<string> {
    if (!payload) return payload;

    const envelope = this.parseEnvelope(payload);
    if (!envelope) {
      // Fail closed for values that look like envelopes but carry an
      // unsupported version; only genuine legacy plaintext passes through.
      if (this.looksLikeEnvelope(payload)) {
        throw new DecryptionFailedError(
          'Unsupported envelope version or malformed envelope',
        );
      }
      return payload;
    }

    // Data envelopes must reference their DEK; wrapped-key envelopes (which
    // share the same shape minus keyId) are handled by decryptWithKek only.
    if (!envelope.keyId) {
      throw new DecryptionFailedError('Envelope is missing its keyId');
    }

    if (!this.isEnabled()) {
      throw new EncryptionKeyUnavailableError(
        'Cannot decrypt envelope: no KEK is configured',
      );
    }

    const dek = await this.dekRepository.findOneBy({ id: envelope.keyId });
    if (!dek) {
      throw new CryptoError(
        `Data encryption key "${envelope.keyId}" referenced by envelope not found`,
      );
    }

    const rawDek = await this.unwrapDek(dek);
    try {
      const decipher = createDecipheriv(
        CryptoProvider.ALGORITHM,
        rawDek,
        Buffer.from(envelope.iv, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
      const plaintext = Buffer.concat([
        decipher.update(Buffer.from(envelope.ct, 'base64')),
        decipher.final(),
      ]);
      return plaintext.toString('utf8');
    } catch (error) {
      throw new DecryptionFailedError(
        `Decryption failed: ${error instanceof Error ? error.message : 'invalid ciphertext'}`,
      );
    }
  }

  /** Backfill the owning user on a DEK row (for audit/tooling). */
  async attachDekToUser(dekId: string, userId: number): Promise<void> {
    await this.dekRepository.update({ id: dekId }, { userId });
  }

  /** Generate + persist a fresh DEK wrapped under the active KEK. */
  async createDek(userId?: number): Promise<DataEncryptionKey> {
    if (!this.isEnabled()) {
      throw new EncryptionKeyUnavailableError(
        'Cannot create a data encryption key without a KEK',
      );
    }
    const raw = randomBytes(CryptoProvider.DEK_BYTES);
    const dek = this.dekRepository.create({
      userId: userId ?? null,
      wrappedKey: this.wrapWithKek(raw, this.activeKek as Buffer),
      kekVersion: this.activeKekVersion,
    });
    return this.dekRepository.save(dek);
  }

  /**
   * Unwrap a stored DEK, trying the KEK matching its recorded version first
   * and then every known KEK (covers version drift and pre-rotation rows).
   */
  async unwrapDek(dek: DataEncryptionKey): Promise<Buffer> {
    if (!this.isEnabled()) {
      throw new EncryptionKeyUnavailableError(
        'Cannot unwrap a DEK without a KEK',
      );
    }

    const candidates: Buffer[] = [];
    if (dek.kekVersion === this.activeKekVersion && this.activeKek) {
      candidates.push(this.activeKek);
    } else if (
      dek.kekVersion === this.activeKekVersion - 1 &&
      this.previousKek
    ) {
      candidates.push(this.previousKek);
    }
    // Unconditional fallbacks so slightly stale `kekVersion` values never
    // permanently lock data out.
    for (const kek of [this.activeKek, this.previousKek]) {
      if (kek && !candidates.includes(kek)) {
        candidates.push(kek);
      }
    }

    for (const kek of candidates) {
      try {
        return this.decryptWithKek(Buffer.from(dek.wrappedKey, 'base64'), kek);
      } catch {
        // Try the next candidate KEK.
      }
    }

    throw new DecryptionFailedError(
      'Unable to unwrap data encryption key with any configured KEK',
    );
  }

  /**
   * Wrap a raw DEK under a specific KEK (used by KeyRotationService to
   * re-wrap under the incoming KEK before it becomes active).
   */
  wrapWithKek(rawDek: Buffer, kek: Buffer): string {
    const iv = randomBytes(CryptoProvider.IV_BYTES);
    const cipher = createCipheriv(CryptoProvider.ALGORITHM, kek, iv);
    const ciphertext = Buffer.concat([cipher.update(rawDek), cipher.final()]);
    const tag = cipher.getAuthTag();
    return JSON.stringify({
      v: CryptoProvider.ENVELOPE_VERSION,
      iv: iv.toString('base64'),
      tag: tag.toString('base64'),
      ct: ciphertext.toString('base64'),
    });
  }

  /**
   * Swap the active KEK in-memory (used by KeyRotationService after all DEKs
   * have been re-wrapped). The previous active key is retained as the
   * decrypt-only fallback so already-issued data remains readable.
   */
  activateKek(newKekBase64: string): void {
    const newKek = CryptoProvider.parseKekMaterial(newKekBase64);
    this.previousKek = this.activeKek;
    this.activeKek = newKek;
    this.activeKekVersion += 1;
    this.logger.log(
      `Activated KEK v${this.activeKekVersion} (previous KEK retained for decryption)`,
    );
  }

  /**
   * Validate a base64 KEK string and return its raw 32 bytes. Public so
   * KeyRotationService can validate incoming keys without a provider cycle.
   */
  static parseKekMaterial(base64: string): Buffer {
    const raw = Buffer.from(base64, 'base64');
    if (raw.length !== CryptoProvider.KEK_BYTES) {
      throw new CryptoError(
        `KEK must be a base64-encoded ${CryptoProvider.KEK_BYTES}-byte key (got ${raw.length} bytes)`,
      );
    }
    return raw;
  }

  private decryptWithKek(wrapped: Buffer, kek: Buffer): Buffer {
    const envelope = this.parseEnvelope(wrapped.toString('utf8'));
    if (!envelope) {
      throw new DecryptionFailedError('Wrapped key is not a valid envelope');
    }
    const decipher = createDecipheriv(
      CryptoProvider.ALGORITHM,
      kek,
      Buffer.from(envelope.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(envelope.ct, 'base64')),
      decipher.final(),
    ]);
  }

  private looksLikeEnvelope(value: string): boolean {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      return Boolean(parsed && typeof parsed.v === 'number');
    } catch {
      return false;
    }
  }

  private parseEnvelope(value: string): {
    v: number;
    keyId?: string;
    iv: string;
    tag: string;
    ct: string;
  } | null {
    try {
      const parsed = JSON.parse(value) as {
        v?: number;
        keyId?: string;
        iv?: string;
        tag?: string;
        ct?: string;
      };
      if (
        parsed &&
        parsed.v === CryptoProvider.ENVELOPE_VERSION &&
        typeof parsed.iv === 'string' &&
        typeof parsed.tag === 'string' &&
        typeof parsed.ct === 'string'
      ) {
        return parsed as {
          v: number;
          keyId?: string;
          iv: string;
          tag: string;
          ct: string;
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private loadKekFromConfig(variable: string): Buffer | null {
    const value = this.configService.get<string>(variable);
    if (!value) return null;
    try {
      return CryptoProvider.parseKekMaterial(value);
    } catch (error) {
      this.logger.error(
        `Invalid ${variable}: ${error instanceof Error ? error.message : error}`,
      );
      return null;
    }
  }

  private logFallbackWarning(): void {
    if (this.warnedFallback) return;
    this.warnedFallback = true;
    this.logger.warn(
      'No KEK configured — CryptoProvider is in TRANSPARENT FALLBACK mode. ' +
        'Sensitive values will be stored as plaintext. Set ENCRYPTION_KEK_BASE64 ' +
        'or ENCRYPTION_KEK_URL in production.',
    );
  }
}

/**
 * Constant-time string comparison used when comparing a user-supplied raw
 * token against a decrypted value, so length/content cannot be side-channeled.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
