/**
 * Unit tests for lib/auth/nonces.ts
 *
 * Covers:
 * - issueNonce: generates a 64-char hex nonce, upserts into AuthNonce
 * - consumeNonce: single-use, expiry, wrong nonce, concurrent consume
 *
 * Run:
 *   node node_modules/vitest/vitest.mjs run --config vitest.config.mjs --configLoader runner tests/unit/auth-nonces.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Prisma mock ──────────────────────────────────────────────────────────────
// Use vi.hoisted so the mock object is available before the hoisted vi.mock call.

const mockPrisma = vi.hoisted(() => ({
  authNonce: {
    upsert: vi.fn(),
    findUnique: vi.fn(),
    delete: vi.fn(),
  },
  $transaction: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  prisma: mockPrisma,
}));

import { issueNonce, consumeNonce, NONCE_TTL_MS } from '@/lib/auth/nonces';

// ── Helpers ──────────────────────────────────────────────────────────────────

const ADDRESS = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN';
const FUTURE = new Date(Date.now() + NONCE_TTL_MS);
const PAST = new Date(Date.now() - 1000);

/** Make $transaction delegate synchronously to the callback. */
function setupTransaction() {
  mockPrisma.$transaction.mockImplementation(
    (fn: (tx: typeof mockPrisma) => Promise<boolean>) => fn(mockPrisma),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  setupTransaction();
});

// ── issueNonce ───────────────────────────────────────────────────────────────

describe('issueNonce', () => {
  it('returns a 64-char hex nonce', async () => {
    mockPrisma.authNonce.upsert.mockResolvedValue({});

    const { nonce } = await issueNonce(ADDRESS);

    expect(nonce).toMatch(/^[0-9a-f]{64}$/);
  });

  it('returns an ISO expiry roughly 5 minutes in the future', async () => {
    mockPrisma.authNonce.upsert.mockResolvedValue({});

    const before = Date.now();
    const { expiresAt } = await issueNonce(ADDRESS);
    const after = Date.now();

    const exp = new Date(expiresAt).getTime();
    expect(exp).toBeGreaterThanOrEqual(before + NONCE_TTL_MS - 50);
    expect(exp).toBeLessThanOrEqual(after + NONCE_TTL_MS + 50);
  });

  it('calls upsert with the correct address and nonce', async () => {
    mockPrisma.authNonce.upsert.mockResolvedValue({});

    const { nonce } = await issueNonce(ADDRESS);

    expect(mockPrisma.authNonce.upsert).toHaveBeenCalledOnce();
    const call = mockPrisma.authNonce.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ address: ADDRESS });
    expect(call.create.nonce).toBe(nonce);
    expect(call.update.nonce).toBe(nonce);
  });

  it('issues a different nonce on each call (randomness)', async () => {
    mockPrisma.authNonce.upsert.mockResolvedValue({});

    const { nonce: n1 } = await issueNonce(ADDRESS);
    const { nonce: n2 } = await issueNonce(ADDRESS);

    expect(n1).not.toBe(n2);
  });
});

// ── consumeNonce ─────────────────────────────────────────────────────────────

describe('consumeNonce', () => {
  it('returns true and deletes the row for a valid nonce', async () => {
    const nonce = 'a'.repeat(64);
    mockPrisma.authNonce.findUnique.mockResolvedValue({
      address: ADDRESS,
      nonce,
      expiresAt: FUTURE,
    });
    mockPrisma.authNonce.delete.mockResolvedValue({});

    const result = await consumeNonce(ADDRESS, nonce);

    expect(result).toBe(true);
    expect(mockPrisma.authNonce.delete).toHaveBeenCalledWith({ where: { address: ADDRESS } });
  });

  it('returns false when no record exists', async () => {
    mockPrisma.authNonce.findUnique.mockResolvedValue(null);

    const result = await consumeNonce(ADDRESS, 'a'.repeat(64));

    expect(result).toBe(false);
    expect(mockPrisma.authNonce.delete).not.toHaveBeenCalled();
  });

  it('returns false for a wrong nonce (constant-time path)', async () => {
    mockPrisma.authNonce.findUnique.mockResolvedValue({
      address: ADDRESS,
      nonce: 'a'.repeat(64),
      expiresAt: FUTURE,
    });
    mockPrisma.authNonce.delete.mockResolvedValue({});

    const result = await consumeNonce(ADDRESS, 'b'.repeat(64));

    // Row is deleted even on mismatch (cleanup), but result is false
    expect(result).toBe(false);
    expect(mockPrisma.authNonce.delete).toHaveBeenCalledOnce();
  });

  it('returns false for an expired nonce', async () => {
    const nonce = 'c'.repeat(64);
    mockPrisma.authNonce.findUnique.mockResolvedValue({
      address: ADDRESS,
      nonce,
      expiresAt: PAST,
    });
    mockPrisma.authNonce.delete.mockResolvedValue({});

    const result = await consumeNonce(ADDRESS, nonce);

    expect(result).toBe(false);
    // Row is deleted to prevent accumulation of stale entries
    expect(mockPrisma.authNonce.delete).toHaveBeenCalledOnce();
  });

  it('returns false when nonce lengths differ (no timing leak)', async () => {
    mockPrisma.authNonce.findUnique.mockResolvedValue({
      address: ADDRESS,
      nonce: 'a'.repeat(64),
      expiresAt: FUTURE,
    });
    mockPrisma.authNonce.delete.mockResolvedValue({});

    const result = await consumeNonce(ADDRESS, 'short');

    expect(result).toBe(false);
  });

  it('is single-use: second concurrent consume returns false', async () => {
    const nonce = 'd'.repeat(64);

    // First call finds the record; second call finds null (already deleted)
    mockPrisma.authNonce.findUnique
      .mockResolvedValueOnce({ address: ADDRESS, nonce, expiresAt: FUTURE })
      .mockResolvedValueOnce(null);
    mockPrisma.authNonce.delete.mockResolvedValue({});

    const [first, second] = await Promise.all([
      consumeNonce(ADDRESS, nonce),
      consumeNonce(ADDRESS, nonce),
    ]);

    // Exactly one wins
    const wins = [first, second].filter(Boolean).length;
    expect(wins).toBe(1);
  });

  it('wraps work inside a $transaction', async () => {
    const nonce = 'e'.repeat(64);
    mockPrisma.authNonce.findUnique.mockResolvedValue({
      address: ADDRESS,
      nonce,
      expiresAt: FUTURE,
    });
    mockPrisma.authNonce.delete.mockResolvedValue({});

    await consumeNonce(ADDRESS, nonce);

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });
});
