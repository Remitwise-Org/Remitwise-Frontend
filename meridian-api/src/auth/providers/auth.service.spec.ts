jest.mock('src/users/user.entity', () => ({ User: class User {} }), {
  virtual: true,
});

import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService - email verification (issue #435)', () => {
  let service: AuthService;
  let signInProviders: { SignIn: jest.Mock };
  let refreshTokenProvider: {
    refreshToken: jest.Mock;
    logout: jest.Mock;
    logoutAll: jest.Mock;
  };
  let verifyEmailProvider: { verifyEmail: jest.Mock };
  let usersRepository: { findOne: jest.Mock };

  const fakeUser: any = { id: 7, email: 'a@b.com' };

  beforeEach(() => {
    signInProviders = { SignIn: jest.fn() };
    refreshTokenProvider = {
      refreshToken: jest.fn(),
      logout: jest.fn(),
      logoutAll: jest.fn(),
    };
    verifyEmailProvider = { verifyEmail: jest.fn() };
    usersRepository = { findOne: jest.fn() };

    service = new AuthService(
      signInProviders as any,
      refreshTokenProvider as any,
      verifyEmailProvider as any,
      usersRepository as any,
    );
  });

  describe('verifyEmail', () => {
    it('delegates to VerifyEmailProvider and returns the verified user', async () => {
      verifyEmailProvider.verifyEmail.mockResolvedValueOnce(fakeUser);

      await expect(service.verifyEmail('raw')).resolves.toEqual(fakeUser);
      expect(verifyEmailProvider.verifyEmail).toHaveBeenCalledWith('raw');
    });

    it('propagates errors from VerifyEmailProvider', async () => {
      verifyEmailProvider.verifyEmail.mockRejectedValueOnce(
        new UnauthorizedException('bad'),
      );

      await expect(service.verifyEmail('bad')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('resendVerification', () => {
    it('returns an acknowledgement for an existing user', async () => {
      usersRepository.findOne.mockResolvedValueOnce(fakeUser);

      const result = await service.resendVerification(fakeUser.email);

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: { email: fakeUser.email },
        withDeleted: false,
      });
      expect(result).toMatchObject({ status: 'ok' });
    });

    it('returns the same acknowledgement for an unknown email (no enumeration)', async () => {
      usersRepository.findOne.mockResolvedValueOnce(null);

      const result = await service.resendVerification('ghost@example.com');

      expect(result).toMatchObject({ status: 'ok' });
    });

    it('returns the same acknowledgement for an already-verified user (idempotent)', async () => {
      usersRepository.findOne.mockResolvedValueOnce({
        ...fakeUser,
        emailVerified: true,
      });

      const result = await service.resendVerification(fakeUser.email);

      expect(result).toMatchObject({ status: 'ok' });
    });
  });
});
