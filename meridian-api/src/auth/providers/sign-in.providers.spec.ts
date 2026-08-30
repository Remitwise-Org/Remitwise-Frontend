jest.mock(
  'src/users/providers/user-auth.facade',
  () => ({ UserAuthFacade: class UserAuthFacade {} }),
  { virtual: true },
);
jest.mock(
  'src/users/providers/user.services',
  () => ({ UserService: class UserService {} }),
  { virtual: true },
);
jest.mock('src/DTO/signin-dto', () => ({}), { virtual: true });
jest.mock('./hashing', () => ({ HashingProvider: class HashingProvider {} }));
jest.mock('./token.provider', () => ({
  GenerateTokenProvider: class GenerateTokenProvider {},
}));
jest.mock('../config/jwt.config', () => ({ default: { KEY: 'jwt' } }), {
  virtual: true,
});
jest.mock('../../audit/audit.service', () => ({ AuditService: class AuditService {} }));
jest.mock('./account-lockout.service', () => ({
  AccountLockoutService: class AccountLockoutService {},
}));

import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  RequestTimeoutException,
  UnauthorizedException,
} from '@nestjs/common';
import { SignInProviders } from './sign-in.providers';
import { AccountLockoutService } from './account-lockout.service';

describe('SignInProviders', () => {
  let provider: SignInProviders;
  let userAuthFacade: { findUserByEmail: jest.Mock };
  let hashingProvider: { comparePassword: jest.Mock };
  let generateTokenProvider: { generateTokens: jest.Mock };
  let auditService: { log: jest.Mock };
  let lockoutService: {
    isLocked: jest.Mock;
    recordFailure: jest.Mock;
    recordSuccess: jest.Mock;
  };

  // Default mock user is verified so the pre-existing password-paths below
  // continue to pass after the 403 verification gate was added
  // (issue #435).
  const user = {
    id: 1,
    email: 'a@b.com',
    password: 'hashed',
    emailVerified: true,
  };

  beforeEach(() => {
    userAuthFacade = {
      findUserByEmail: jest.fn(async () => user),
    };
    hashingProvider = {
      comparePassword: jest.fn(async () => true),
    };
    generateTokenProvider = {
      generateTokens: jest.fn(async () => ({
        access_token: 'a',
        refresh_token: 'r',
        jti: 'j',
      })),
    };
    auditService = { log: jest.fn(async () => undefined) };
    lockoutService = {
      isLocked: jest.fn(() => null),
      recordFailure: jest.fn(() => null),
      recordSuccess: jest.fn(() => undefined),
    };

    provider = new SignInProviders(
      userAuthFacade as any,
      hashingProvider as any,
      generateTokenProvider as any,
      auditService as any,
      lockoutService as any,
    );
  });

  it('returns the tokens and user on successful sign-in', async () => {
    const tokens = await provider.SignIn({
      email: 'a@b.com',
      password: 'plain',
    } as any);

    expect(userAuthFacade.findUserByEmail).toHaveBeenCalledWith('a@b.com');
    expect(hashingProvider.comparePassword).toHaveBeenCalledWith(
      'plain',
      user.password,
    );
    expect(generateTokenProvider.generateTokens).toHaveBeenCalledWith(user);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SIGN_IN', entityId: user.id }),
    );
    expect(tokens).toEqual([
      { access_token: 'a', refresh_token: 'r', jti: 'j' },
      user,
    ]);
  });

  it('throws UnauthorizedException when the password does not match', async () => {
    hashingProvider.comparePassword.mockResolvedValueOnce(false);

    await expect(
      provider.SignIn({ email: 'a@b.com', password: 'wrong' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(generateTokenProvider.generateTokens).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  it('wraps hashing errors in a RequestTimeoutException', async () => {
    hashingProvider.comparePassword.mockRejectedValueOnce(new Error('boom'));

    await expect(
      provider.SignIn({ email: 'a@b.com', password: 'plain' } as any),
    ).rejects.toBeInstanceOf(RequestTimeoutException);
  });

  /**
   * Email verification gate (issue #435): the 403 path lets clients render
   * a "please verify first" message without leaking account-existence to
   * anyone who guessed a real password.
   */
  it('throws ForbiddenException (HTTP 403) when the email is not verified', async () => {
    userAuthFacade.findUserByEmail.mockResolvedValueOnce({
      ...user,
      emailVerified: false,
    });

    await expect(
      provider.SignIn({ email: 'a@b.com', password: 'plain' } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(generateTokenProvider.generateTokens).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });

  // -- Account lockout (issue #1651) --------------------------------------

  it('checks account lockout before querying the database', async () => {
    lockoutService.isLocked.mockReturnValueOnce(30_000);

    try {
      await provider.SignIn({ email: 'a@b.com', password: 'pw' } as any);
      fail('Expected HttpException to be thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
    // No DB query should happen when the account is locked.
    expect(userAuthFacade.findUserByEmail).not.toHaveBeenCalled();
    expect(generateTokenProvider.generateTokens).not.toHaveBeenCalled();
  });

  it('records a failed attempt when the password is wrong', async () => {
    hashingProvider.comparePassword.mockResolvedValueOnce(false);
    lockoutService.recordFailure.mockReturnValueOnce(null); // not yet locked

    await expect(
      provider.SignIn({ email: 'a@b.com', password: 'wrong' } as any),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(lockoutService.recordFailure).toHaveBeenCalledWith('a@b.com');
    expect(lockoutService.recordSuccess).not.toHaveBeenCalled();
  });

  it('throws 429 Too Many Requests when a failure triggers lockout', async () => {
    hashingProvider.comparePassword.mockResolvedValueOnce(false);
    lockoutService.recordFailure.mockReturnValueOnce(15 * 60 * 1000); // locked!

    try {
      await provider.SignIn({ email: 'a@b.com', password: 'wrong' } as any);
      fail('Expected HttpException to be thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(HttpException);
      expect((e as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
    expect(lockoutService.recordFailure).toHaveBeenCalledWith('a@b.com');
  });

  it('resets the lockout counter on successful sign-in', async () => {
    await provider.SignIn({ email: 'a@b.com', password: 'correct' } as any);
    expect(lockoutService.recordSuccess).toHaveBeenCalledWith('a@b.com');
  });
});
