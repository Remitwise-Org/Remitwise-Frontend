jest.mock('src/users/user.entity', () => ({ User: class User {} }), {
  virtual: true,
});
jest.mock(
  'src/users/providers/user.services',
  () => ({ UserService: class UserService {} }),
  { virtual: true },
);
jest.mock('../entities/refresh-token.entity', () => ({
  RefreshToken: class RefreshToken {},
}));
jest.mock('./hashing', () => ({ HashingProvider: class HashingProvider {} }));
jest.mock('./token.provider', () => ({
  GenerateTokenProvider: class GenerateTokenProvider {},
}));
jest.mock('../config/jwt.config', () => ({ default: { KEY: 'jwt' } }), {
  virtual: true,
});
jest.mock('../dto/refresh-token-dto', () => ({}), { virtual: true });
jest.mock('../../audit/audit.service', () => ({ AuditService: class AuditService {} }));

import { UnauthorizedException } from '@nestjs/common';
import { RefreshTokenProvider } from './refreshToken.provider';

describe('RefreshTokenProvider', () => {
  let provider: RefreshTokenProvider;
  let userService: { findOneId: jest.Mock };
  let jwtService: { verifyAsync: jest.Mock };
  let refreshTokenRepository: {
    findOne: jest.Mock;
    update: jest.Mock;
    save: jest.Mock;
  };
  let hashingProvider: {
    hashPassword: jest.Mock;
    comparePassword: jest.Mock;
  };
  let generateTokenProvider: { generateTokens: jest.Mock };
  let cryptoProvider: {
    isEnabled: jest.Mock;
    encrypt: jest.Mock;
    decrypt: jest.Mock;
  };
  let auditService: { log: jest.Mock };

  const jwtConfig = {
    secret: 'secret',
    audience: 'aud',
    issuer: 'iss',
    ttl: 360,
    Rttl: 7200,
  };

  const user = { id: 1, email: 'a@b.com' };
  const storedToken = {
    jti: 'jti-1',
    userId: user.id,
    tokenHash: 'hash',
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
  };

  beforeEach(() => {
    userService = { findOneId: jest.fn(async () => user) };
    jwtService = {
      verifyAsync: jest.fn(async () => ({
        sub: user.id,
        jti: storedToken.jti,
      })),
    };
    refreshTokenRepository = {
      findOne: jest.fn(async ({ where }) =>
        where.jti === storedToken.jti ? storedToken : null,
      ),
      update: jest.fn(async () => undefined),
      save: jest.fn(async (entity) => ({ id: 'new-id', ...entity })),
    };
    hashingProvider = {
      hashPassword: jest.fn(async () => 'hashed-new'),
      comparePassword: jest.fn(async () => true),
    };
    generateTokenProvider = {
      generateTokens: jest.fn(async () => ({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        jti: 'new-jti',
      })),
    };
    cryptoProvider = {
      isEnabled: jest.fn(() => false),
      encrypt: jest.fn(async () => ({
        ciphertext: 'envelope',
        dekId: 'dek-1',
      })),
      decrypt: jest.fn(async () => 'valid'),
    };
    auditService = { log: jest.fn(async () => undefined) };

    provider = new RefreshTokenProvider(
      userService as any,
      jwtService as any,
      jwtConfig as any,
      refreshTokenRepository as any,
      hashingProvider as any,
      generateTokenProvider as any,
      cryptoProvider as any,
      auditService as any,
    );
  });

  describe('refreshToken', () => {
    it('rotates refresh + access tokens on a valid request', async () => {
      const result = await provider.refreshToken({
        refreshToken: 'valid',
      } as any);

      expect(jwtService.verifyAsync).toHaveBeenCalled();
      expect(refreshTokenRepository.findOne).toHaveBeenCalledWith({
        where: { jti: storedToken.jti, userId: user.id },
      });
      expect(hashingProvider.comparePassword).toHaveBeenCalled();
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { jti: storedToken.jti, userId: user.id },
        { revokedAt: expect.any(Date) },
      );
      expect(refreshTokenRepository.save).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REFRESH', entityId: 'new-id' }),
      );
      expect(result).toEqual({
        access_token: 'new-access',
        refresh_token: 'new-refresh',
        refreshTokenId: 'new-id',
      });
    });

    it('throws UnauthorizedException when the stored token is revoked', async () => {
      refreshTokenRepository.findOne.mockResolvedValueOnce({
        ...storedToken,
        revokedAt: new Date(),
      });

      await expect(
        provider.refreshToken({ refreshToken: 'valid' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the stored token is expired', async () => {
      refreshTokenRepository.findOne.mockResolvedValueOnce({
        ...storedToken,
        expiresAt: new Date(Date.now() - 60_000),
      });

      await expect(
        provider.refreshToken({ refreshToken: 'valid' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when the token hash does not match', async () => {
      hashingProvider.comparePassword.mockResolvedValueOnce(false);

      await expect(
        provider.refreshToken({ refreshToken: 'valid' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('validates via the encrypted copy when present (issue #631)', async () => {
      cryptoProvider.isEnabled.mockReturnValue(true);
      refreshTokenRepository.findOne.mockResolvedValueOnce({
        ...storedToken,
        encryptedData: 'envelope',
        dataEncryptionKeyId: 'dek-1',
      });
      cryptoProvider.decrypt.mockResolvedValueOnce('valid');

      const result = await provider.refreshToken({
        refreshToken: 'valid',
      } as any);

      expect(cryptoProvider.decrypt).toHaveBeenCalledWith('envelope');
      expect(hashingProvider.comparePassword).not.toHaveBeenCalled();
      expect(result.access_token).toBe('new-access');
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          encryptedData: 'envelope',
          dataEncryptionKeyId: 'dek-1',
        }),
      );
    });

    it('falls back to the bcrypt hash when decryption fails (issue #631)', async () => {
      cryptoProvider.isEnabled.mockReturnValue(true);
      refreshTokenRepository.findOne.mockResolvedValueOnce({
        ...storedToken,
        encryptedData: 'envelope',
      });
      cryptoProvider.decrypt.mockRejectedValueOnce(new Error('bad tag'));

      const result = await provider.refreshToken({
        refreshToken: 'valid',
      } as any);

      expect(cryptoProvider.decrypt).toHaveBeenCalled();
      expect(hashingProvider.comparePassword).toHaveBeenCalled();
      expect(result.access_token).toBe('new-access');
    });

    it('throws UnauthorizedException when verification fails', async () => {
      jwtService.verifyAsync.mockRejectedValueOnce(new Error('bad token'));

      await expect(
        provider.refreshToken({ refreshToken: 'bad' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws UnauthorizedException when the payload sub is invalid', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce({
        sub: 'not-a-number',
        jti: 'x',
      });

      await expect(
        provider.refreshToken({ refreshToken: 'bad' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('revokes the stored refresh token on success', async () => {
      const result = await provider.logout({ refreshToken: 'valid' } as any);
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { jti: storedToken.jti, userId: user.id },
        { revokedAt: expect.any(Date) },
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGOUT', entityId: storedToken.jti }),
      );
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('throws UnauthorizedException when verification fails', async () => {
      jwtService.verifyAsync.mockRejectedValueOnce(new Error('expired'));
      await expect(
        provider.logout({ refreshToken: 'bad' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logoutAll', () => {
    it('revokes all non-revoked tokens for the user', async () => {
      const result = await provider.logoutAll(user.id);
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: user.id, revokedAt: null },
        { revokedAt: expect.any(Date) },
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'LOGOUT_ALL', performedById: user.id }),
      );
      expect(result).toEqual({ message: 'All sessions revoked successfully' });
    });
  });

  // -- Atomic rollback regression tests -----------------------------------

  describe('atomic rollback - refreshToken', () => {
    it('old token remains valid when new token generation fails', async () => {
      // Simulate failure during token generation (after validation, before save).
      generateTokenProvider.generateTokens.mockRejectedValueOnce(
        new Error('token generation failed'),
      );

      await expect(
        provider.refreshToken({ refreshToken: 'valid' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      // The old refresh token should NOT have been revoked — the old
      // token is still valid so the client can retry.
      expect(refreshTokenRepository.update).not.toHaveBeenCalled();
      // No new token should have been saved.
      expect(refreshTokenRepository.save).not.toHaveBeenCalled();
    });

    it('old token remains valid when new token save fails', async () => {
      // Simulate failure during database save (after generation, before revoke).
      refreshTokenRepository.save.mockRejectedValueOnce(
        new Error('database write failed'),
      );

      await expect(
        provider.refreshToken({ refreshToken: 'valid' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);

      // The old refresh token should NOT have been revoked.
      expect(refreshTokenRepository.update).not.toHaveBeenCalled();
    });

    it('audit failure does not prevent refresh from succeeding', async () => {
      // Audit service throws — but refresh should still succeed.
      auditService.log.mockRejectedValueOnce(new Error('audit db down'));

      const result = await provider.refreshToken({
        refreshToken: 'valid',
      } as any);

      // Refresh succeeded despite audit failure.
      expect(result.access_token).toBe('new-access');
      expect(result.refresh_token).toBe('new-refresh');
    });

    it('revocation happens AFTER new token is persisted (create-before-revoke)', async () => {
      const callOrder: string[] = [];

      refreshTokenRepository.save.mockImplementation(async () => {
        callOrder.push('save');
        return { id: 'new-id' };
      });

      refreshTokenRepository.update.mockImplementation(async () => {
        callOrder.push('revoke');
        return undefined;
      });

      await provider.refreshToken({ refreshToken: 'valid' } as any);

      // save (new token) must happen before revoke (old token).
      expect(callOrder).toEqual(['save', 'revoke']);
    });
  });

  describe('atomic rollback - logout', () => {
    it('audit failure does not prevent logout from succeeding', async () => {
      auditService.log.mockRejectedValueOnce(new Error('audit db down'));

      const result = await provider.logout({ refreshToken: 'valid' } as any);

      expect(result).toEqual({ message: 'Logged out successfully' });
      // The token was still revoked despite audit failure.
      expect(refreshTokenRepository.update).toHaveBeenCalled();
    });
  });

  describe('atomic rollback - logoutAll', () => {
    it('audit failure does not prevent logout-all from succeeding', async () => {
      auditService.log.mockRejectedValueOnce(new Error('audit db down'));

      const result = await provider.logoutAll(user.id);

      expect(result).toEqual({ message: 'All sessions revoked successfully' });
      // Tokens were still revoked despite audit failure.
      expect(refreshTokenRepository.update).toHaveBeenCalled();
    });
  });
});
