import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { RefreshTokenDto } from '../dto/refresh-token-dto';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  IsNull,
  MoreThan,
  Repository,
} from 'typeorm';
import { UserService } from 'src/users/providers/user.services';
import { GenerateTokenProvider } from './token.provider';
import { RefreshToken } from '../entities/refresh-token.entity';
import { HashingProvider } from './hashing';
import {
  CryptoProvider,
  constantTimeEqual,
} from 'src/crypto/providers/crypto.provider';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit-log.entity';

/**
 * Namespace used for the per-user PostgreSQL advisory lock that serializes
 * refresh rotations against `logoutAll` (see `acquireUserLock`). Any int32
 * works as long as it is unique to this call-site; 1689 references the issue
 * that introduced the lock for greppability.
 */
const AUTH_USER_LOCK_NAMESPACE = 1689;

/**
 * Refresh-token store with deterministic concurrency semantics (issue #1689).
 *
 * # Invariants
 *
 * I1 — At most one live descendant per refresh token:
 *      Rotating a token performs, inside ONE database transaction,
 *      (a) insert of the replacement token row, then (b) a compare-and-set
 *      revoke of the presented token
 *      (`UPDATE ... WHERE jti = ? AND revoked_at IS NULL AND expires_at > now`).
 *      Exactly one concurrent request can win the CAS; every loser's
 *      transaction rolls back (including its already-inserted replacement
 *      row), so no orphan token rows survive and the loser receives a
 *      deterministic 401.
 *
 * I2 — Failures leave the old token usable:
 *      If generation or persistence fails, the transaction rolls back — the
 *      presented refresh token was never revoked, so the client can safely
 *      retry (create-before-revoke ordering preserved from #1688, now atomic).
 *
 * I3 — logoutAll cannot be raced by an in-flight refresh:
 *      Both refresh and logoutAll take a per-user transaction-scoped advisory
 *      lock (`pg_advisory_xact_lock`), so "refresh commits a new live token"
 *      and "logoutAll reports all sessions revoked" are serialized. Without
 *      the lock, a rotation committing after logoutAll's UPDATE would leave a
 *      live session behind (write-skew).
 *
 * I4 — logout is idempotent:
 *      Revoking an already-revoked or unknown token is a no-op that still
 *      reports success, so retried logouts (multi-tab, network retries) never
 *      fail and never change unrelated state.
 *
 * I5 — Audit is fire-and-forget: a failed audit write never blocks or fails
 *      an auth operation, and runs OUTSIDE the rotation transaction.
 *
 * # Client retry contract
 *
 * - 401 `Refresh token has been revoked or expired` → the presented token was
 *   consumed by another request (e.g. another tab won the rotation) or is
 *   genuinely revoked/expired. The client must NOT retry with the same token;
 *   either use the response the winner tab obtained or re-authenticate.
 * - 5xx → transient infrastructure failure; the presented token is still
 *   valid and the client may retry (ideally with the same `Idempotency-Key`).
 */
@Injectable()
export class RefreshTokenProvider {
  private readonly logger = new Logger(RefreshTokenProvider.name);

  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,

    private readonly jwtService: JwtService,

    // jwt config injecion
    @Inject(jwtConfig.KEY)
    private readonly jwtconfiguration: ConfigType<typeof jwtConfig>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,

    private readonly hashingProvider: HashingProvider,

    // injecting generatetokenprovider
    private readonly generateTokenProvider: GenerateTokenProvider,

    // Envelope encryption (issue #631): stores a reversible, encrypted copy
    // of each refresh token (under the user's DEK) so sessions can be
    // audited/rotated without re-hashing.
    private readonly cryptoProvider: CryptoProvider,

    private readonly auditService: AuditService,

    // Transaction boundary for the rotation CAS (issue #1689).
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Refresh a session's tokens using a transactional create-before-revoke
   * rotation. See the class docblock for the invariants and the retry
   * contract.
   */
  public async refreshToken(
    refreshTokendto: RefreshTokenDto,
    userAgent?: string,
  ) {
    // ---- Stateless validation (no DB state touched) --------------------
    const payload = await this.verifyRefreshJwt(refreshTokendto.refreshToken);

    const { sub, jti } = payload;
    const userId = Number(sub);

    if (!Number.isFinite(userId)) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const user = await this.userService.findOneId(userId);

    // ---- Transactional rotation ----------------------------------------
    const result = await this.dataSource.transaction(async (manager) => {
      // Serialize against logoutAll (I3) and any sibling rotation (I1).
      await this.acquireUserLock(manager, user.id);

      const storedToken = await manager.findOne(RefreshToken, {
        where: { jti, userId: user.id },
      });

      if (
        !storedToken ||
        storedToken.revokedAt ||
        storedToken.expiresAt <= new Date()
      ) {
        throw new UnauthorizedException(
          'Refresh token has been revoked or expired',
        );
      }

      const isValid = await this.isValidRefreshToken(
        refreshTokendto.refreshToken,
        storedToken,
      );

      if (!isValid) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const now = new Date();

      // Step 1: generate and persist the NEW token pair first (I2). The
      // insert is part of this transaction, so it is invisible until commit
      // and is rolled back if anything below fails.
      const tokens = await this.generateTokenProvider.generateTokens(user, {
        manager,
        userAgent: userAgent ?? null,
      });

      // Step 2: compare-and-set revoke of the OLD token (I1). A concurrent
      // rotation, logout or expiry between our read and this write makes the
      // UPDATE match zero rows; we then throw so the whole transaction
      // (including the row inserted above) rolls back.
      const claimed = await manager.update(
        RefreshToken,
        {
          jti,
          userId: user.id,
          revokedAt: IsNull(),
          expiresAt: MoreThan(now),
        },
        { revokedAt: now },
      );

      if (!claimed || !claimed.affected) {
        throw new UnauthorizedException(
          'Refresh token has been revoked or expired',
        );
      }

      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        refreshTokenId: tokens.refreshTokenId,
      };
    });

