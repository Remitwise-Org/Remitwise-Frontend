import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import * as request from 'supertest';

jest.mock('./providers/auth.service', () => ({
  AuthService: class AuthService {},
}));
jest.mock('./providers/bcrypt', () => ({}));
jest.mock('./providers/hashing', () => ({
  HashingProvider: class HashingProvider {},
}));
jest.mock('./providers/sign-in.providers', () => ({
  SignInProviders: class SignInProviders {},
}));
jest.mock('./providers/token.provider', () => ({
  GenerateTokenProvider: class GenerateTokenProvider {},
}));
jest.mock('./providers/refreshToken.provider', () => ({
  RefreshTokenProvider: class RefreshTokenProvider {},
}));
jest.mock('./entities/refresh-token.entity', () => ({
  RefreshToken: class RefreshToken {},
}));
jest.mock('src/auth/config/jwt.config', () => ({ default: { KEY: 'jwt' } }), {
  virtual: true,
});
jest.mock(
  'src/auth/constant/auth-constant',
  () => ({ REQUEST_USER_KEY: 'user', AUTH_TYPE_kEY: 'authType' }),
  { virtual: true },
);
jest.mock('src/users/user.entity', () => ({ User: class User {} }), {
  virtual: true,
});
jest.mock('src/DTO/signin-dto', () => ({}), { virtual: true });
jest.mock('src/users/providers/user-auth.facade', () => ({}), {
  virtual: true,
});
jest.mock('src/users/providers/user.services', () => ({}), { virtual: true });

import { AuthController } from './auth.controller';
import { AuthService } from './providers/auth.service';
import { REQUEST_USER_KEY } from './constant/auth-constant';

