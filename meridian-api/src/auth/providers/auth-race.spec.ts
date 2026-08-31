/**
 * Deterministic contention tests for the auth flows (issue #1689).
 *
 * This suite proves the concurrency invariants of sign-in, refresh,
 * verification, logout and recovery-resend at the persistence boundary:
 * the REAL RefreshTokenProvider / GenerateTokenProvider / VerifyEmailProvider
 * / AuthService / IdempotencyProvider run against an in-memory store whose
 * UPDATE semantics (affected-row compare-and-set), transaction visibility
 * and advisory locks mirror the production PostgreSQL behavior the
 * implementation relies on.
 *
 * Every test ends with FINAL-STATE assertions on the tables — not just
 * "an error was (not) thrown".
 *
 * Interleavings are orchestrated with explicit deferred promises; there are
 * no sleeps or timing races, so failures are deterministic.
 */
import 'reflect-metadata';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { RefreshTokenProvider } from './refreshToken.provider';
import { GenerateTokenProvider } from './token.provider';
import { VerifyEmailProvider } from './verify-email.provider';
import { AuthService } from './auth.service';
import { IdempotencyProvider } from './idempotency.provider';
import { RefreshToken } from '../entities/refresh-token.entity';
import {
  defer,
  InMemoryDataSource,
  InMemoryRepository,
  InMemoryTable,
  tick,
} from '../testing/in-memory-auth-store';

// ---------------------------------------------------------------------------
// Fixtures: fast, deterministic doubles for the collaborators that are NOT
// under test (JWT signing, bcrypt, mail, audit sink).
// ---------------------------------------------------------------------------

const USER = { id: 7, email: 'racer@example.com', dataEncryptionKeyId: null };

/** Deterministic "JWT": base64 JSON. sign/verify round-trip without crypto. */
const jwtService = {
  signAsync: async (payload: Record<string, unknown>) =>
    Buffer.from(JSON.stringify(payload)).toString('base64url'),
  verifyAsync: async (token: string) =>
    JSON.parse(Buffer.from(token, 'base64url').toString('utf8')),
};

const jwtConfig = {
  secret: 's',
  audience: 'a',
  issuer: 'i',
  ttl: 360,
  Rttl: 7200,
};

const hashingProvider = {
  hashPassword: jest.fn(async (value: string) => `h:${value}`),
  comparePassword: jest.fn(
    async (raw: string, stored: string) => `h:${raw}` === stored,
  ),
};

const cryptoProvider = {
  isEnabled: () => false,
  encrypt: async () => ({ ciphertext: 'env', dekId: 'dek' }),
  decrypt: async () => {
    throw new Error('not enabled');
  },
};

const tokenProvider = {
  generate: () => 'tok-' + Math.random().toString(36).slice(2),
  hash: async (raw: string) => `h:${raw}`,
  compare: jest.fn(
    async (raw: string, stored: string) => `h:${raw}` === stored,
  ),
};

const mailService = { VerificationEmail: jest.fn(async () => undefined) };
const auditService = { log: jest.fn(async () => undefined) };
const userService = { findOneId: jest.fn(async () => USER) };
const signInProviders = { SignIn: jest.fn() };

// ---------------------------------------------------------------------------
// World: fresh tables + providers per test.
// ---------------------------------------------------------------------------

