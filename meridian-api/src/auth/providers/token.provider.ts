import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { User } from 'src/users/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { HashingProvider } from './hashing';
import { randomUUID } from 'crypto';
import { CryptoProvider } from 'src/crypto/providers/crypto.provider';
import { Role } from '../enums/role.enum';
import { ROLE_PERMISSIONS } from '../enums/role-permissions';
import { ActiveUserData } from '../interfaces/active-user-data.interface';

// seperation of concern
// this was generated to create access token and refresh token so we can use in signInProvider

@Injectable()
export class GenerateTokenProvider {
  constructor(
    // jwtService injecion
    private readonly jwtService: JwtService,

    // jwt config injecion
    @Inject(jwtConfig.KEY)
    private readonly jwtconfiguration: ConfigType<typeof jwtConfig>,

    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,

    private readonly hashingProvider: HashingProvider,

    // Envelope encryption (issue #631): persists an encrypted copy of the
    // refresh token alongside the bcrypt hash.
    private readonly cryptoProvider: CryptoProvider,
  ) {}

  // we want to generate to types of token which need payload
  //payload for access {id,ttl,email} and refresh{id,ttl}
  public async SignToken<T>(userId: number, expiresIn: number, payload?: T) {
    return await this.jwtService.signAsync(
      {
        sub: userId,
        ...payload,
      },
      {
        secret: this.jwtconfiguration.secret,
        audience: this.jwtconfiguration.audience,
        issuer: this.jwtconfiguration.issuer,
        expiresIn,
      },
    );
  }

  /**
   * Mint an access + refresh token pair for `user` and persist the refresh
   * token row.
   *
   * Concurrency (issue #1689): when `options.manager` is supplied the refresh
   * token row is written through that `EntityManager`, i.e. inside the
   * caller's transaction. `RefreshTokenProvider.refreshToken` relies on this
   * so that "insert new token" and "revoke old token" commit atomically — a
   * failed rotation rolls back and never leaves an orphaned live token or a
   * revoked-but-unusable session behind.
   */
  public async generateTokens(
    user: User,
    options: { manager?: EntityManager; userAgent?: string | null } = {},
  ) {
    const jti = randomUUID();

    // Role-aware claims (issue #632): embed the user's role and the resolved
    // permission list so the RbacGuard can authorize statelessly. `verified`
    // mirrors `emailVerified` for consumers that gate on verification.
    const role = user.role ?? Role.USER;
    const accessClaims: ActiveUserData = {
      sub: user.id,
      email: user.email,
      role,
      permissions: ROLE_PERMISSIONS[role] ?? [],
      verified: user.emailVerified,
    };

    const [access_token, refresh_token] = await Promise.all([
      // generate access token
      this.SignToken(user.id, this.jwtconfiguration.ttl, accessClaims),

      // generate refresh token
      this.SignToken(user.id, this.jwtconfiguration.Rttl, { jti }),
    ]);

    const encrypted = this.cryptoProvider.isEnabled()
      ? await this.cryptoProvider.encrypt(refresh_token, {
          dekId: user.dataEncryptionKeyId ?? undefined,
        })
      : null;

    // Write through the caller's transaction when provided (see docblock);
    // otherwise persist through the module-scoped repository as before.
    const repository = options.manager
      ? options.manager.getRepository(RefreshToken)
      : this.refreshTokenRepository;

    const persisted = await repository.save({
      jti,
      userId: user.id,
      tokenHash: await this.hashingProvider.hashPassword(refresh_token),
      expiresAt: new Date(Date.now() + this.jwtconfiguration.Rttl * 1000),
      revokedAt: null,
      userAgent: options.userAgent ?? null,
      encryptedData: encrypted?.ciphertext ?? null,
      dataEncryptionKeyId: encrypted?.dekId ?? null,
    });

    return {
      access_token,
      refresh_token,
      jti,
      refreshTokenId: (persisted as { id?: string })?.id,
    };
  }
}
