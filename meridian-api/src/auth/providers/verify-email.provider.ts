import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Not, Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import { VerificationTokenProvider } from './verification-token.provider';
import { MailProvider } from 'src/mail/providers/mail.provider';
import { VERIFICATION_TTL_MS } from './verification-token.constants';
import { CryptoProvider, constantTimeEqual } from 'src/crypto/providers/crypto.provider';
import { Role } from '../enums/role.enum';

/**
 * Email-verification flows (issue #435).
 *
 *  - `issueVerificationToken`: hash a fresh raw token and persist it on the
 *    user row with an expiry; dispatch the templated mail containing the
 *    raw token. Mail send failures are logged but never re-thrown so an
 *    unreachable SMTP server cannot block account creation.
 *  - `verifyEmail`: locate the matching user via the bcrypt hash, clear
 *    the token columns, and flip `emailVerified` true. Throws
 *    UnauthorizedException for *any* invalid / expired / consumed token so
 *    callers cannot distinguish the failure mode.
 */
@Injectable()
export class VerifyEmailProvider {
  private readonly logger = new Logger(VerifyEmailProvider.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly tokenProvider: VerificationTokenProvider,

    private readonly mailService: MailProvider,

    // Envelope encryption (issue #631): encrypts the raw token on the user
    // row so it can be rotated/audited without re-hashing.
    private readonly cryptoProvider: CryptoProvider,
  ) {}

  /**
   * Generate a verification token for a freshly-created (or unverified)
   * user, persist its hash, and email the raw token.
   */
  public async issueVerificationToken(user: User): Promise<void> {
    const raw = this.tokenProvider.generate();
    const hashed = await this.tokenProvider.hash(raw);

    const expires = new Date(Date.now() + VERIFICATION_TTL_MS);

    // Envelope-encrypt the raw token under the user's DEK (issue #631). The
    // bcrypt hash stays the primary verification value; the ciphertext is a
    // reversible copy for rotation/audit. Skipped in transparent-fallback
    // mode (no KEK) so plaintext is never persisted.
    const encrypted = this.cryptoProvider.isEnabled()
      ? await this.encryptUserData(user, { verificationToken: raw })
      : null;

    await this.usersRepository.update(user.id, {
      emailVerificationToken: hashed,
      emailVerificationExpires: expires,
      emailVerified: false,
      dataEncryptionKeyId: encrypted?.dataEncryptionKeyId ?? user.dataEncryptionKeyId ?? null,
      encryptedData: encrypted?.encryptedData ?? null,
    });

    try {
      await this.mailService.VerificationEmail(user, raw, expires);
    } catch (error) {
      this.logger.error(
        `Failed to send verification email for user ${user.id}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }

  /**
   * Resolve a raw verification token to its user. Marks the user as
   * verified and clears the token columns on success.
   */
  public async verifyEmail(rawToken: string): Promise<User> {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    const now = new Date();
    // Match either a legacy bcrypt-hash row or an envelope-encrypted row.
    const candidates = await this.usersRepository.find({
      where: [
        {
          emailVerificationToken: Not(IsNull()),
          emailVerificationExpires: MoreThan(now),
        },
        {
          encryptedData: Not(IsNull()),
          emailVerificationExpires: MoreThan(now),
        },
      ],
    });

    for (const user of candidates) {
      let matches = false;

      // Legacy path: bcrypt-compare against the stored hash.
      if (user.emailVerificationToken) {
        matches = await this.tokenProvider.compare(
          rawToken,
          user.emailVerificationToken,
        );
      }

      // New path (issue #631): decrypt the envelope and constant-time compare.
      if (!matches && user.encryptedData) {
        try {
          const decrypted = await this.decryptUserData(user.encryptedData);
          matches = constantTimeEqual(decrypted.verificationToken ?? '', rawToken);
        } catch (error) {
          this.logger.warn(
            `Failed to decrypt verification token for user ${user.id}: ${
              error instanceof Error ? error.message : error
            }`,
          );
        }
      }

      if (!matches) {
        continue;
      }

      // RBAC promotion (issue #632): once an email is verified the user is
      // upgraded from USER → VERIFIED_USER so they inherit verified-tier
      // permissions on their next sign-in.
      const nextRole =
        (user.role ?? Role.USER) === Role.USER ? Role.VERIFIED_USER : user.role;

      await this.usersRepository.update(user.id, {
        emailVerified: true,
        role: nextRole,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        encryptedData: null,
      });

      return { ...user, emailVerified: true, role: nextRole };
    }

    throw new UnauthorizedException('Invalid or expired verification token');
  }

  /**
   * Encrypt a small set of user-sensitive fields (issue #631). The value is
   * stored as a JSON container inside the envelope so future fields (e.g.
   * PII) can share the same column without a schema change.
   */
  private async encryptUserData(
    user: User,
    fields: Record<string, string>,
  ): Promise<{ encryptedData: string; dataEncryptionKeyId: string | null }> {
    const { ciphertext, dekId } = await this.cryptoProvider.encrypt(
      JSON.stringify(fields),
      { dekId: user.dataEncryptionKeyId ?? undefined },
    );
    return {
      encryptedData: ciphertext,
      dataEncryptionKeyId: dekId ?? user.dataEncryptionKeyId ?? null,
    };
  }

  private async decryptUserData(
    encryptedData: string,
  ): Promise<Record<string, string>> {
    const json = await this.cryptoProvider.decrypt(encryptedData);
    try {
      return JSON.parse(json) as Record<string, string>;
    } catch {
      return {};
    }
  }
}