describe('AuthController (integration)', () => {
  let app: INestApplication;
  let authService: {
    SignIn: jest.Mock;
    RefreshToken: jest.Mock;
    logout: jest.Mock;
    logoutAll: jest.Mock;
    verifyEmail: jest.Mock;
    resendVerification: jest.Mock;
  };

  /**
   * Emulates the production global guard: authenticates the request and
   * attaches the caller payload. (`overrideGuard` alone has no effect here
   * because /auth/logout-all is protected by the APP_GUARD registered in
   * AppModule, not by a route-level guard — see issue #1689 notes.)
   */
  const globalGuardStub = (userPayload: { sub: number | string } | null) => ({
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      if (userPayload) {
        req[REQUEST_USER_KEY] = userPayload;
      }
      return true;
    },
  });

  const buildApp = async (
    userPayload: { sub: number | string } | null = { sub: 42 },
  ) => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    const application = moduleRef.createNestApplication();
    // /auth/logout-all is protected by the global APP_GUARD in production;
    // register the stub the same way so it actually runs for every route.
    application.useGlobalGuards(globalGuardStub(userPayload) as any);
    await application.init();
    return application;
  };

  beforeEach(async () => {
    authService = {
      SignIn: jest.fn(async () => ({
        access_token: 'a',
        refresh_token: 'r',
      })),
      RefreshToken: jest.fn(async () => ({
        access_token: 'new-a',
        refresh_token: 'new-r',
      })),
      logout: jest.fn(async () => ({ message: 'Logged out successfully' })),
      logoutAll: jest.fn(async () => ({
        message: 'All sessions revoked successfully',
      })),
      verifyEmail: jest.fn(async () => ({
        email: 'a@b.com',
        emailVerified: true,
      })),
      resendVerification: jest.fn(async () => ({ status: 'ok' })),
    };

    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  it('POST /auth/sign-in forwards the dto to AuthService', async () => {
    const dto = { email: 'a@b.com', password: 'pw' };

    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .send(dto)
      .expect(200)
      .expect((res) => {
        expect(res.body.access_token).toBe('a');
      });

    expect(authService.SignIn).toHaveBeenCalledWith(
      expect.objectContaining(dto),
      undefined,
    );
  });

  it('POST /auth/sign-in forwards the Idempotency-Key header (issue #1689)', async () => {
    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .set('Idempotency-Key', 'client-key-1')
      .send({ email: 'a@b.com', password: 'pw' })
      .expect(200);

    expect(authService.SignIn).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'a@b.com' }),
      'client-key-1',
    );
  });

  it('POST /auth/sign-in accepts the X-Idempotency-Key alias', async () => {
    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .set('X-Idempotency-Key', 'alias-key')
      .send({ email: 'a@b.com', password: 'pw' })
      .expect(200);

    expect(authService.SignIn).toHaveBeenCalledWith(
      expect.anything(),
      'alias-key',
    );
  });

  it('POST /auth/sign-in returns 400 for an empty Idempotency-Key', async () => {
    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .set('Idempotency-Key', '   ')
      .send({ email: 'a@b.com', password: 'pw' })
      .expect(400);

    expect(authService.SignIn).not.toHaveBeenCalled();
  });

  it('POST /auth/sign-in returns 400 for an oversized Idempotency-Key', async () => {
    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .set('Idempotency-Key', 'k'.repeat(256))
      .send({ email: 'a@b.com', password: 'pw' })
      .expect(400);

    expect(authService.SignIn).not.toHaveBeenCalled();
  });

  it('POST /auth/sign-in surfaces a 409 conflict from the service as 409', async () => {
    authService.SignIn.mockRejectedValueOnce(
      new ConflictException(
        'Idempotency key used with a different request payload',
      ),
    );

    await request(app.getHttpServer())
      .post('/auth/sign-in')
      .set('Idempotency-Key', 'client-key-1')
      .send({ email: 'a@b.com', password: 'pw' })
      .expect(409)
      .expect((res) => {
        expect(res.body.message).toBe(
          'Idempotency key used with a different request payload',
        );
      });
  });

  it('POST /auth/refresh-token forwards the dto, user-agent, and idempotency key', async () => {
    const dto = { refreshToken: 'token' };

    await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .set('user-agent', 'jest-suite')
      .set('Idempotency-Key', 'client-key-1')
      .send(dto)
      .expect(200)
      .expect((res) => {
        expect(res.body.access_token).toBe('new-a');
      });

    expect(authService.RefreshToken).toHaveBeenCalledWith(
      dto,
      'jest-suite',
      'client-key-1',
    );
  });

  it('POST /auth/refresh-token uses undefined when optional headers are missing', async () => {
    const dto = { refreshToken: 'token' };

    await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .send(dto)
      .expect(200);

    expect(authService.RefreshToken).toHaveBeenCalledWith(
      dto,
      undefined,
      undefined,
    );
  });

  it('POST /auth/refresh-token maps the deterministic replay rejection to 401', async () => {
    authService.RefreshToken.mockRejectedValueOnce(
      new UnauthorizedException('Refresh token has been revoked or expired'),
    );

    await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .send({ refreshToken: 'consumed' })
      .expect(401)
      .expect((res) => {
        expect(res.body.message).toBe(
          'Refresh token has been revoked or expired',
        );
      });
  });

  it('POST /auth/logout forwards the dto and idempotency key', async () => {
    const dto = { refreshToken: 'token' };

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Idempotency-Key', 'logout-key-1')
      .send(dto)
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toBe('Logged out successfully');
      });

    expect(authService.logout).toHaveBeenCalledWith(dto, 'logout-key-1');
  });

  it('POST /auth/logout-all extracts the user id from the request payload', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout-all')
      .set('Idempotency-Key', 'all-key-1')
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toBe('All sessions revoked successfully');
      });

    expect(authService.logoutAll).toHaveBeenCalledWith(42, 'all-key-1');
  });

  it('POST /auth/logout-all returns 400 when the user payload has no numeric sub', async () => {
    await app.close();
    app = await buildApp({ sub: 'not-a-number' });

    await request(app.getHttpServer()).post('/auth/logout-all').expect(400);
    expect(authService.logoutAll).not.toHaveBeenCalled();
  });

  it('POST /auth/verify-email verifies implicitly (no idempotency header required)', async () => {
    authService.verifyEmail.mockResolvedValueOnce({
      email: 'a@b.com',
      emailVerified: true,
    });

    await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: 't'.repeat(32) })
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ verified: true, email: 'a@b.com' });
      });

    expect(authService.verifyEmail).toHaveBeenCalledWith('t'.repeat(32));
  });

  it('POST /auth/resend-verification forwards the email and idempotency key', async () => {
    await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .set('Idempotency-Key', 'resend-key-1')
      .send({ email: 'a@b.com' })
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
      });

    expect(authService.resendVerification).toHaveBeenCalledWith(
      'a@b.com',
      'resend-key-1',
    );
  });
});
