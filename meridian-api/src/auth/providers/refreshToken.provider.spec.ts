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
jest.mock('../../audit/audit.service', () => ({
  AuditService: class AuditService {},
}));

import { UnauthorizedException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { RefreshTokenProvider } from './refreshToken.provider';

/**
 * Minimal transaction stub: runs the callback with a manager that delegates
 * to the mocked repository (findOne/update) and no-ops the advisory-lock
 * query. Contention behavior is covered in auth-race.spec.ts against the
 * in-memory store.
 */
function stubDataSource(repo: { findOne: jest.Mock; update: jest.Mock }) {
  const manager = {
    findOne: async (_target: unknown, options: unknown) =>
      repo.findOne(options),
    update: async (_target: unknown, criteria: unknown, patch: unknown) =>
      repo.update(criteria, patch),
    query: async () => ({ rows: [] }),
  };
  return {
    transaction: async (cb: (manager: unknown) => Promise<unknown>) =>
      cb(manager),
  };
}

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
      // CAS default: the presented token is live, so exactly one row matches.
      update: jest.fn(async () => ({ affected: 1 })),
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
        refreshTokenId: 'new-id',
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
      stubDataSource(refreshTokenRepository) as any,
    );
  });

  /** Criteria captured from the rotation's compare-and-set revoke. */
  const rotationCriteria = () =>
    refreshTokenRepository.update.mock.calls[
      refreshTokenRepository.update.mock.calls.length - 1
    ][0] as Record<string, any>;

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

      // The new pair is persisted by GenerateTokenProvider (inside the
      // transaction), then the old token is revoked by compare-and-set.
      expect(generateTokenProvider.generateTokens).toHaveBeenCalledWith(
        user,
        expect.objectContaining({ manager: expect.anything() }),
      );
      const criteria = rotationCriteria();
      expect(criteria.jti).toBe(storedToken.jti);
      expect(criteria.userId).toBe(user.id);
      // CAS guards: only a live (unrevoked, unexpired) row can be claimed.
      expect(criteria.revokedAt).toBeInstanceOf(Object);
      expect((criteria.revokedAt as any)._type).toBe('isNull');
      expect((criteria.expiresAt as any)._type).toBe('moreThan');

      expect(refreshTokenRepository.save).not.toHaveBeenCalled();
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

    it('throws UnauthorizedException when the compare-and-set loses the claim (issue #1689)', async () => {
      // Another request (or a logout) revoked the token between our read and
      // our write — zero rows match the CAS and the rotation must fail
      // deterministically WITHOUT revoking or leaving a new token behind.
      refreshTokenRepository.update.mockResolvedValueOnce({ affected: 0 });

      await expect(
        provider.refreshToken({ refreshToken: 'valid' } as any),
      ).rejects.toThrow('Refresh token has been revoked or expired');
      expect(auditService.log).not.toHaveBeenCalled();
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
      // The encrypted copy is persisted by GenerateTokenProvider.
      expect(generateTokenProvider.generateTokens).toHaveBeenCalled();
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
        expect.objectContaining({
          action: 'LOGOUT',
          entityId: storedToken.jti,
        }),
      );
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('stays idempotent when the token is already revoked (issue #1689)', async () => {
      // Zero affected rows (already revoked / unknown jti) is still a
      // successful logout — retried logouts must not fail.
      refreshTokenRepository.update.mockResolvedValueOnce({ affected: 0 });

      const result = await provider.logout({ refreshToken: 'valid' } as any);

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(refreshTokenRepository.update).toHaveBeenCalledTimes(1);
    });

    it('throws UnauthorizedException when verification fails', async () => {
      jwtService.verifyAsync.mockRejectedValueOnce(new Error('expired'));
      await expect(
        provider.logout({ refreshToken: 'bad' } as any),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('logoutAll', () => {
    it('revokes all non-revoked tokens for the user under the advisory lock', async () => {
      const result = await provider.logoutAll(user.id);
      expect(refreshTokenRepository.update).toHaveBeenCalledWith(
        { userId: user.id, revokedAt: IsNull() },
        { revokedAt: expect.any(Date) },
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGOUT_ALL',
          performedById: user.id,
        }),
      );
      expect(result).toEqual({ message: 'All sessions revoked successfully' });
    });
  });

  // -- Atomic rollback regression tests -----------------------------------
  //
  // Compatibility note (issue #1689): transient infrastructure failures now
  // propagate as 5xx instead of being masked as 401, so clients can tell
  // "token invalid — re-authenticate" from "infra hiccup — retry". The old
  // behavior wrapped every error in UnauthorizedException, which forced
  // legitimate users to re-login on a transient DB blip.

  describe('atomic rollback - refreshToken', () => {
    it('old token remains valid when new token generation fails', async () => {
      // Simulate failure during token generation (after validation, before
      // the CAS). The transaction rolls back — nothing was written.
      generateTokenProvider.generateTokens.mockRejectedValueOnce(
        new Error('token generation failed'),
      );

      await expect(
        provider.refreshToken({ refreshToken: 'valid' } as any),
      ).rejects.toThrow('token generation failed');

      // The old refresh token should NOT have been revoked — the old
      // token is still valid so the client can retry.
      expect(refreshTokenRepository.update).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('old token remains valid when new token persistence fails', async () => {
      // Simulate failure while persisting the new token row (inside
      // GenerateTokenProvider's transaction write).
      generateTokenProvider.generateTokens.mockRejectedValueOnce(
        new Error('database write failed'),
      );

      await expect(
        provider.refreshToken({ refreshToken: 'valid' } as any),
      ).rejects.toThrow('database write failed');

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

    it('persists the new token BEFORE revoking the old one (create-before-revoke)', async () => {
      const callOrder: string[] = [];

      generateTokenProvider.generateTokens.mockImplementationOnce(async () => {
        callOrder.push('save-new-token');
        return {
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          jti: 'new-jti',
          refreshTokenId: 'new-id',
        };
      });

      refreshTokenRepository.update.mockImplementation(async () => {
        callOrder.push('revoke-old-token');
        return { affected: 1 };
      });

      await provider.refreshToken({ refreshToken: 'valid' } as any);

      // The new pair must be persisted before the old token is revoked.
      expect(callOrder).toEqual(['save-new-token', 'revoke-old-token']);
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

  describe('MoreThan expiry guard sanity (issue #1689)', () => {
    it('builds a CAS window that excludes already-expired rows', async () => {
      await provider.refreshToken({ refreshToken: 'valid' } as any);

      const criteria = rotationCriteria();
      const guard = criteria.expiresAt as unknown as {
        _type: string;
        _value: Date;
      };
      expect(guard._type).toBe('moreThan');
      // The guard timestamp is "now" — a token whose expiry has passed can
      // never be claimed even if the read raced the clock.
      expect(guard._value.getTime()).toBeGreaterThan(Date.now() - 5_000);
    });
  });
});
