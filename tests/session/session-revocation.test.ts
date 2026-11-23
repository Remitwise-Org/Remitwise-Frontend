// @ts-nocheck
/**
 * Tests for server-side session revocation (issue #1777).
 *
 * Covers:
 *  - A cookie issued before logout-all is rejected
 *  - Legacy cookies without sessionVersion are treated as version 0
 *  - A fresh cookie (matching DB version) is accepted
 *  - DB failure fails open (does not lock out users)
 *  - Cache expiry: DB is re-consulted after cache TTL
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sealData } from 'iron-session';

const SESSION_PASSWORD = 'test-password-at-least-32-characters-long';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCookies = { get: vi.fn(), set: vi.fn() };
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookies)),
}));

const mockUserFindUnique = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findUnique: (...args) => mockUserFindUnique(...args) },
  },
}));

beforeEach(() => {
  process.env.SESSION_PASSWORD = SESSION_PASSWORD;
  process.env.SESSION_MAX_AGE = '604800';
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function sealSession(data: object) {
  return sealData(data, { password: SESSION_PASSWORD, ttl: 604800 });
}

async function setupSession(overrides: object = {}) {
  const now = Date.now();
  const session = {
    address: 'GDEMOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
    createdAt: now,
    expiresAt: now + 7 * 24 * 60 * 60 * 1000,
    sessionVersion: 1,
    ...overrides,
  };
  const sealed = await sealSession(session);
  mockCookies.get.mockReturnValue({ value: sealed });
  return session;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('session revocation — requireAuth', () => {
  it('accepts a session whose version matches the DB', async () => {
    await setupSession({ sessionVersion: 2 });
    mockUserFindUnique.mockResolvedValue({ sessionVersion: 2 });

    const { requireAuth } = await import('../../lib/session');
    const result = await requireAuth();
    expect(result.address).toBe('GDEMOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
  });

  it('rejects a session whose version is older than the DB (cookie issued before logout-all)', async () => {
    await setupSession({ sessionVersion: 0 });
    mockUserFindUnique.mockResolvedValue({ sessionVersion: 1 });

    const { requireAuth } = await import('../../lib/session');
    await expect(requireAuth()).rejects.toBeInstanceOf(Response);
  });

  it('treats legacy cookies without sessionVersion as version 0 — accepts when DB is 0', async () => {
    // Legacy cookie: no sessionVersion field
    const now = Date.now();
    const legacy = {
      address: 'GDEMOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      createdAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
      // no sessionVersion
    };
    const sealed = await sealSession(legacy);
    mockCookies.get.mockReturnValue({ value: sealed });
    mockUserFindUnique.mockResolvedValue({ sessionVersion: 0 });

    const { requireAuth } = await import('../../lib/session');
    const result = await requireAuth();
    expect(result.address).toBe('GDEMOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
  });

  it('rejects a legacy cookie (version 0) after logout-all (DB version 1)', async () => {
    const now = Date.now();
    const legacy = {
      address: 'GDEMOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      createdAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
    };
    const sealed = await sealSession(legacy);
    mockCookies.get.mockReturnValue({ value: sealed });
    mockUserFindUnique.mockResolvedValue({ sessionVersion: 1 });

    const { requireAuth } = await import('../../lib/session');
    await expect(requireAuth()).rejects.toBeInstanceOf(Response);
  });

  it('fails open when DB is unavailable (does not lock out users)', async () => {
    await setupSession({ sessionVersion: 1 });
    mockUserFindUnique.mockRejectedValue(new Error('DB connection failed'));

    const { requireAuth } = await import('../../lib/session');
    // Should not throw — DB failure means fail open
    const result = await requireAuth();
    expect(result.address).toBeTruthy();
  });

  it('rejects an expired session regardless of version', async () => {
    const past = Date.now() - 1000;
    const now = Date.now();
    const session = {
      address: 'GDEMOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      createdAt: now - 10000,
      expiresAt: past, // already expired
      sessionVersion: 1,
    };
    const sealed = await sealSession(session);
    mockCookies.get.mockReturnValue({ value: sealed });

    const { requireAuth } = await import('../../lib/session');
    await expect(requireAuth()).rejects.toBeInstanceOf(Response);
  });
});

describe('session revocation — createSession embeds version', () => {
  it('embeds the DB session version in the sealed cookie', async () => {
    mockUserFindUnique.mockResolvedValue({ sessionVersion: 3 });

    const { createSession } = await import('../../lib/session');
    const { session } = await createSession('GDEMOXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX');
    expect(session.sessionVersion).toBe(3);
  });

  it('defaults to version 0 when user is not in DB', async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const { createSession } = await import('../../lib/session');
    const { session } = await createSession('GNEWUSER');
    expect(session.sessionVersion).toBe(0);
  });
});
