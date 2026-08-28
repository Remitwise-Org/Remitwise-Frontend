import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import jwtConfig from '../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  public async generateTokens(user: User) {
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

    await this.refreshTokenRepository.save({
      jti,
      userId: user.id,
      tokenHash: await this.hashingProvider.hashPassword(refresh_token),
      expiresAt: new Date(Date.now() + this.jwtconfiguration.Rttl * 1000),
      revokedAt: null,
      userAgent: null,
      encryptedData: encrypted?.ciphertext ?? null,
      dataEncryptionKeyId: encrypted?.dekId ?? null,
    });

    return { access_token, refresh_token, jti };
  }
}
