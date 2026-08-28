jest.mock('src/users/user.entity', () => ({ User: class User {} }), {
  virtual: true,
});

import { UnauthorizedException } from '@nestjs/common';
import { VerifyEmailProvider } from './verify-email.provider';
import { VerificationTokenProvider } from './verification-token.provider';

describe('VerifyEmailProvider (issue #435)', () => {
  let provider: VerifyEmailProvider;
  let usersRepository: {
    update: jest.Mock;
    find: jest.Mock;
  };
  let tokenProvider: {
    generate: jest.Mock;
    hash: jest.Mock;
    compare: jest.Mock;
  };
  let mailService: {
    VerificationEmail: jest.Mock;
  };
  let cryptoProvider: {
    isEnabled: jest.Mock;
    encrypt: jest.Mock;
    decrypt: jest.Mock;
  };

  const sampleUser: any = {
    id: 1,
    email: 'a@b.com',
    firstName: 'Ada',
    emailVerified: false,
    emailVerificationToken: 'hashed',
    emailVerificationExpires: new Date(Date.now() + 60_000),
  };

  beforeEach(() => {
    usersRepository = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      find: jest.fn(async () => [sampleUser]),
    };
    tokenProvider = {
      generate: jest.fn(() => 'raw-token'),
      hash: jest.fn(async () => 'hashed'),
      compare: jest.fn(async () => false),
    };
    mailService = {
      VerificationEmail: jest.fn().mockResolvedValue(undefined),
    };
    cryptoProvider = {
      isEnabled: jest.fn(() => false),
      encrypt: jest.fn(async () => ({
        ciphertext: 'envelope',
        dekId: 'dek-1',
      })),
      decrypt: jest.fn(async () => JSON.stringify({ verificationToken: 'raw-token' })),
    };

    provider = new VerifyEmailProvider(
      usersRepository as any,
      tokenProvider as any,
      mailService as any,
      cryptoProvider as any,
    );
  });

  describe('issueVerificationToken', () => {
    it('hashes the raw token, persists the hash and expiry, and sends the mail', async () => {
      await provider.issueVerificationToken(sampleUser);

      expect(tokenProvider.generate).toHaveBeenCalled();
      expect(tokenProvider.hash).toHaveBeenCalledWith('raw-token');
      expect(usersRepository.update).toHaveBeenCalledWith(
        sampleUser.id,
        expect.objectContaining({
          emailVerificationToken: 'hashed',
          emailVerified: false,
        }),
      );
      expect(
        usersRepository.update.mock.calls[0][1].emailVerificationExpires,
      ).toBeInstanceOf(Date);
      expect(mailService.VerificationEmail).toHaveBeenCalledWith(
        sampleUser,
        'raw-token',
        expect.any(Date),
      );
    });

    it('stores an encrypted copy of the raw token when KEK is enabled (issue #631)', async () => {
      cryptoProvider.isEnabled.mockReturnValue(true);

      await provider.issueVerificationToken(sampleUser);

      expect(cryptoProvider.encrypt).toHaveBeenCalledWith(
        JSON.stringify({ verificationToken: 'raw-token' }),
        { dekId: undefined },
      );
      expect(usersRepository.update).toHaveBeenCalledWith(
        sampleUser.id,
        expect.objectContaining({
          encryptedData: 'envelope',
          dataEncryptionKeyId: 'dek-1',
        }),
      );
    });

    it('does not persist plaintext when KEK is unavailable (issue #631)', async () => {
      await provider.issueVerificationToken(sampleUser);

      expect(cryptoProvider.encrypt).not.toHaveBeenCalled();
      expect(usersRepository.update).toHaveBeenCalledWith(
        sampleUser.id,
        expect.objectContaining({ encryptedData: null }),
      );
    });

    it('does NOT throw if mail send fails (logs only)', async () => {
      mailService.VerificationEmail.mockRejectedValueOnce(
        new Error('SMTP down'),
      );

      await expect(
        provider.issueVerificationToken(sampleUser),
      ).resolves.toBeUndefined();
    });
  });

  describe('verifyEmail', () => {
    it('returns the user and clears the token columns on match', async () => {
      tokenProvider.compare.mockResolvedValueOnce(true);

      const result = await provider.verifyEmail('raw-token');

      expect(result.id).toBe(sampleUser.id);
      expect(usersRepository.update).toHaveBeenCalledWith(sampleUser.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        encryptedData: null,
      });
    });

    it('matches via the decrypted envelope when the hash path misses (issue #631)', async () => {
      cryptoProvider.isEnabled.mockReturnValue(true);
      usersRepository.find.mockResolvedValueOnce([
        {
          ...sampleUser,
          encryptedData: 'envelope',
        },
      ]);
      cryptoProvider.decrypt.mockResolvedValueOnce(
        JSON.stringify({ verificationToken: 'raw-token' }),
      );

      const result = await provider.verifyEmail('raw-token');

      expect(cryptoProvider.decrypt).toHaveBeenCalledWith('envelope');
      expect(result.id).toBe(sampleUser.id);
      expect(usersRepository.update).toHaveBeenCalledWith(sampleUser.id, {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        encryptedData: null,
      });
    });

    it('treats a token as invalid when decryption fails', async () => {
      cryptoProvider.isEnabled.mockReturnValue(true);
      usersRepository.find.mockResolvedValueOnce([
        {
          ...sampleUser,
          encryptedData: 'envelope',
        },
      ]);
      cryptoProvider.decrypt.mockRejectedValueOnce(new Error('bad tag'));

      await expect(provider.verifyEmail('raw-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(usersRepository.update).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when no candidate user matches', async () => {
      tokenProvider.compare.mockResolvedValue(false);

      await expect(provider.verifyEmail('wrong-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(usersRepository.update).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException for empty input', async () => {
      await expect(provider.verifyEmail('')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
