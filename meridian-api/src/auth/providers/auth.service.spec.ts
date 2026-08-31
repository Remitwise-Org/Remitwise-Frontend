jest.mock('src/users/user.entity', () => ({ User: class User {} }), {
  virtual: true,
});

import {
  BadRequestException,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { IdempotencyProvider } from './idempotency.provider';
jest.mock('../../audit/audit.service', () => ({
  AuditService: class AuditService {},
}));

describe('AuthService - idempotency boundary (issues #435 / #1689)', () => {
  let service: AuthService;
  let idempotency: IdempotencyProvider;
  let signInProviders: { SignIn: jest.Mock };
  let refreshTokenProvider: {
    refreshToken: jest.Mock;
    logout: jest.Mock;
    logoutAll: jest.Mock;
  };
  let verifyEmailProvider: {
    verifyEmail: jest.Mock;
    issueVerificationToken: jest.Mock;
  };
  let usersRepository: { findOne: jest.Mock };
  let auditService: { log: jest.Mock };

  const fakeUser: any = { id: 7, email: 'a@b.com' };

  beforeEach(() => {
    signInProviders = { SignIn: jest.fn() };
    refreshTokenProvider = {
      refreshToken: jest.fn(),
      logout: jest.fn(),
      logoutAll: jest.fn(),
    };
    verifyEmailProvider = {
      verifyEmail: jest.fn(),
      issueVerificationToken: jest.fn(),
    };
    usersRepository = { findOne: jest.fn() };
    auditService = { log: jest.fn(async () => undefined) };
    idempotency = new IdempotencyProvider({ ttlMs: 60_000 });

    service = new AuthService(
      signInProviders as any,
      refreshTokenProvider as any,
      verifyEmailProvider as any,
      usersRepository as any,
      auditService as any,
      idempotency,
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

    it('uses the token itself as an implicit idempotency key (replays, never re-consumes)', async () => {
      verifyEmailProvider.verifyEmail.mockResolvedValue(fakeUser);

      const first = await service.verifyEmail('raw');
      const replay = await service.verifyEmail('raw');

      expect(replay).toEqual(first);
      expect(verifyEmailProvider.verifyEmail).toHaveBeenCalledTimes(1);
    });

    it('does not alias distinct tokens onto each other', async () => {
      verifyEmailProvider.verifyEmail.mockResolvedValue(fakeUser);

      await service.verifyEmail('token-one');
      await service.verifyEmail('token-two');

      expect(verifyEmailProvider.verifyEmail).toHaveBeenCalledTimes(2);
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
      expect(verifyEmailProvider.issueVerificationToken).toHaveBeenCalledWith(
        fakeUser,
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'RESEND_VERIFICATION',
          entityId: fakeUser.id,
        }),
      );
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
      expect(verifyEmailProvider.issueVerificationToken).not.toHaveBeenCalled();
    });

    it('is idempotent with a request key and rejects conflicting reuse', async () => {
      usersRepository.findOne.mockResolvedValue(fakeUser);

      const first = await service.resendVerification(fakeUser.email, 'req-key');
      const second = await service.resendVerification(
        fakeUser.email,
        'req-key',
      );

      expect(first).toMatchObject({ status: 'ok' });
      expect(second).toMatchObject({ status: 'ok' });
      expect(usersRepository.findOne).toHaveBeenCalledTimes(1);

      await expect(
        service.resendVerification('other@example.com', 'req-key'),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('SignIn', () => {
    it('delegates to SignInProviders and is idempotent with a request key', async () => {
      const credentials = { email: 'a@b.com', password: 'x' } as any;
      const result = [{ token: 'abc' }, fakeUser];
      signInProviders.SignIn.mockResolvedValue(result);

      const first = await service.SignIn(credentials, 'req-key');
      const second = await service.SignIn(credentials, 'req-key');

      expect(first).toEqual(result);
      expect(second).toEqual(result);
      expect(signInProviders.SignIn).toHaveBeenCalledTimes(1);
    });

    it('rejects conflicting reuse of a request key with different credentials', async () => {
      signInProviders.SignIn.mockResolvedValueOnce([
        { token: 'first' },
        fakeUser,
      ]);
      await service.SignIn({ email: 'a@b.com' } as any, 'req-key');
      await expect(
        service.SignIn({ email: 'c@d.com' } as any, 'req-key'),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('executes every call when no key is supplied (back-compat)', async () => {
      signInProviders.SignIn.mockResolvedValue([{ token: 'x' }, fakeUser]);
      const dto = { email: 'a@b.com', password: 'x' } as any;

      await service.SignIn(dto);
      await service.SignIn(dto);

      expect(signInProviders.SignIn).toHaveBeenCalledTimes(2);
    });
  });

  describe('RefreshToken', () => {
    it('delegates to RefreshTokenProvider and is idempotent with a request key', async () => {
      const result = { access_token: 'new-a', refresh_token: 'new-r' };
      refreshTokenProvider.refreshToken.mockResolvedValue(result);
      const dto = { refreshToken: 'old-token' } as any;

      const first = await service.RefreshToken(dto, 'UA', 'req-key');
      const second = await service.RefreshToken(dto, 'UA', 'req-key');

      expect(first).toEqual(result);
      expect(second).toEqual(result);
      expect(refreshTokenProvider.refreshToken).toHaveBeenCalledTimes(1);
      expect(refreshTokenProvider.refreshToken).toHaveBeenCalledWith(dto, 'UA');
    });

    it('rejects conflicting reuse of a request key with a different token', async () => {
      refreshTokenProvider.refreshToken.mockResolvedValueOnce({
        access_token: 'new',
      });
      await service.RefreshToken(
        { refreshToken: 'old-token' } as any,
        'UA',
        'req-key',
      );
      await expect(
        service.RefreshToken(
          { refreshToken: 'other-token' } as any,
          'UA',
          'req-key',
        ),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('propagates provider rejection when a refresh token is replayed', async () => {
      refreshTokenProvider.refreshToken
        .mockResolvedValueOnce({ access_token: 'new' })
        .mockRejectedValueOnce(new UnauthorizedException('replay detected'));

      await service.RefreshToken(
        { refreshToken: 'same-token' } as any,
        'UA',
        'key-1',
      );
      await expect(
        service.RefreshToken(
          { refreshToken: 'same-token' } as any,
          'UA',
          'key-2',
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('forwards a failed operation for retry with the same key (retriable failures)', async () => {
      refreshTokenProvider.refreshToken
        .mockRejectedValueOnce(new Error('transient'))
        .mockResolvedValueOnce({ access_token: 'ok' });

      await expect(
        service.RefreshToken({ refreshToken: 't' } as any, 'UA', 'key-1'),
      ).rejects.toThrow('transient');

      const retried = await service.RefreshToken(
        { refreshToken: 't' } as any,
        'UA',
        'key-1',
      );
      expect(retried).toEqual({ access_token: 'ok' });
      expect(refreshTokenProvider.refreshToken).toHaveBeenCalledTimes(2);
    });
  });

  describe('logout', () => {
    it('delegates to RefreshTokenProvider.logout and is idempotent with a request key', async () => {
      refreshTokenProvider.logout.mockResolvedValue({
        message: 'Logged out successfully',
      });
      const dto = { refreshToken: 'token' } as any;

      const first = await service.logout(dto, 'req-key');
      const second = await service.logout(dto, 'req-key');

      expect(first).toEqual({ message: 'Logged out successfully' });
      expect(second).toEqual(first);
      expect(refreshTokenProvider.logout).toHaveBeenCalledTimes(1);
      expect(refreshTokenProvider.logout).toHaveBeenCalledWith(dto);
    });
  });

  describe('logoutAll', () => {
    it('delegates to RefreshTokenProvider.logoutAll and is idempotent with a request key', async () => {
      refreshTokenProvider.logoutAll.mockResolvedValue({
        message: 'All sessions revoked successfully',
      });

      const first = await service.logoutAll(7, 'req-key');
      const second = await service.logoutAll(7, 'req-key');

      expect(first).toEqual({ message: 'All sessions revoked successfully' });
      expect(second).toEqual(first);
      expect(refreshTokenProvider.logoutAll).toHaveBeenCalledTimes(1);
      expect(refreshTokenProvider.logoutAll).toHaveBeenCalledWith(7);
    });
  });

  describe('key validation', () => {
    it('rejects an oversized idempotency key with 400 before executing anything', async () => {
      const longKey = 'k'.repeat(256);

      await expect(
        service.SignIn({ email: 'a@b.com' } as any, longKey),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(signInProviders.SignIn).not.toHaveBeenCalled();
    });

    it('accepts a key at the maximum length', async () => {
      signInProviders.SignIn.mockResolvedValue([{ token: 'x' }, fakeUser]);

      await expect(
        service.SignIn({ email: 'a@b.com' } as any, 'k'.repeat(255)),
      ).resolves.toBeDefined();
    });

    it('treats an empty key as "no key" (back-compat)', async () => {
      signInProviders.SignIn.mockResolvedValue([{ token: 'x' }, fakeUser]);
      const dto = { email: 'a@b.com', password: 'x' } as any;

      await service.SignIn(dto, '');
      await service.SignIn(dto, '');

      expect(signInProviders.SignIn).toHaveBeenCalledTimes(2);
    });
  });
});
