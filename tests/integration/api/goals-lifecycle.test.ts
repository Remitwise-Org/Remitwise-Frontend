/**
 * Integration tests for the savings-goals lifecycle routes.
 *
 * Routes under test:
 *   POST /api/goals                  (create)        — withAuth(lib/auth.ts)
 *   GET  /api/goals                  (list)          — withAuth(lib/auth.ts)
 *   POST /api/goals/[id]/add         (add funds)     — getSessionFromRequest
 *   POST /api/goals/[id]/withdraw    (withdraw)      — getSessionFromRequest
 *   POST /api/goals/[id]/lock        (lock)          — getSessionFromRequest
 *   POST /api/goals/[id]/unlock      (unlock)        — getSessionFromRequest
 *   GET  /api/goals/[id]/completed   (completed?)    — x-public-key header
 *
 * IMPORTANT — where lifecycle state is enforced:
 * The add/withdraw/lock/unlock routes are *transaction builders*. They
 * authenticate the caller and validate inputs, then hand off to the
 * `build*Tx` helpers which assemble an UNSIGNED Soroban XDR. They never read
 * the goal's on-chain state, so the state-machine guards — "withdraw from a
 * locked goal", "add to a completed goal", "over-withdraw" — are enforced by
 * the Soroban contract at submission time, NOT by these HTTP routes. See
 * docs/savings-goals-lifecycle.md.
 *
 * These tests therefore (a) prove the route-level guarantees that DO exist
 * (auth gating, input validation, error shape) and (b) prove the route
 * faithfully surfaces a contract-layer rejection as a 500 — we simulate the
 * on-chain guard by making the mocked builder throw.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks: replace the contract layer so no Soroban RPC / env is required ---
vi.mock('@/lib/contracts/savings-goals', () => ({
  buildCreateGoalTx: vi.fn(),
  buildAddToGoalTx: vi.fn(),
  buildWithdrawFromGoalTx: vi.fn(),
  buildLockGoalTx: vi.fn(),
  buildUnlockGoalTx: vi.fn(),
}));

vi.mock('@/lib/contracts/savings-goal', () => ({
  getGoal: vi.fn(),
  isGoalCompleted: vi.fn(),
}));

// withAuth's cookie fallback calls getSession(); make it deterministic.
vi.mock('@/lib/session', () => ({
  getSession: vi.fn(async () => null),
}));

import {
  buildCreateGoalTx,
  buildAddToGoalTx,
  buildWithdrawFromGoalTx,
  buildLockGoalTx,
  buildUnlockGoalTx,
} from '@/lib/contracts/savings-goals';
import { getGoal, isGoalCompleted } from '@/lib/contracts/savings-goal';

import { POST as createGoal, GET as listGoals } from '@/app/api/goals/route';
import { POST as addToGoal } from '@/app/api/goals/[id]/add/route';
import { POST as withdrawFromGoal } from '@/app/api/goals/[id]/withdraw/route';
import { POST as lockGoal } from '@/app/api/goals/[id]/lock/route';
import { POST as unlockGoal } from '@/app/api/goals/[id]/unlock/route';
import { GET as goalCompleted } from '@/app/api/goals/[id]/completed/route';

// --- Helpers ---------------------------------------------------------------

// A syntactically valid Stellar public key (starts with 'G', 56 chars). The
// session helpers only check prefix + length, so this is sufficient.
const PK = 'G' + 'A'.repeat(55);

const MOCK_XDR = 'AAAA_MOCK_XDR';
const MOCK_TX = { xdr: MOCK_XDR };

/** Auth header accepted by both withAuth and getSessionFromRequest. */
const AUTHED = { 'x-stellar-public-key': PK } as const;

function postReq(
  url: string,
  body?: unknown,
  headers: Record<string, string> = {},
): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function getReq(url: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(url, { method: 'GET', headers });
}

/** params arrive as a Promise in Next 15+ route signatures. */
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(buildCreateGoalTx).mockResolvedValue(MOCK_TX);
  vi.mocked(buildAddToGoalTx).mockResolvedValue(MOCK_TX);
  vi.mocked(buildWithdrawFromGoalTx).mockResolvedValue(MOCK_TX);
  vi.mocked(buildLockGoalTx).mockResolvedValue(MOCK_TX);
  vi.mocked(buildUnlockGoalTx).mockResolvedValue(MOCK_TX);
});

