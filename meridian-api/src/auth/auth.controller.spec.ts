import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, INestApplication } from '@nestjs/common';
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
import { AccessTokenGuard } from './guard/access-token/access-token.guard';
import { REQUEST_USER_KEY } from './constant/auth-constant';

describe('AuthController (integration)', () => {
  let app: INestApplication;
  let authService: {
    SignIn: jest.Mock;
    RefreshToken: jest.Mock;
    logout: jest.Mock;
    logoutAll: jest.Mock;
  };

  const buildMockGuard = (userPayload: { sub: number | string } | null) => {
    return {
      canActivate: (context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest();
        if (userPayload) {
          request[REQUEST_USER_KEY] = userPayload;
        }
        return true;
      },
    };
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
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(buildMockGuard({ sub: 42 }))
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
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
    );
  });

  it('POST /auth/refresh-token forwards the dto and user-agent', async () => {
    const dto = { refreshToken: 'token' };

    await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .set('user-agent', 'jest-suite')
      .send(dto)
      .expect(200)
      .expect((res) => {
        expect(res.body.access_token).toBe('new-a');
      });

    expect(authService.RefreshToken).toHaveBeenCalledWith(dto, 'jest-suite');
  });

  it('POST /auth/refresh-token uses undefined when the user-agent header is missing', async () => {
    const dto = { refreshToken: 'token' };

    await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .send(dto)
      .expect(200);

    expect(authService.RefreshToken).toHaveBeenCalledWith(dto, undefined);
  });

  it('POST /auth/logout forwards the dto', async () => {
    const dto = { refreshToken: 'token' };

    await request(app.getHttpServer())
      .post('/auth/logout')
      .send(dto)
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toBe('Logged out successfully');
      });

    expect(authService.logout).toHaveBeenCalledWith(dto);
  });

  it('POST /auth/logout-all extracts the user id from the request payload', async () => {
    await request(app.getHttpServer())
      .post('/auth/logout-all')
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toBe('All sessions revoked successfully');
      });

    expect(authService.logoutAll).toHaveBeenCalledWith(42);
  });

  it('POST /auth/logout-all returns 500 when the user payload has no numeric sub', async () => {
    await app.close();
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    })
      .overrideGuard(AccessTokenGuard)
      .useValue(buildMockGuard({ sub: 'not-a-number' }))
      .compile();
    app = moduleRef.createNestApplication();
    await app.init();

    await request(app.getHttpServer()).post('/auth/logout-all').expect(500);
  });
});
