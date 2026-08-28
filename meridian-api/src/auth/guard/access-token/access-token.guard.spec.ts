jest.mock('src/auth/config/jwt.config', () => ({ default: { KEY: 'jwt' } }), {
  virtual: true,
});
jest.mock(
  'src/auth/constant/auth-constant',
  () => ({ REQUEST_USER_KEY: 'user', AUTH_TYPE_kEY: 'authType' }),
  { virtual: true },
);

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AccessTokenGuard } from './access-token.guard';
import { REQUEST_USER_KEY } from 'src/auth/constant/auth-constant';

describe('AccessTokenGuard', () => {
  let guard: AccessTokenGuard;
  let jwtService: { verifyAsync: jest.Mock };
  const jwtConfig = { secret: 'secret', audience: 'aud', issuer: 'iss' };

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    guard = new AccessTokenGuard(jwtConfig as any, jwtService as any);
  });

  const buildContext = (
    headers: Record<string, string | undefined>,
  ): ExecutionContext => {
    const request = { headers };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any;
  };

  it('attaches the payload and allows the request when the token is valid', async () => {
    const ctx = buildContext({ authorization: 'Bearer valid' });
    const payload = { sub: 1, email: 'a@b.com' };
    jwtService.verifyAsync.mockResolvedValueOnce(payload);

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    const request = ctx.switchToHttp().getRequest<any>();
    expect(request[REQUEST_USER_KEY]).toEqual(payload);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid', jwtConfig);
  });

  it('throws UnauthorizedException when no token is provided', async () => {
    const ctx = buildContext({});
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when verification fails', async () => {
    const ctx = buildContext({ authorization: 'Bearer bogus' });
    jwtService.verifyAsync.mockRejectedValueOnce(new Error('invalid'));

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