// ===========================================================================
// Create / List  — POST & GET /api/goals  (withAuth from lib/auth.ts)
// ===========================================================================
describe('POST /api/goals (create)', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await createGoal(
      postReq('http://localhost/api/goals', {
        name: 'Car',
        targetAmount: 1000,
        targetDate: '2999-01-01',
      }),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
    expect(buildCreateGoalTx).not.toHaveBeenCalled();
  });

  it('creates a goal and returns the built XDR when authenticated + valid', async () => {
    const res = await createGoal(
      postReq(
        'http://localhost/api/goals',
        { name: 'Car', targetAmount: 1000, targetDate: '2999-01-01' },
        AUTHED,
      ),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.xdr).toBe(MOCK_XDR);
    expect(buildCreateGoalTx).toHaveBeenCalledWith(PK, 'Car', 1000, '2999-01-01');
  });

  it('surfaces a missing-name validation error as 400', async () => {
    const res = await createGoal(
      postReq(
        'http://localhost/api/goals',
        { targetAmount: 1000, targetDate: '2999-01-01' },
        AUTHED,
      ),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('surfaces a non-positive amount validation error as 400', async () => {
    const res = await createGoal(
      postReq(
        'http://localhost/api/goals',
        { name: 'Car', targetAmount: -5, targetDate: '2999-01-01' },
        AUTHED,
      ),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('goal_amount_positive');
  });

  it('surfaces a past target-date validation error as 400', async () => {
    const res = await createGoal(
      postReq(
        'http://localhost/api/goals',
        { name: 'Car', targetAmount: 1000, targetDate: '2000-01-01' },
        AUTHED,
      ),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.message).toContain('goal_date_future');
  });
});

describe('GET /api/goals (list)', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await listGoals(getReq('http://localhost/api/goals'));
    expect(res.status).toBe(401);
  });

  it('returns a paginated list when authenticated', async () => {
    const res = await listGoals(getReq('http://localhost/api/goals', AUTHED));
    expect(res.status).toBe(200);
    const body = await res.json();
    // pagination shape: a data array plus pagination metadata
    expect(Array.isArray(body.data)).toBe(true);
  });
});

