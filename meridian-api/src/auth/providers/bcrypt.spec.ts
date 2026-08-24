jest.mock(
  'src/auth/providers/hashing',
  () => ({ HashingProvider: class HashingProvider {} }),
  { virtual: true },
);

import { BcryptProvider } from './bcrypt';

describe('BcryptProvider', () => {
  let provider: BcryptProvider;

  beforeEach(() => {
    provider = new BcryptProvider();
  });

  describe('hashPassword', () => {
    it('produces a non-empty hash that differs from the input', async () => {
      const hash = await provider.hashPassword('plain-password');
      expect(typeof hash).toBe('string');
      expect(hash.length).toBeGreaterThan(10);
      expect(hash).not.toBe('plain-password');
    });
  });

  describe('comparePassword', () => {
    it('returns true when the input matches the hash', async () => {
      const hash = await provider.hashPassword('plain-password');
      await expect(
        provider.comparePassword('plain-password', hash),
      ).resolves.toBe(true);
    });

    it('returns false when the input does not match the hash', async () => {
      const hash = await provider.hashPassword('plain-password');
      await expect(provider.comparePassword('wrong', hash)).resolves.toBe(
        false,
      );
    });
  });
});
