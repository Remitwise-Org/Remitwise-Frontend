import { Module, forwardRef, Injectable, NestInterceptor, ExecutionContext, CallHandler, ConflictException, BadRequestException } from '@nestjs/common';
import { AuthService } from './providers/auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from 'src/users/users.module';
import { HashingProvider } from 'src/auth/providers/hashing';
import { BcryptProvider } from './providers/bcrypt';
import { SignInProviders } from './providers/sign-in.providers';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from './config/jwt.config';
import { JwtModule } from '@nestjs/jwt';
import { GenerateTokenProvider } from './providers/token.provider';
import { RefreshTokenProvider } from './providers/refreshToken.provider';
import { TypeOrmModule, InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { VerifyEmailProvider } from './providers/verify-email.provider';
import {
  BcryptVerificationTokenProvider,
  VerificationTokenProvider,
} from './providers/verification-token.provider';
import { User } from 'src/users/user.entity';
import { CryptoModule } from 'src/crypto/crypto.module';
import { AuditModule } from 'src/audit/audit.module';
import { Column, Entity, PrimaryColumn, Repository } from 'typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Observable, mergeMap, catchError } from 'rxjs';

// Entity for idempotency records
@Entity('auth_idempotency_keys')
export class AuthIdempotencyKey {
  @PrimaryColumn({ type: 'varchar' })
  key: string;

  @Column({ type: 'varchar' })
  operation: string;

  @Column({ type: 'varchar', default: 'processing' })
  status: 'processing' | 'completed';

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}

@Injectable()
export class AuthIdempotencyInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuthIdempotencyKey)
    private readonly repo: Repository<AuthIdempotencyKey>,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest();
    const method: string = req.method;
    const path: string = req.url || '';

    // Only apply to mutating auth routes
    const isAuthMutation =
      (method === 'POST' || method === 'PATCH' || method === 'DELETE') &&
      path.startsWith('/auth');

    if (!isAuthMutation) {
      return next.handle();
    }

    const key = req.headers['idempotency-key'] ?? req.headers['x-idempotency-key'];

    if (!key) {
      throw new BadRequestException('Idempotency-Key header is required for auth mutations');
    }

    const operation = `${method}:${path}`;
    const existing = await this.repo.findOne({ where: { key } });

    if (existing) {
      if (existing.expiresAt < new Date()) {
        await this.repo.delete({ key });
      } else if (existing.operation !== operation) {
        throw new ConflictException('Idempotency key reused for a different operation');
      } else {
        throw new ConflictException('Request already processed with this idempotency key');
      }
    }

    const record = this.repo.create({
      key,
      operation,
      status: 'processing' as const,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    try {
      await this.repo.save(record);
    } catch (error) {
      // Duplicate key means concurrent request already created the record
      throw new ConflictException('Concurrent request with same idempotency key');
    }

    return next.handle().pipe(
      mergeMap(async (data) => {
        record.status = 'completed';
        await this.repo.save(record);
        return data;
      }),
      catchError(async (error) => {
        await this.repo.delete({ key });
        throw error;
      }),
    );
  }
}

@Module({
  imports: [
    forwardRef(() => UsersModule),
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
    TypeOrmModule.forFeature([RefreshToken, User, AuthIdempotencyKey]),
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
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthIdempotencyInterceptor,
    },
  ],
  controllers: [AuthController],
  exports: [AuthService, HashingProvider],
})
export class AuthModule {}