function buildWorld() {
  const refreshTokenTable = new InMemoryTable<any>();
  const userTable = new InMemoryTable<any>();

  const tables = new Map<new () => unknown, InMemoryTable<any>>();
  tables.set(RefreshToken, refreshTokenTable);

  const dataSource = new InMemoryDataSource(tables);
  const refreshTokenRepository = new InMemoryRepository<any>(refreshTokenTable);
  const usersRepository = new InMemoryRepository<any>(userTable);

  const generateTokenProvider = new GenerateTokenProvider(
    jwtService as any,
    jwtConfig as any,
    refreshTokenRepository as any,
    hashingProvider as any,
    cryptoProvider as any,
  );

  const refreshTokenProvider = new RefreshTokenProvider(
    userService as any,
    jwtService as any,
    jwtConfig as any,
    refreshTokenRepository as any,
    hashingProvider as any,
    generateTokenProvider as any,
    cryptoProvider as any,
    auditService as any,
    dataSource as any,
  );

  const verifyEmailProvider = new VerifyEmailProvider(
    usersRepository as any,
    tokenProvider as any,
    mailService as any,
    cryptoProvider as any,
    auditService as any,
  );

  const idempotency = new IdempotencyProvider({ ttlMs: 5 * 60_000 });
  const authService = new AuthService(
    signInProviders as any,
    refreshTokenProvider as any,
    verifyEmailProvider as any,
    usersRepository as any,
    auditService as any,
    idempotency,
  );

  /** A signed refresh token + its persisted (live) row. */
  const seedSession = (overrides: Record<string, unknown> = {}) => {
    const jti = `jti-${Math.random().toString(36).slice(2)}`;
    const raw = Buffer.from(JSON.stringify({ sub: USER.id, jti })).toString(
      'base64url',
    );
    refreshTokenTable.insert({
      jti,
      userId: USER.id,
      tokenHash: `h:${raw}`,
      expiresAt: new Date(Date.now() + 3600_000),
      revokedAt: null,
      userAgent: null,
      encryptedData: null,
      dataEncryptionKeyId: null,
      ...overrides,
    });
    return { jti, raw };
  };

  const liveRows = () =>
    refreshTokenTable.rows.filter(
      (row) => row.revokedAt === null && row.expiresAt > new Date(),
    );

  const revokedRows = () =>
    refreshTokenTable.rows.filter((row) => row.revokedAt !== null);

  return {
    refreshTokenTable,
    userTable,
    seedSession,
    liveRows,
    revokedRows,
    refreshTokenProvider,
    refreshTokenRepository,
    usersRepository,
    authService,
    verifyEmailProvider,
    dataSource,
  };
}

// Reset call counts between tests but keep identity (providers close over them).
beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// I1 — at most one live descendant per refresh token
// ---------------------------------------------------------------------------

