import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, MoreThan, Not, Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import { VerificationTokenProvider } from './verification-token.provider';
import { MailProvider } from 'src/mail/providers/mail.provider';
import { VERIFICATION_TTL_MS } from './verification-token.constants';
import {
  CryptoProvider,
  constantTimeEqual,
} from 'src/crypto/providers/crypto.provider';
import { Role } from '../enums/role.enum';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit-log.entity';

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

    private readonly auditService: AuditService,
  ) {}

  /**
   * Generate a verification token for a freshly-created (or unverified)
   * user, persist its hash, and email the raw token.
   *
   * Concurrency (issue #1689): the persist is a compare-and-set on
   * `emailVerified = false`. If the user becomes verified concurrently (e.g.
   * they click the verification link while a resend is in flight), the UPDATE
   * matches zero rows, no token is armed, and no mail is sent — a verified
   * account can never be left holding a live verification token.
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

    const armed = await this.usersRepository.update(
      // Compare-and-set: only arm the token while the account is still
      // unverified (see docblock).
      { id: user.id, emailVerified: false },
      {
        emailVerificationToken: hashed,
        emailVerificationExpires: expires,
        emailVerified: false,
        dataEncryptionKeyId:
          encrypted?.dataEncryptionKeyId ?? user.dataEncryptionKeyId ?? null,
        encryptedData: encrypted?.encryptedData ?? null,
      },
    );

    if (!armed || !armed.affected) {
      // The account was verified concurrently — no token, no mail, no audit.
      this.logger.warn(
        `Skipped arming a verification token for user ${user.id}: account is already verified`,
      );
      return;
    }

    await this.auditService.log({
      entityName: 'VerificationToken',
      entityId: user.id,
      action: AuditAction.ISSUE_VERIFICATION_TOKEN,
      performedById: user.id,
      performedByEmail: user.email,
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
          matches = constantTimeEqual(
            decrypted.verificationToken ?? '',
            rawToken,
          );
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

      // Compare-and-set consume (issue #1689): the flip to verified only
      // succeeds while the row still carries exactly the token material we
      // matched above. This makes a concurrent double-submit of the same
      // token, or a resend that replaced the token between our read and our
      // write, deterministic:
      //  - exactly one request performs the state change;
      //  - a request that lost the race but held a genuinely matching token
      //    observes the already-verified row and returns it (idempotent
      //    success — the caller's intent is satisfied);
      //  - a request whose token was superseded by a resend gets a 401
      //    instead of consuming a token that is no longer current.
      const criteria: FindOptionsWhere<User> = {
        id: user.id,
        emailVerified: false,
      };
      if (user.emailVerificationToken) {
        criteria.emailVerificationToken = user.emailVerificationToken;
      }
      if (user.encryptedData) {
        criteria.encryptedData = user.encryptedData;
      }

      const consumed = await this.usersRepository.update(criteria, {
        emailVerified: true,
        role: nextRole,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        encryptedData: null,
      });

      if (!consumed || !consumed.affected) {
        const current = await this.usersRepository.findOne({
          where: { id: user.id },
        });
        if (current?.emailVerified) {
          // Another request already verified this account: idempotent
          // success, no second state change, no duplicate audit entry.
          return current;
        }
        throw new UnauthorizedException(
          'Invalid or expired verification token',
        );
      }

      await this.auditService.log({
        entityName: 'User',
        entityId: user.id,
        action: AuditAction.VERIFY_EMAIL,
        performedById: user.id,
        performedByEmail: user.email,
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
