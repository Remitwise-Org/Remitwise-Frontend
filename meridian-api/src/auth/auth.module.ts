import { Module, forwardRef } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { AuthService } from './providers/auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { HashingProvider } from 'src/auth/providers/hashing';
import { BcryptProvider } from './providers/bcrypt';
import { SignInProviders } from 'src/auth/providers/sign-in.providers';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from './config/jwt.config';
import { JwtModule } from '@nestjs/jwt';
import { GenerateTokenProvider } from 'src/auth/providers/token.provider';
import { RefreshTokenProvider } from 'src/auth/providers/refreshToken.provider';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from 'src/auth/entities/refresh-token.entity';
import { VerifyEmailProvider } from 'src/auth/providers/verify-email.provider';
import {
  BcryptVerificationTokenProvider,
  VerificationTokenProvider,
} from 'src/auth/providers/verification-token.provider';
import { User } from 'src/users/user.entity';
import { CryptoModule } from 'src/crypto/crypto.module';
import { IdempotencyProvider } from 'src/auth/providers/idempotency.provider';

/**
 * Auth module (issue #1689 concurrency hardening).
 *
 * Idempotency / retry boundary:
 * `IdempotencyProvider` is the single, in-process idempotency boundary used by
 * `AuthService` for sign-in, refresh, logout, logout-all and verification
 * resend. It serializes concurrent requests that share an `Idempotency-Key`,
 * replays the stored response for safe retries, and rejects key reuse with a
 * different payload (`IdempotencyConflictError` → HTTP 409).
 *
 * The default backing store is process-local. See
 * `providers/idempotency.provider.ts` and `docs/AUTH_CONCURRENCY.md` for the
 * scale-out contract (swap `IdempotencyStore` for a Redis-backed
 * implementation; no call-site changes are required).
 */
@Module({
  imports: [
    forwardRef(() => UsersModule),
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    TypeOrmModule.forFeature([RefreshToken, User]),
    CryptoModule,
    AuditModule,
  ],
  providers: [
    AuthService,
    GenerateTokenProvider,
    RefreshTokenProvider,
    { provide: HashingProvider, useClass: BcryptProvider },
    SignInProviders,
    VerifyEmailProvider,
    {
      provide: VerificationTokenProvider,
      useClass: BcryptVerificationTokenProvider,
    },
    IdempotencyProvider,
  ],
  controllers: [AuthController],
  exports: [AuthService, HashingProvider],
})
export class AuthModule {}