// ===========================================================================
// Add funds — POST /api/goals/[id]/add
// ===========================================================================
describe('POST /api/goals/[id]/add', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await addToGoal(
      postReq('http://localhost/api/goals/1/add', { amount: 100 }),
      ctx('1'),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(buildAddToGoalTx).not.toHaveBeenCalled();
  });

  it('builds the add transaction when authenticated + valid', async () => {
    const res = await addToGoal(
      postReq('http://localhost/api/goals/1/add', { amount: 100 }, AUTHED),
      ctx('1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.xdr).toBe(MOCK_XDR);
    expect(buildAddToGoalTx).toHaveBeenCalledWith(PK, '1', 100);
  });

  it('rejects an empty goal id with 400', async () => {
    const res = await addToGoal(
      postReq('http://localhost/api/goals//add', { amount: 100 }, AUTHED),
      ctx(''),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(buildAddToGoalTx).not.toHaveBeenCalled();
  });

  it('rejects a missing amount with 400', async () => {
    const res = await addToGoal(
      postReq('http://localhost/api/goals/1/add', {}, AUTHED),
      ctx('1'),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a non-positive amount with 400', async () => {
    const res = await addToGoal(
      postReq('http://localhost/api/goals/1/add', { amount: 0 }, AUTHED),
      ctx('1'),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain('goal_amount_positive');
  });

  // Invalid transition: adding to a COMPLETED goal. The route cannot see goal
  // state, so the guard lives on-chain — we simulate the contract rejecting it.
  it('surfaces an on-chain "add to completed goal" rejection as 500', async () => {
    vi.mocked(buildAddToGoalTx).mockRejectedValueOnce(
      new Error('goal already completed'),
    );
    const res = await addToGoal(
      postReq('http://localhost/api/goals/1/add', { amount: 100 }, AUTHED),
      ctx('1'),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('UNEXPECTED_ERROR');
    expect(body.error.message).toContain('goal already completed');
  });
});

// ===========================================================================
// Withdraw — POST /api/goals/[id]/withdraw
// ===========================================================================
describe('POST /api/goals/[id]/withdraw', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await withdrawFromGoal(
      postReq('http://localhost/api/goals/1/withdraw', { amount: 50 }),
      ctx('1'),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(buildWithdrawFromGoalTx).not.toHaveBeenCalled();
  });

  it('builds the withdraw transaction when authenticated + valid', async () => {
    const res = await withdrawFromGoal(
      postReq('http://localhost/api/goals/1/withdraw', { amount: 50 }, AUTHED),
      ctx('1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.xdr).toBe(MOCK_XDR);
    expect(buildWithdrawFromGoalTx).toHaveBeenCalledWith(PK, '1', 50);
  });

  it('rejects a non-positive amount with 400', async () => {
    const res = await withdrawFromGoal(
      postReq('http://localhost/api/goals/1/withdraw', { amount: -10 }, AUTHED),
      ctx('1'),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.message).toContain('goal_amount_positive');
  });

  // Invalid transition: withdraw from a LOCKED goal (enforced on-chain).
  it('surfaces an on-chain "withdraw from locked goal" rejection as 500', async () => {
    vi.mocked(buildWithdrawFromGoalTx).mockRejectedValueOnce(
      new Error('goal is locked'),
    );
    const res = await withdrawFromGoal(
      postReq('http://localhost/api/goals/1/withdraw', { amount: 50 }, AUTHED),
      ctx('1'),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.code).toBe('UNEXPECTED_ERROR');
    expect(body.error.message).toContain('goal is locked');
  });

  // Invalid transition: over-withdraw (enforced on-chain).
  it('surfaces an on-chain over-withdraw rejection as 500', async () => {
    vi.mocked(buildWithdrawFromGoalTx).mockRejectedValueOnce(
      new Error('insufficient goal balance'),
    );
    const res = await withdrawFromGoal(
      postReq('http://localhost/api/goals/1/withdraw', { amount: 999999 }, AUTHED),
      ctx('1'),
    );
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error.message).toContain('insufficient goal balance');
  });
});

// ===========================================================================
// Lock — POST /api/goals/[id]/lock
// ===========================================================================
describe('POST /api/goals/[id]/lock', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await lockGoal(
      postReq('http://localhost/api/goals/1/lock'),
      ctx('1'),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(buildLockGoalTx).not.toHaveBeenCalled();
  });

  it('builds the lock transaction when authenticated', async () => {
    const res = await lockGoal(
      postReq('http://localhost/api/goals/1/lock', undefined, AUTHED),
      ctx('1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.xdr).toBe(MOCK_XDR);
    expect(buildLockGoalTx).toHaveBeenCalledWith(PK, '1');
  });

  it('rejects an empty goal id with 400', async () => {
    const res = await lockGoal(
      postReq('http://localhost/api/goals//lock', undefined, AUTHED),
      ctx('   '),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(buildLockGoalTx).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// Unlock — POST /api/goals/[id]/unlock
// ===========================================================================
describe('POST /api/goals/[id]/unlock', () => {
  it('rejects unauthenticated requests with 401', async () => {
    const res = await unlockGoal(
      postReq('http://localhost/api/goals/1/unlock'),
      ctx('1'),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('AUTHENTICATION_ERROR');
    expect(buildUnlockGoalTx).not.toHaveBeenCalled();
  });

  it('builds the unlock transaction when authenticated', async () => {
    const res = await unlockGoal(
      postReq('http://localhost/api/goals/1/unlock', undefined, AUTHED),
      ctx('1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.xdr).toBe(MOCK_XDR);
    expect(buildUnlockGoalTx).toHaveBeenCalledWith(PK, '1');
  });

  // Valid transition sequence: unlock, then a withdraw is permitted again.
  it('allows withdraw after a goal is unlocked (valid transition)', async () => {
    const unlockRes = await unlockGoal(
      postReq('http://localhost/api/goals/1/unlock', undefined, AUTHED),
      ctx('1'),
    );
    expect(unlockRes.status).toBe(200);

    const withdrawRes = await withdrawFromGoal(
      postReq('http://localhost/api/goals/1/withdraw', { amount: 50 }, AUTHED),
      ctx('1'),
    );
    expect(withdrawRes.status).toBe(200);
    expect(buildUnlockGoalTx).toHaveBeenCalledWith(PK, '1');
    expect(buildWithdrawFromGoalTx).toHaveBeenCalledWith(PK, '1', 50);
  });
});

// ===========================================================================
// Completed — GET /api/goals/[id]/completed  (x-public-key header auth)
// ===========================================================================
describe('GET /api/goals/[id]/completed', () => {
  it('rejects requests without the x-public-key header with 401', async () => {
    const res = await goalCompleted(
      getReq('http://localhost/api/goals/1/completed'),
      ctx('1'),
    );
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
    expect(getGoal).not.toHaveBeenCalled();
  });

  it('returns 404 when the goal does not exist', async () => {
    vi.mocked(getGoal).mockResolvedValueOnce(null);
    const res = await goalCompleted(
      getReq('http://localhost/api/goals/missing/completed', { 'x-public-key': PK }),
      ctx('missing'),
    );
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Goal not found');
  });

  it('reports completion status for an existing goal', async () => {
    vi.mocked(getGoal).mockResolvedValueOnce({
      id: '1',
      name: 'Car',
      targetAmount: 1000,
      currentAmount: 1000,
      targetDate: 0,
      locked: false,
    });
    vi.mocked(isGoalCompleted).mockResolvedValueOnce(true);

    const res = await goalCompleted(
      getReq('http://localhost/api/goals/1/completed', { 'x-public-key': PK }),
      ctx('1'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.completed).toBe(true);
  });

  it('returns completed=false for an under-target goal', async () => {
    vi.mocked(getGoal).mockResolvedValueOnce({
      id: '2',
      name: 'Trip',
      targetAmount: 1000,
      currentAmount: 250,
      targetDate: 0,
      locked: false,
    });
    vi.mocked(isGoalCompleted).mockResolvedValueOnce(false);

    const res = await goalCompleted(
      getReq('http://localhost/api/goals/2/completed', { 'x-public-key': PK }),
      ctx('2'),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.completed).toBe(false);
  });
});
