/**
 * Regression test: memo length validation uses byte count, not character count.
 *
 * Stellar Memo.text is limited to 28 bytes. The route handler must reject
 * memos whose UTF‑8 encoding exceeds 28 bytes — even when the character
 * count is ≤28 (e.g. multi‑byte characters like 'é' or emoji).
 *
 * Bug: inline check used `memo.length > 28` (character count) instead of
 * `new TextEncoder().encode(memo).length > 28` (byte count).
 *
 * This test FAILS when run against the buggy code and PASSES after the fix.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextRequest: class NextRequest {
    readonly url: string;
    readonly method: string;
    private _body: unknown;
    constructor(input: string, init?: RequestInit & { body?: string }) {
      this.url = input;
      this.method = init?.method ?? 'GET';
      if (init?.body) {
        try { this._body = JSON.parse(init.body as string); } catch { this._body = {}; }
      }
    }
    async json(): Promise<unknown> { return this._body; }
  },
  NextResponse: {
    json: (data: unknown) => new Response(JSON.stringify(data)),
  },
}));

vi.mock('@/lib/session', () => ({
  requireAuth: vi.fn(() =>
    Promise.resolve({ address: 'GD6EAN3FULNVU5QMVLAXANHMIPPAIWLIPFZYBCMJ4LPH5VME4H477EYQ' }),
  ),
}));

vi.mock('@/lib/api/types', () => ({
  jsonSuccess: (data: unknown) =>
    new Response(JSON.stringify({ success: true, ...(data as object) }), { status: 200 }),
  jsonError: (_code: string, message: string) =>
    new Response(JSON.stringify({ success: false, error: message }), { status: 400 }),
}));

vi.mock('@/lib/soroban/client', () => ({
  getServer: vi.fn(() => ({
    getAccount: vi.fn(() =>
      Promise.resolve({ accountId: () => '', sequenceNumber: () => '0' }),
    ),
    simulateTransaction: vi.fn(() => Promise.resolve({})),
  })),
  getNetworkPassphrase: vi.fn(() => 'Test SDF Network ; September 2015'),
}));

import { validateBuildRequest } from '@/app/api/remittance/build/route';

const VALID_ADDRESS = 'GD6EAN3FULNVU5QMVLAXANHMIPPAIWLIPFZYBCMJ4LPH5VME4H477EYQ';
const VALID_BASE = {
  amount: 100,
  currency: 'USDC' as const,
  recipientAddress: VALID_ADDRESS,
};

describe('validateBuildRequest – memo byte-length validation', () => {
  it('accepts undefined memo', () => {
    const result = validateBuildRequest({ ...VALID_BASE });
    expect(result.memo).toBeUndefined();
  });

  it('accepts empty memo string', () => {
    expect(() => validateBuildRequest({ ...VALID_BASE, memo: '' })).not.toThrow();
  });

  it('accepts ASCII memo within 28 bytes', () => {
    const result = validateBuildRequest({ ...VALID_BASE, memo: 'Hello' });
    expect(result.memo).toBe('Hello');
  });

  it('accepts exactly 28‑byte ASCII memo', () => {
    const memo = 'A'.repeat(28);
    const result = validateBuildRequest({ ...VALID_BASE, memo });
    expect(result.memo).toBe(memo);
  });

  it('rejects ASCII memo exceeding 28 bytes', () => {
    expect(() => validateBuildRequest({ ...VALID_BASE, memo: 'A'.repeat(29) }))
      .toThrow('memo must be 28 bytes or less');
  });

  it('rejects multi‑byte memo exceeding 28 bytes', () => {
    // 'é' (U+00E9) = 2 bytes in UTF‑8; 15 chars = 30 bytes
    // BUG: With memo.length > 28 check: 15 > 28 is false → no reject → test FAILS
    // FIX: With byte length check: 30 > 28 is true → rejects → test PASSES
    expect(() => validateBuildRequest({ ...VALID_BASE, memo: 'é'.repeat(15) }))
      .toThrow('memo must be 28 bytes or less');
  });

  it('accepts multi‑byte memo exactly 28 bytes', () => {
    // 14 × 'é' = 28 bytes
    const memo = 'é'.repeat(14);
    const result = validateBuildRequest({ ...VALID_BASE, memo });
    expect(result.memo).toBe(memo);
  });

  it('rejects emoji memo exceeding 28 bytes', () => {
    // '😀' (U+1F600) = 4 bytes; 8 chars = 32 bytes
    expect(() => validateBuildRequest({ ...VALID_BASE, memo: '😀'.repeat(8) }))
      .toThrow('memo must be 28 bytes or less');
  });

  it('accepts emoji memo exactly 28 bytes', () => {
    // 7 × '😀' = 28 bytes
    const memo = '😀'.repeat(7);
    const result = validateBuildRequest({ ...VALID_BASE, memo });
    expect(result.memo).toBe(memo);
  });
});
