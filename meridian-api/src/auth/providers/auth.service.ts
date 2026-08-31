import {
  ConflictException,
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { SignInDto } from '../dto/sign-in.dto';
import { SignInProviders } from './sign-in.providers';
import { RefreshTokenDto } from '../dto/refresh-token-dto';
import { RefreshTokenProvider } from './refreshToken.provider';
import { VerifyEmailProvider } from './verify-email.provider';
import {
  IdempotencyConflictError,
  IdempotencyProvider,
} from './idempotency.provider';
import { User } from 'src/users/user.entity';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit-log.entity';

/**
 * Maximum accepted length for a caller-supplied idempotency key. Mirrors the
 * controller-side validation so both layers agree on the contract.
 */
export const MAX_IDEMPOTENCY_KEY_LENGTH = 255;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    //intra dependency injection of sigin Providers
    private readonly signInProviders: SignInProviders,

    private readonly refreshTokenProvider: RefreshTokenProvider,

    // Email-verification flow (issue #435): issues tokens and consumes them
    // when the recipient clicks the link from their signup mail.
    private readonly verifyEmailProvider: VerifyEmailProvider,

    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,

    private readonly auditService: AuditService,

    /**
     * Deterministic idempotency boundary for every sensitive auth operation
     * (issue #1689). Replaces the previous ad-hoc in-memory Map:
     *  - concurrent requests with the same key are serialized per key and
     *    share a single execution;
     *  - retries after success replay the stored response for the TTL;
     *  - a key reused with a different payload is rejected with a 409
     *    ConflictException and zero state change;
     *  - failed operations are recorded as retryable — the next request with
     *    the same key re-runs the business operation exactly once.
     */
    private readonly idempotency: IdempotencyProvider,
  ) {}

  /**
   * Execute an operation under the caller's idempotency key (issue #1689).
   *
   * When `key` is undefined or empty, the operation is executed directly —
   * pre-existing behavior for callers that send no header. Otherwise the
   * key is validated, namespaced per operation, and bound to a hash of
   * `request`, so:
   *  - identical retries replay the stored result;
   *  - conflicting reuse (same key, different payload) fails with
   *    ConflictException (HTTP 409) and executes nothing;
   *  - malformed keys fail with 400 before anything executes.
   */
  private async withIdempotency<T>(
    operationName: string,
    key: string | undefined,
    request: unknown,
    operation: () => Promise<T>,
  ): Promise<T> {
    if (!key) {
      return operation();
    }

    if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
      throw new BadRequestException(
        `Idempotency-Key must be at most ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
      );
    }

    // Namespaced so one client key cannot alias two different flows.
    return await this.executeKeyed(
      `${operationName}:${key}`,
      request,
      operation,
    );
  }

  /** Run an operation under a pre-built key with conflict mapping. */
  private async executeKeyed<T>(
    key: string,
    request: unknown,
    operation: () => Promise<T>,
  ): Promise<T> {
    try {
      return await this.idempotency.execute(key, request, operation);
    } catch (error) {
      if (error instanceof IdempotencyConflictError) {
        throw new ConflictException(
          'Idempotency key used with a different request payload',
        );
      }
      throw error;
    }
  }

  /** SHA-256 of a value, used so raw secrets never become map keys. */
  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  public async SignIn(signInDto: SignInDto, idempotencyKey?: string) {
    return await this.withIdempotency(
      'sign-in',
      idempotencyKey,
      { dto: signInDto },
      () => this.signInProviders.SignIn(signInDto),
    );
  }

  /**
   * Email-verification (issue #435): consume a raw verification token from
   * the signup mail. Delegates to VerifyEmailProvider for the heavy lifting
   * (lookup / match / cleanup).
   *
   * Concurrency (issue #1689): two layers of protection —
   *  1. the token itself is an implicit idempotency key (hashed, never stored
   *     raw): concurrent or replayed submissions of the same token share one
   *     execution and get the same response;
   *  2. the provider consumes the token with a compare-and-set UPDATE, so
   *     even requests that arrive through different processes (where the
   *     in-process store cannot dedupe them) can flip the row exactly once —
   *     the loser deterministically observes the verified row or a 401.
   */
  public async verifyEmail(token: string) {
    // Implicit key: the SHA-256 of the token itself — concurrent or
    // replayed submissions share one execution. No caller header involved.
    return await this.executeKeyed(
      `verify-email:${this.sha256(token)}`,
      { token: this.sha256(token) },
      () => this.verifyEmailProvider.verifyEmail(token),
    );
  }

  /**
   * Email-verification (issue #435): re-issue a fresh verification token
   * for the given email if the account exists and is not already verified.
   * Always returns the same acknowledgement so callers cannot enumerate
   * which emails belong to a registered account.
   *
   * An optional `idempotencyKey` allows the caller to request at most one
   * reissue operation per key. Without a key, the operation retains its
   * existing behavior.
   */
  public async resendVerification(email: string, idempotencyKey?: string) {
    return await this.withIdempotency(
      'resend-verification',
      idempotencyKey,
      { email },
      () => this.resendVerificationInternal(email),
    );
  }

  private async resendVerificationInternal(email: string) {
    const user = await this.usersRepository.findOne({
      where: { email },
      withDeleted: false,
    });

    if (user && !user.emailVerified) {
      try {
        await this.verifyEmailProvider.issueVerificationToken(user);

        await this.auditService.log({
          entityName: 'VerificationToken',
          entityId: user.id,
          action: AuditAction.RESEND_VERIFICATION,
          performedById: user.id,
          performedByEmail: user.email,
        });
      } catch (error) {
        this.logger.error(
          `Failed to reissue verification token for ${email}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    return {
      status: 'ok',
      message:
        'If that email belongs to an unverified account, a new verification email has been sent.',
    };
  }

  /**
   * Rotate a session's token pair (see RefreshTokenProvider for the
   * serialization invariants). The optional idempotency key defines the
   * client retry contract: retrying the same request body with the same key
   * replays the winning response instead of racing the rotation a second
   * time.
   */
  public async RefreshToken(
    refreshTokendto: RefreshTokenDto,
    userAgent?: string,
    idempotencyKey?: string,
  ) {
    return await this.withIdempotency(
      'refresh-token',
      idempotencyKey,
      { dto: refreshTokendto, userAgent },
      () => this.refreshTokenProvider.refreshToken(refreshTokendto, userAgent),
    );
  }

  /**
   * Revoke a single refresh token. Idempotent by construction (revoking a
   * revoked token is a no-op that still succeeds); the optional idempotency
   * key additionally replays the stored acknowledgement for retried logouts.
   */
  public async logout(
    refreshTokendto: RefreshTokenDto,
    idempotencyKey?: string,
  ) {
    return await this.withIdempotency(
      'logout',
      idempotencyKey,
      { dto: refreshTokendto },
      () => this.refreshTokenProvider.logout(refreshTokendto),
    );
  }

  /**
   * Revoke every refresh token for a user (all devices / tabs). Serialized
   * against in-flight rotations via the per-user advisory lock inside
   * RefreshTokenProvider.logoutAll.
   */
  public async logoutAll(userId: number, idempotencyKey?: string) {
    return await this.withIdempotency(
      'logout-all',
      idempotencyKey,
      { userId },
      () => this.refreshTokenProvider.logoutAll(userId),
    );
  }
}
