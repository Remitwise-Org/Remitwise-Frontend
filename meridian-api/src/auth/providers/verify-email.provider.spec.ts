jest.mock('src/users/user.entity', () => ({ User: class User {} }), {
  virtual: true,
});

import { UnauthorizedException } from '@nestjs/common';
import { VerifyEmailProvider } from './verify-email.provider';
jest.mock('../../audit/audit.service', () => ({
  AuditService: class AuditService {},
}));

describe('VerifyEmailProvider (issue #435)', () => {
  let provider: VerifyEmailProvider;
  let usersRepository: {
    update: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
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
  let auditService: { log: jest.Mock };

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
      findOne: jest.fn(async () => sampleUser),
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
      decrypt: jest.fn(async () =>
        JSON.stringify({ verificationToken: 'raw-token' }),
      ),
    };
    auditService = { log: jest.fn(async () => undefined) };

    provider = new VerifyEmailProvider(
      usersRepository as any,
      tokenProvider as any,
      mailService as any,
      cryptoProvider as any,
      auditService as any,
    );
  });

  describe('issueVerificationToken', () => {
    it('hashes the raw token, persists the hash and expiry, and sends the mail', async () => {
      await provider.issueVerificationToken(sampleUser);

      expect(tokenProvider.generate).toHaveBeenCalled();
      expect(tokenProvider.hash).toHaveBeenCalledWith('raw-token');
      // Compare-and-set: the token is only armed while the account is still
      // unverified (issue #1689).
      expect(usersRepository.update).toHaveBeenCalledWith(
        { id: sampleUser.id, emailVerified: false },
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
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ISSUE_VERIFICATION_TOKEN',
          entityId: sampleUser.id,
        }),
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
        { id: sampleUser.id, emailVerified: false },
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
        { id: sampleUser.id, emailVerified: false },
        expect.objectContaining({ encryptedData: null }),
      );
    });

    it('skips arming, mailing, and auditing when the account was verified concurrently (issue #1689)', async () => {
      // The compare-and-set matches zero rows because another request
      // verified the account between our read and our write.
      usersRepository.update.mockResolvedValueOnce({ affected: 0 });

      await provider.issueVerificationToken(sampleUser);

      expect(usersRepository.update).toHaveBeenCalledTimes(1);
      expect(mailService.VerificationEmail).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
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
      // Compare-and-set consume (issue #1689): the flip only happens while
      // the row still carries exactly the token material that was matched.
      expect(usersRepository.update).toHaveBeenCalledWith(
        {
          id: sampleUser.id,
          emailVerified: false,
          emailVerificationToken: 'hashed',
        },
        {
          emailVerified: true,
          role: 'verified_user',
          emailVerificationToken: null,
          emailVerificationExpires: null,
          encryptedData: null,
        },
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'VERIFY_EMAIL',
          entityId: sampleUser.id,
        }),
      );
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
      expect(usersRepository.update).toHaveBeenCalledWith(
        {
          id: sampleUser.id,
          emailVerified: false,
          emailVerificationToken: 'hashed',
          encryptedData: 'envelope',
        },
        {
          emailVerified: true,
          role: 'verified_user',
          emailVerificationToken: null,
          emailVerificationExpires: null,
          encryptedData: null,
        },
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'VERIFY_EMAIL',
          entityId: sampleUser.id,
        }),
      );
    });

    it('returns the already-verified row when a concurrent request consumed the token first (issue #1689)', async () => {
      // This request held a genuinely matching token but lost the
      // compare-and-set — the caller's intent is already satisfied, so the
      // outcome is an idempotent success with no second state change.
      tokenProvider.compare.mockResolvedValueOnce(true);
      usersRepository.update.mockResolvedValueOnce({ affected: 0 });
      usersRepository.findOne.mockResolvedValueOnce({
        ...sampleUser,
        emailVerified: true,
        role: 'verified_user',
        emailVerificationToken: null,
        emailVerificationExpires: null,
      });

      const result = await provider.verifyEmail('raw-token');

      expect(result.emailVerified).toBe(true);
      // Exactly one update attempt, no duplicate audit entry.
      expect(usersRepository.update).toHaveBeenCalledTimes(1);
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('rejects when the token was superseded by a resend mid-flight (issue #1689)', async () => {
      // The compare-and-set misses because the stored token changed between
      // our read and our write, and the account is still unverified — the
      // presented token must NOT consume the newer one.
      tokenProvider.compare.mockResolvedValueOnce(true);
      usersRepository.update.mockResolvedValueOnce({ affected: 0 });
      usersRepository.findOne.mockResolvedValueOnce({
        ...sampleUser,
        emailVerificationToken: 'hashed-newer-token',
      });

      await expect(provider.verifyEmail('raw-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(auditService.log).not.toHaveBeenCalled();
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
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when no candidate user matches', async () => {
      tokenProvider.compare.mockResolvedValue(false);

      await expect(provider.verifyEmail('wrong-token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(usersRepository.update).not.toHaveBeenCalled();
      expect(auditService.log).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException for empty input', async () => {
      await expect(provider.verifyEmail('')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });
});