    // ---- Audit (outside the transaction; fire-and-forget — I5) ----------
    this.auditService
      .log({
        entityName: 'Session',
        entityId: result.refreshTokenId,
        action: AuditAction.REFRESH,
        performedById: user.id,
        performedByEmail: user.email,
      })
      .catch(() => {
        /* audit failure is non-blocking */
      });

    return result;
  }

  /**
   * Revoke a single refresh token.
   *
   * Idempotent (I4): revoking an already-revoked token affects zero rows and
   * still succeeds, so client retries and multi-tab double-logouts are safe.
   *
   * Audit logging is fire-and-forget: a failed audit write never prevents the
   * logout from succeeding.
   */
  public async logout(refreshTokendto: RefreshTokenDto) {
    const payload = await this.verifyRefreshJwt(refreshTokendto.refreshToken);

    const { sub, jti } = payload;
    const userId = Number(sub);

    if (!Number.isFinite(userId)) {
      throw new UnauthorizedException('Invalid refresh token payload');
    }

    const user = await this.userService.findOneId(userId);

    await this.refreshTokenRepository.update(
      { jti, userId: user.id },
      { revokedAt: new Date() },
    );

    // Audit is fire-and-forget — a failed audit write never blocks logout.
    this.auditService
      .log({
        entityName: 'Session',
        entityId: jti,
        action: AuditAction.LOGOUT,
        performedById: user.id,
        performedByEmail: user.email,
      })
      .catch(() => {
        /* audit failure is non-blocking */
      });

    return { message: 'Logged out successfully' };
  }

  /**
   * Revoke all refresh tokens for a user.
   *
   * Runs inside a transaction guarded by the same per-user advisory lock as
   * `refreshToken` (I3), so it cannot report success while a concurrent
   * rotation is about to commit a fresh live token: the two operations are
   * fully serialized per user.
   *
   * Audit logging is fire-and-forget: a failed audit write never prevents the
   * logout-all from succeeding.
   */
  public async logoutAll(userId: number) {
    await this.dataSource.transaction(async (manager) => {
      await this.acquireUserLock(manager, userId);
      await manager.update(
        RefreshToken,
        { userId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    });

    let email = null;
    try {
      const user = await this.userService.findOneId(userId);
      email = user?.email;
    } catch {
      // ignore — audit enrichment is best-effort only
    }

    // Audit is fire-and-forget — a failed audit write never blocks logout-all.
    this.auditService
      .log({
        entityName: 'Session',
        action: AuditAction.LOGOUT_ALL,
        performedById: userId,
        performedByEmail: email,
      })
      .catch(() => {
        /* audit failure is non-blocking */
      });

    return { message: 'All sessions revoked successfully' };
  }

  /**
   * Verify the refresh JWT. Any verification failure (bad signature, expiry,
   * wrong issuer/audience, malformed) maps to a single generic 401 so the
   * response cannot be used to distinguish *why* a token failed.
   */
  private async verifyRefreshJwt(
    rawToken: string,
  ): Promise<{ sub: string | number; jti?: string }> {
    try {
      return await this.jwtService.verifyAsync(rawToken, {
        secret: this.jwtconfiguration.secret,
        audience: this.jwtconfiguration.audience,
        issuer: this.jwtconfiguration.issuer,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Take the per-user, transaction-scoped advisory lock that serializes
   * refresh rotations against each other and against `logoutAll` (I1/I3).
   *
   * `pg_advisory_xact_lock(int, int)` is released automatically when the
   * surrounding transaction commits or rolls back — there is no unlock path
   * to forget, and a crashed client releases it at connection close.
   */
  private async acquireUserLock(manager: EntityManager, userId: number) {
    await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [
      AUTH_USER_LOCK_NAMESPACE,
      userId,
    ]);
  }

  /**
   * Compare a raw refresh token against a stored row. Prefers the
   * envelope-encrypted copy (issue #631); falls back to the legacy bcrypt
   * hash so pre-migration rows keep validating.
   */
  private async isValidRefreshToken(
    rawToken: string,
    stored: RefreshToken,
  ): Promise<boolean> {
    if (stored.encryptedData) {
      try {
        const decrypted = await this.cryptoProvider.decrypt(
          stored.encryptedData,
        );
        if (constantTimeEqual(decrypted, rawToken)) {
          return true;
        }
      } catch (error) {
        this.logger.warn(
          `Failed to decrypt refresh token ${stored.jti}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    if (stored.tokenHash) {
      return this.hashingProvider.comparePassword(rawToken, stored.tokenHash);
    }

    return false;
  }
}
