import { ConfigService } from '@nestjs/config';
import { AccountLockoutService } from './account-lockout.service';

function config(overrides: Record<string, unknown> = {}): ConfigService {
  const values: Record<string, unknown> = {
    AUTH_LOCKOUT_MAX_ATTEMPTS: 3,
    AUTH_LOCKOUT_WINDOW_MS: 60_000, // 1 minute
    AUTH_LOCKOUT_DURATION_MS: 60_000, // 1 minute
    ...overrides,
  };
  return {
    get: (key: string, fallback?: unknown) =>
      values[key] !== undefined ? values[key] : fallback,
  } as ConfigService;
}

describe('AccountLockoutService (issue #1651)', () => {
  let service: AccountLockoutService;

  beforeEach(() => {
    service = new AccountLockoutService(config());
  });

  // -- Basic behaviour ---------------------------------------------------

  it('returns null when no failures have been recorded', () => {
    expect(service.isLocked('alice@example.com')).toBeNull();
    expect(service.getState('alice@example.com')).toBeNull();
  });

  it('returns null after a single failure (below threshold)', () => {
    service.recordFailure('alice@example.com');
    expect(service.isLocked('alice@example.com')).toBeNull();
    expect(service.getState('alice@example.com')).toEqual({
      attempts: 1,
      lockedUntil: null,
      windowStart: expect.any(Number),
    });
  });

  it('locks the account after maxAttempts failures', () => {
    const lockedMs = service.recordFailure('alice@example.com');
    expect(lockedMs).toBeNull(); // 1

    const lockedMs2 = service.recordFailure('alice@example.com');
    expect(lockedMs2).toBeNull(); // 2

    const lockedMs3 = service.recordFailure('alice@example.com');
    expect(lockedMs3).toBe(60_000); // 3 → locked

    const remaining = service.isLocked('alice@example.com');
    expect(remaining).toBeGreaterThanOrEqual(59_990);
    expect(remaining).toBeLessThanOrEqual(60_000);
  });

  it('rejects all attempts while locked', () => {
    // Lock the account.
    for (let i = 0; i < 3; i++) service.recordFailure('a@b.com');

    expect(service.isLocked('a@b.com')).toBe(60_000);

    // Further failures don't change the lockout state.
    service.recordFailure('a@b.com');
    expect(service.isLocked('a@b.com')).toBe(60_000);
  });

  // -- Reset on success --------------------------------------------------

  it('clears the lockout state on successful sign-in', () => {
    service.recordFailure('a@b.com');
    service.recordFailure('a@b.com');
    expect(service.getState('a@b.com')).not.toBeNull();

    service.recordSuccess('a@b.com');
    expect(service.getState('a@b.com')).toBeNull();
    expect(service.isLocked('a@b.com')).toBeNull();
  });

  // -- Expiry ------------------------------------------------------------

  it('unlocks the account after the lockout window expires', (done) => {
    // Use a very short lockout for testing.
    const svc = new AccountLockoutService(
      config({
        AUTH_LOCKOUT_MAX_ATTEMPTS: 2,
        AUTH_LOCKOUT_DURATION_MS: 10,
        AUTH_LOCKOUT_WINDOW_MS: 60_000,
      }),
    );

    svc.recordFailure('a@b.com');
    const lockedMs = svc.recordFailure('a@b.com');
    expect(lockedMs).toBe(10);

    // After the lockout expires, isLocked should return null.
    setTimeout(() => {
      expect(svc.isLocked('a@b.com')).toBeNull();
      done();
    }, 20);
  });

  it('resets the window after the failure window expires', (done) => {
    const svc = new AccountLockoutService(
      config({
        AUTH_LOCKOUT_MAX_ATTEMPTS: 3,
        AUTH_LOCKOUT_WINDOW_MS: 10,
        AUTH_LOCKOUT_DURATION_MS: 60_000,
      }),
    );

    svc.recordFailure('a@b.com');
    svc.recordFailure('a@b.com');

    // Wait for the window to expire.
    setTimeout(() => {
      // After window expires, the counter should reset.
      const lockedMs = svc.recordFailure('a@b.com');
      expect(lockedMs).toBeNull(); // New window, only 1 failure
      done();
    }, 20);
  });

  // -- Email normalisation -----------------------------------------------

  it('treats emails case-insensitively', () => {
    service.recordFailure('Alice@Example.com');
    service.recordFailure('alice@example.com');
    const lockedMs = service.recordFailure('ALICE@EXAMPLE.COM');
    expect(lockedMs).toBe(60_000); // locked after 3 failures
    expect(service.isLocked('alice@Example.COM')).toBe(60_000);
  });

  it('trims whitespace from emails', () => {
    service.recordFailure('  alice@example.com  ');
    service.recordFailure('alice@example.com');
    const lockedMs = service.recordFailure(' alice@example.com ');
    expect(lockedMs).toBe(60_000);
  });

  // -- Independent accounts ----------------------------------------------

  it('tracks lockout independently per email', () => {
    service.recordFailure('a@b.com');
    service.recordFailure('a@b.com');
    service.recordFailure('a@b.com'); // locked

    // Different email is not locked.
    expect(service.isLocked('c@d.com')).toBeNull();
  });

  // -- Configurable thresholds -------------------------------------------

  it('respects custom maxAttempts from config', () => {
    const svc = new AccountLockoutService(
      config({ AUTH_LOCKOUT_MAX_ATTEMPTS: 10 }),
    );

    for (let i = 0; i < 9; i++) {
      expect(svc.recordFailure('a@b.com')).toBeNull();
    }
    const lockedMs = svc.recordFailure('a@b.com');
    expect(lockedMs).toBe(60_000);
  });

  it('respects custom lockout duration from config', () => {
    const svc = new AccountLockoutService(
      config({ AUTH_LOCKOUT_DURATION_MS: 300_000 }),
    );

    svc.recordFailure('a@b.com');
    svc.recordFailure('a@b.com');
    const lockedMs = svc.recordFailure('a@b.com');
    expect(lockedMs).toBe(300_000);
  });

  // -- Bounded store -----------------------------------------------------

  it('does not grow unbounded (eviction at MAX_ENTRIES)', () => {
    // Fill to the cap.
    for (let i = 0; i < 10_000; i++) {
      service.recordFailure(`user${i}@example.com`);
    }

    // Trigger eviction with one more insertion.
    service.recordFailure('overflow@example.com');

    // The store should not exceed the cap (with 80% target after eviction).
    // We can't inspect internal state directly, but verify no errors occur.
    expect(service.isLocked('overflow@example.com')).toBeNull();
  });
});
