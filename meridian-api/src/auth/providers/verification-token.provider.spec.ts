import { BcryptVerificationTokenProvider } from './verification-token.provider';

describe('BcryptVerificationTokenProvider (issue #435)', () => {
  let provider: BcryptVerificationTokenProvider;

  beforeEach(() => {
    provider = new BcryptVerificationTokenProvider();
  });

  describe('generate', () => {
    it('returns a 64-character hex string', () => {
      const token = provider.generate();
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it('returns a different token on each call', () => {
      const a = provider.generate();
      const b = provider.generate();
      expect(a).not.toEqual(b);
    });
  });

  describe('hash + compare', () => {
    it('hashes a raw token and verifies it round-trip', async () => {
      const raw = provider.generate();
      const hashed = await provider.hash(raw);
      expect(hashed).not.toEqual(raw);
      // bcrypt output is always 60 chars regardless of input length, and
      // matches the bcrypt modular crypt format.
      expect(hashed.length).toBe(60);
      expect(hashed).toMatch(/^\$2[aby]\$\d{2}\$/);
      expect(await provider.compare(raw, hashed)).toBe(true);
    });

    it('returns false when comparing against a different raw token', async () => {
      const raw = provider.generate();
      const other = provider.generate();
      const hashed = await provider.hash(raw);
      expect(await provider.compare(other, hashed)).toBe(false);
    });
  });
});
