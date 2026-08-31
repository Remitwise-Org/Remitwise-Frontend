jest.mock('src/users/user.entity', () => ({ User: class User {} }), {
  virtual: true,
});
jest.mock('../entities/refresh-token.entity', () => ({
  RefreshToken: class RefreshToken {},
}));
jest.mock('./hashing', () => ({ HashingProvider: class HashingProvider {} }));
jest.mock('../config/jwt.config', () => ({ default: { KEY: 'jwt' } }), {
  virtual: true,
});

import { GenerateTokenProvider } from './token.provider';
import { RefreshToken } from '../entities/refresh-token.entity';

describe('GenerateTokenProvider', () => {
  let provider: GenerateTokenProvider;
  let jwtService: { signAsync: jest.Mock };
  let refreshTokenRepository: { save: jest.Mock };
  let hashingProvider: { hashPassword: jest.Mock };
  let cryptoProvider: {
    isEnabled: jest.Mock;
    encrypt: jest.Mock;
    decrypt: jest.Mock;
  };

  const jwtConfig = {
    secret: 'secret',
    audience: 'aud',
    issuer: 'iss',
    ttl: 360,
    Rttl: 7200,
  };

  beforeEach(() => {
    jwtService = {
      signAsync: jest.fn(
        async (payload, opts) =>
          `token:${payload.sub}:${opts.expiresIn}:${opts.audience}`,
      ),
    };
    refreshTokenRepository = { save: jest.fn(async (entity) => entity) };
    hashingProvider = { hashPassword: jest.fn(async () => 'token-hash') };
    cryptoProvider = {
      isEnabled: jest.fn(() => false),
      encrypt: jest.fn(async () => ({
        ciphertext: 'envelope',
        dekId: 'dek-1',
      })),
      decrypt: jest.fn(async () => 'plain'),
    };

    provider = new GenerateTokenProvider(
      jwtService as any,
      jwtConfig as any,
      refreshTokenRepository as any,
      hashingProvider as any,
      cryptoProvider as any,
    );
  });

  describe('SignToken', () => {
    it('signs the token with the user id, payload, and jwt config', async () => {
      const token = await provider.SignToken(1, 360, { email: 'a@b.com' });
      expect(jwtService.signAsync).toHaveBeenCalledWith(
        { sub: 1, email: 'a@b.com' },
        {
          secret: 'secret',
          audience: 'aud',
          issuer: 'iss',
          expiresIn: 360,
        },
      );
      expect(token).toBe('token:1:360:aud');
    });
  });

  describe('generateTokens', () => {
    it('mints access + refresh tokens and stores the refresh token', async () => {
      const user = { id: 5, email: 'a@b.com' } as any;

      await provider.generateTokens(user);

      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
      expect(hashingProvider.hashPassword).toHaveBeenCalled();
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 5,
          tokenHash: 'token-hash',
          revokedAt: null,
          encryptedData: null,
          dataEncryptionKeyId: null,
        }),
      );
      expect(cryptoProvider.encrypt).not.toHaveBeenCalled();
    });

    it('stores an encrypted copy of the refresh token when KEK is enabled (issue #631)', async () => {
      cryptoProvider.isEnabled.mockReturnValue(true);

      await provider.generateTokens({ id: 5, email: 'a@b.com' } as any);

      expect(cryptoProvider.encrypt).toHaveBeenCalledWith(expect.any(String), {
        dekId: undefined,
      });
      expect(refreshTokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          encryptedData: 'envelope',
          dataEncryptionKeyId: 'dek-1',
        }),
      );
    });

    // Regression (issue #1689): the orphaned assertion block below had lost
    // its `it(...)` header in a merge and made the whole suite fail to
    // compile. Restored as a real test: generateTokens must surface the token
    // pair plus the persisted row id so callers can reference the session.
    it('returns the token pair shape and the persisted refresh-token row id', async () => {
      refreshTokenRepository.save.mockImplementationOnce(async (entity) => ({
        id: 'row-1',
        ...entity,
      }));

      const result = await provider.generateTokens({
        id: 5,
        email: 'a@b.com',
      } as any);

      expect(result).toMatchObject({
        access_token: expect.stringContaining(':5'),
        refresh_token: expect.stringContaining(':5'),
        jti: expect.any(String),
        refreshTokenId: 'row-1',
      });
    });

    it('writes through the caller transaction manager when one is provided (issue #1689)', async () => {
      const managerSave = jest.fn(async (entity) => ({
        id: 'txn-row',
        ...entity,
      }));
      const manager = {
        getRepository: jest.fn(() => ({ save: managerSave })),
      };

      const result = await provider.generateTokens({ id: 5 } as any, {
        manager: manager as any,
      });

      expect(manager.getRepository).toHaveBeenCalledWith(RefreshToken);
      expect(managerSave).toHaveBeenCalledTimes(1);
      expect(refreshTokenRepository.save).not.toHaveBeenCalled();
      expect(result.refreshTokenId).toBe('txn-row');
    });
  });
});