describe('race: concurrent refresh with the same token (I1)', () => {
  it('exactly one of N parallel rotations succeeds; losers get a deterministic 401 and leave no rows', async () => {
    const world = buildWorld();
    const { raw } = world.seedSession();

    const attempts = await Promise.allSettled(
      Array.from({ length: 8 }, () =>
        world.refreshTokenProvider.refreshToken({ refreshToken: raw }),
      ),
    );

    const fulfilled = attempts.filter((r) => r.status === 'fulfilled');
    const rejected = attempts.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(7);
    for (const result of rejected) {
      expect((result as PromiseRejectedResult).reason).toBeInstanceOf(
        UnauthorizedException,
      );
      expect((result as PromiseRejectedResult).reason.message).toBe(
        'Refresh token has been revoked or expired',
      );
    }

    // FINAL STATE: exactly one new live row, the presented token revoked,
    // and NO orphan rows minted by the losers.
    expect(world.liveRows()).toHaveLength(1);
    expect(world.revokedRows()).toHaveLength(1);
    expect(world.refreshTokenTable.rows).toHaveLength(2);

    // The winner's refresh token is the live row.
    const winner = (fulfilled[0] as PromiseFulfilledResult<any>).value;
    expect(world.liveRows()[0].tokenHash).toBe(`h:${winner.refresh_token}`);
  });

  it('the loser blocks on the per-user lock while the winner is uncommitted, then observes the revocation', async () => {
    const world = buildWorld();
    const { raw } = world.seedSession();

    // Pause the winner just before COMMIT (new row written, old claimed,
    // both still invisible to other transactions).
    const commitGate = defer<void>();
    world.dataSource.hooks.beforeCommit = () => commitGate.promise;

    const winner = world.refreshTokenProvider.refreshToken({
      refreshToken: raw,
    });
    await tick(20); // let the winner reach the commit gate

    // The loser arrives while the winner's transaction is uncommitted.
    const loser = world.refreshTokenProvider.refreshToken({
      refreshToken: raw,
    });
    await tick(20);

    // The loser is still parked on the advisory lock — deterministically,
    // not by timing: it cannot have finished because the winner holds the
    // lock and has not committed.
    let loserSettled = false;
    void loser.then(
      () => (loserSettled = true),
      () => (loserSettled = true),
    );
    await tick(20);
    expect(loserSettled).toBe(false);

    commitGate.resolve();
    world.dataSource.hooks.beforeCommit = undefined;
    await expect(winner).resolves.toBeDefined();
    await expect(loser).rejects.toThrow(
      'Refresh token has been revoked or expired',
    );

    expect(world.liveRows()).toHaveLength(1);
    expect(world.refreshTokenTable.rows).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// I2 — failures leave the old token usable (rollback)
// ---------------------------------------------------------------------------

describe('race: rotation failures roll back completely (I2)', () => {
  it('a transient failure mid-rotation leaves the old token LIVE and retryable', async () => {
    const world = buildWorld();
    const { raw } = world.seedSession();

    hashingProvider.hashPassword.mockRejectedValueOnce(
      new Error('transient db error'),
    );

    await expect(
      world.refreshTokenProvider.refreshToken({ refreshToken: raw }),
    ).rejects.toThrow('transient db error');

    // FINAL STATE: nothing written, the old token is still the only live row.
    expect(world.refreshTokenTable.rows).toHaveLength(1);
    expect(world.liveRows()).toHaveLength(1);
    expect(world.revokedRows()).toHaveLength(0);

    // The client retry contract: the same token must still work.
    hashingProvider.hashPassword.mockClear();
    const retried = await world.refreshTokenProvider.refreshToken({
      refreshToken: raw,
    });
    expect(retried.access_token).toBeDefined();
    expect(world.liveRows()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// I3 — logoutAll serializes against in-flight rotations
// ---------------------------------------------------------------------------

describe('race: logoutAll vs concurrent refresh (I3)', () => {
  it('logoutAll that starts while a rotation is uncommitted still revokes the fresh token (no write-skew)', async () => {
    const world = buildWorld();
    const { raw } = world.seedSession();

    // Hold the rotation just before commit.
    const commitGate = defer<void>();
    world.dataSource.hooks.beforeCommit = () => commitGate.promise;

    const rotation = world.refreshTokenProvider.refreshToken({
      refreshToken: raw,
    });
    await tick(20);

    const logoutAll = world.refreshTokenProvider.logoutAll(USER.id);
    await tick(20);

    // logoutAll must be parked on the advisory lock — it cannot report
    // success while the rotation may still commit a live token.
    let logoutSettled = false;
    void logoutAll.then(
      () => (logoutSettled = true),
      () => (logoutSettled = true),
    );
    await tick(20);
    expect(logoutSettled).toBe(false);

    commitGate.resolve();
    world.dataSource.hooks.beforeCommit = undefined;
    await rotation;
    await logoutAll;

    // FINAL STATE: zero live sessions — the device-change guarantee.
    expect(world.liveRows()).toHaveLength(0);
    expect(world.refreshTokenTable.rows).toHaveLength(2);
  });

  it('a refresh that starts after logoutAll is deterministically rejected', async () => {
    const world = buildWorld();
    const { raw } = world.seedSession();

    await world.refreshTokenProvider.logoutAll(USER.id);

    await expect(
      world.refreshTokenProvider.refreshToken({ refreshToken: raw }),
    ).rejects.toThrow('Refresh token has been revoked or expired');

    // FINAL STATE: no resurrection.
    expect(world.liveRows()).toHaveLength(0);
    expect(world.refreshTokenTable.rows).toHaveLength(1);
  });

  it('parallel logoutAll + refresh storms converge to zero live sessions', async () => {
    const world = buildWorld();
    const { raw } = world.seedSession();
    world.seedSession(); // a second device
    world.seedSession(); // a third device

    await Promise.allSettled([
      world.refreshTokenProvider.refreshToken({ refreshToken: raw }),
      world.refreshTokenProvider.logoutAll(USER.id),
      world.refreshTokenProvider.logoutAll(USER.id),
      world.refreshTokenProvider.refreshToken({ refreshToken: raw }),
    ]);

    // Whatever interleaving occurred, no session survives logout-all.
    expect(world.liveRows()).toHaveLength(0);
    expect(
      world.refreshTokenTable.rows.filter((row) => row.revokedAt === null),
    ).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// I4 — logout is idempotent under repetition and concurrency
// ---------------------------------------------------------------------------

describe('race: logout repetition and concurrency (I4)', () => {
  it('five sequential + five parallel logouts all succeed and revoke exactly once', async () => {
    const world = buildWorld();
    const { jti, raw } = world.seedSession();
    const other = world.seedSession(); // an unrelated session of the same user

    const sequential = [];
    for (let i = 0; i < 5; i++) {
      sequential.push(
        await world.refreshTokenProvider.logout({ refreshToken: raw }),
      );
    }
    expect(sequential).toEqual(
      Array.from({ length: 5 }, () => ({ message: 'Logged out successfully' })),
    );

    const parallel = await Promise.all(
      Array.from({ length: 5 }, () =>
        world.refreshTokenProvider.logout({ refreshToken: raw }),
      ),
    );
    expect(parallel).toEqual(
      Array.from({ length: 5 }, () => ({ message: 'Logged out successfully' })),
    );

    // FINAL STATE: the presented token revoked once, the sibling untouched.
    const row = world.refreshTokenTable.rows.find((r) => r.jti === jti);
    expect(row.revokedAt).toBeInstanceOf(Date);
    const sibling = world.refreshTokenTable.rows.find(
      (r) => r.jti === other.jti,
    );
    expect(sibling.revokedAt).toBeNull();
  });

  it("a logout that lands between a rotation's read and its claim still prevents the rotation", async () => {
    const world = buildWorld();
    const { raw } = world.seedSession();

    // Pause the rotation between reading the stored token and the CAS —
    // the hash comparison is the deterministic injection point.
    const compareGate = defer<void>();
    hashingProvider.comparePassword.mockImplementationOnce(async () => {
      await compareGate.promise;
      return true;
    });

    const rotation = world.refreshTokenProvider.refreshToken({
      refreshToken: raw,
    });
    await tick(20);

    // While the rotation is between read and claim, the user logs out from
    // another tab. Logout does not take the user lock — it must still win.
    await world.refreshTokenProvider.logout({ refreshToken: raw });

    compareGate.resolve();
    await expect(rotation).rejects.toThrow(
      'Refresh token has been revoked or expired',
    );

    // FINAL STATE: no token was minted by the aborted rotation.
    expect(world.refreshTokenTable.rows).toHaveLength(1);
    expect(world.liveRows()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Expiry edge of the CAS
// ---------------------------------------------------------------------------

describe('race: expired and invalid tokens never mint state', () => {
  it('an expired token is rejected and changes nothing', async () => {
    const world = buildWorld();
    // A correctly-signed token whose stored row has already expired.
    const { raw } = world.seedSession({
      expiresAt: new Date(Date.now() - 1_000),
    });

    await expect(
      world.refreshTokenProvider.refreshToken({ refreshToken: raw }),
    ).rejects.toThrow('Refresh token has been revoked or expired');

    expect(world.refreshTokenTable.rows).toHaveLength(1);
    expect(world.refreshTokenTable.rows[0].revokedAt).toBeNull();
  });

  it('a token whose signature does not decode is rejected before any store access', async () => {
    const world = buildWorld();

    await expect(
      world.refreshTokenProvider.refreshToken({ refreshToken: 'garbage' }),
    ).rejects.toThrow('Invalid refresh token');

    expect(world.refreshTokenTable.rows).toHaveLength(0);
  });

  it('a validly-signed token for a row with a different hash is rejected (ownership)', async () => {
    const world = buildWorld();
    const { raw } = world.seedSession({ tokenHash: 'h:someone-elses-token' });

    await expect(
      world.refreshTokenProvider.refreshToken({ refreshToken: raw }),
    ).rejects.toThrow('Invalid refresh token');

    expect(world.liveRows()).toHaveLength(1); // untouched
    expect(world.revokedRows()).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Idempotency boundary (AuthService + IdempotencyProvider)
// ---------------------------------------------------------------------------

describe('idempotency: client retry contract at the service boundary', () => {
  it('a retried refresh with the same Idempotency-Key replays the response and mints nothing new', async () => {
    const world = buildWorld();
    const { raw } = world.seedSession();

    const first = await world.authService.RefreshToken(
      { refreshToken: raw },
      'Mozilla/5.0',
      'client-key-1',
    );
    const replay = await world.authService.RefreshToken(
      { refreshToken: raw },
      'Mozilla/5.0',
      'client-key-1',
    );

    expect(replay).toEqual(first);
    // FINAL STATE: one rotation, one live row — the replay minted nothing.
    expect(world.liveRows()).toHaveLength(1);
    expect(world.refreshTokenTable.rows).toHaveLength(2);
  });

  it('concurrent refreshes sharing an Idempotency-Key share one execution and one response', async () => {
    const world = buildWorld();
    const { raw } = world.seedSession();

    const responses = await Promise.all(
      Array.from({ length: 6 }, () =>
        world.authService.RefreshToken(
          { refreshToken: raw },
          'Mozilla/5.0',
          'client-key-1',
        ),
      ),
    );

    for (const response of responses) {
      expect(response).toEqual(responses[0]);
    }
    expect(world.liveRows()).toHaveLength(1);
    expect(world.refreshTokenTable.rows).toHaveLength(2);
  });

  it('the same key with a different payload is a 409 conflict with zero state change', async () => {
    const world = buildWorld();
    const first = world.seedSession();
    const second = world.seedSession();

    await world.authService.RefreshToken(
      { refreshToken: first.raw },
      'UA',
      'client-key-1',
    );

    await expect(
      world.authService.RefreshToken(
        { refreshToken: second.raw },
        'UA',
        'client-key-1',
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    // FINAL STATE: the second session was not consumed by the conflict.
    const secondRow = world.refreshTokenTable.rows.find(
      (r) => r.jti === second.jti,
    );
    expect(secondRow.revokedAt).toBeNull();
    expect(world.liveRows()).toHaveLength(2); // first's replacement + second
  });

  it('retry-after-conflict: a fresh key executes the operation against current state', async () => {
    const world = buildWorld();
    const first = world.seedSession();

    await world.authService.RefreshToken(
      { refreshToken: first.raw },
      'UA',
      'client-key-1',
    );

    // The conflicted client retries with a FRESH key. The token it holds was
    // already consumed by client-key-1's rotation, so the retry observes a
    // deterministic 401 — never a second rotation of the same token.
    await expect(
      world.authService.RefreshToken(
        { refreshToken: first.raw },
        'UA',
        'client-key-2',
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(world.liveRows()).toHaveLength(1);
  });

  it('a transient refresh failure under a key is retryable with the same key', async () => {
    const world = buildWorld();
    const { raw } = world.seedSession();

    hashingProvider.hashPassword.mockRejectedValueOnce(new Error('transient'));

    await expect(
      world.authService.RefreshToken(
        { refreshToken: raw },
        'UA',
        'client-key-1',
      ),
    ).rejects.toThrow('transient');

    hashingProvider.hashPassword.mockClear();
    const retried = await world.authService.RefreshToken(
      { refreshToken: raw },
      'UA',
      'client-key-1',
    );
    expect(retried.access_token).toBeDefined();
    expect(world.liveRows()).toHaveLength(1);
  });

  it('sign-in with the same key replays one session instead of minting two', async () => {
    const world = buildWorld();
    const session = {
      access_token: 'a',
      refresh_token: 'r',
      jti: 'j',
      refreshTokenId: 'row',
    };
    signInProviders.SignIn.mockResolvedValue([session, USER]);

    const dto = { email: USER.email, password: 'pw' } as any;
    const first = await world.authService.SignIn(dto, 'sign-in-key-1');
    const replay = await world.authService.SignIn(dto, 'sign-in-key-1');

    expect(replay).toEqual(first);
    expect(signInProviders.SignIn).toHaveBeenCalledTimes(1);
  });

  it('without a key, behavior is unchanged (every request executes)', async () => {
    const world = buildWorld();
    signInProviders.SignIn.mockResolvedValue([{ token: 'x' }, USER]);

    const dto = { email: USER.email, password: 'pw' } as any;
    await world.authService.SignIn(dto);
    await world.authService.SignIn(dto);

    expect(signInProviders.SignIn).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// Verification: exactly-once consumption + no ambiguous recovery state
// ---------------------------------------------------------------------------

describe('race: email verification and resend (recovery)', () => {
  const seedUnverified = (world: ReturnType<typeof buildWorld>) => {
    world.userTable.insert({
      id: 7,
      email: USER.email,
      emailVerified: false,
      role: 'user',
      emailVerificationToken: 'h:raw-token',
      emailVerificationExpires: new Date(Date.now() + 3600_000),
      encryptedData: null,
      dataEncryptionKeyId: null,
    });
    return world.userTable.rows[0];
  };

  it('N concurrent submissions of the same token: one flip, one audit, idempotent success for all', async () => {
    const world = buildWorld();
    seedUnverified(world);
    tokenProvider.compare.mockImplementation(
      async (raw: string, stored: string) => `h:${raw}` === stored,
    );

    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        world.verifyEmailProvider.verifyEmail('raw-token'),
      ),
    );

    for (const result of results) {
      expect(result.emailVerified).toBe(true);
      expect(result.role).toBe('verified_user');
    }

    // FINAL STATE: verified once, token cleared, exactly one audit entry —
    // no partial or ambiguous state.
    const row = world.userTable.rows[0];
    expect(row.emailVerified).toBe(true);
    expect(row.emailVerificationToken).toBeNull();
    expect(row.emailVerificationExpires).toBeNull();
    expect(auditService.log).toHaveBeenCalledTimes(1);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'VERIFY_EMAIL' }),
    );
  });

  it('a resend racing a verification cannot leave a live token on a verified account', async () => {
    const world = buildWorld();
    seedUnverified(world);
    tokenProvider.compare.mockImplementation(
      async (raw: string, stored: string) => `h:${raw}` === stored,
    );

    // Deterministic interleave: the verification is paused at its token
    // comparison; the resend completes fully (arming a NEW token) before
    // the verification's compare-and-set runs.
    tokenProvider.generate = () => 'tok-new';
    const compareGate = defer<void>();
    tokenProvider.compare.mockImplementationOnce(async () => {
      await compareGate.promise;
      return true;
    });

    const verification = world.verifyEmailProvider.verifyEmail('raw-token');
    await tick(10);

    await world.verifyEmailProvider.issueVerificationToken({
      ...world.userTable.rows[0],
    });
    expect(mailService.VerificationEmail).toHaveBeenCalledTimes(1);

    compareGate.resolve();
    // The verification held the ORIGINAL token, which was superseded — it
    // must NOT consume the newer token.
    await expect(verification).rejects.toBeInstanceOf(UnauthorizedException);

    // FINAL STATE: still unverified with the NEW armed token — exactly one
    // live token, no partial verification.
    const row = world.userTable.rows[0];
    expect(row.emailVerified).toBe(false);
    expect(row.emailVerificationToken).toBe('h:tok-new');
    expect(auditService.log).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: 'VERIFY_EMAIL' }),
    );
  });

  it('a verification completing before a resend leaves the account verified with NO live token', async () => {
    const world = buildWorld();
    seedUnverified(world);
    tokenProvider.compare.mockImplementation(
      async (raw: string, stored: string) => `h:${raw}` === stored,
    );

    await world.verifyEmailProvider.verifyEmail('raw-token');

    // Resend races in AFTER verification completed.
    await world.verifyEmailProvider.issueVerificationToken({
      ...world.userTable.rows[0],
    });

    // FINAL STATE: verified, no token, no mail — the ambiguous "verified
    // account with a live verification token" state is impossible.
    const row = world.userTable.rows[0];
    expect(row.emailVerified).toBe(true);
    expect(row.emailVerificationToken).toBeNull();
    expect(row.emailVerificationExpires).toBeNull();
    expect(mailService.VerificationEmail).toHaveBeenCalledTimes(0);
  });

  it('resend storms (resendVerification with one key) send at most one mail', async () => {
    const world = buildWorld();
    seedUnverified(world);
    tokenProvider.compare.mockImplementation(async () => false);
    tokenProvider.hash = async (raw: string) => `h:${raw}`;
    tokenProvider.generate = () => 'tok-new';

    const acks = await Promise.all(
      Array.from({ length: 5 }, () =>
        world.authService.resendVerification(USER.email, 'resend-key-1'),
      ),
    );

    for (const ack of acks) {
      expect(ack.status).toBe('ok');
    }
    expect(mailService.VerificationEmail).toHaveBeenCalledTimes(1);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RESEND_VERIFICATION' }),
    );
  });

  it('an invalid verification token changes nothing', async () => {
    const world = buildWorld();
    seedUnverified(world);
    tokenProvider.compare.mockImplementation(async () => false);

    await expect(
      world.verifyEmailProvider.verifyEmail('wrong'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    const row = world.userTable.rows[0];
    expect(row.emailVerified).toBe(false);
    expect(row.emailVerificationToken).toBe('h:raw-token');
    expect(auditService.log).not.toHaveBeenCalled();
  });
});
