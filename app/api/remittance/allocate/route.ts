/**
 * POST /api/remittance/allocate (protected)
 *
 * Flow: After a remittance is sent, the frontend calls this with { txHash, amount }.
 * Backend validates the request and user, reads split config, computes allocation,
 * and returns (and optionally persists) { spending, savings, bills, insurance }.
 *
 * Optional DB: Store allocation linked to txHash for insights.
 * Schema (allocations table): id UUID PK, user_address TEXT NOT NULL, tx_hash TEXT UNIQUE NOT NULL,
 * amount DECIMAL NOT NULL, spending DECIMAL, savings DECIMAL, bills DECIMAL, insurance DECIMAL,
 * created_at TIMESTAMPTZ DEFAULT NOW(). Index on (user_address, created_at) for reporting.
 * Without DB we return the calculated allocation only.
 *
 * Optional: Return XDRs for contract top-ups (savings/bills/insurance) can be
 * added when contract integration is ready.
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/session';
import { jsonSuccess, jsonError } from '@/lib/api/types';
import { getSplitConfig, computeAllocation } from '@/lib/remittance/split';
import { withApiLogger } from '@/lib/api-logger-middleware';

function validateAllocateBody(body: unknown): { txHash: string; amount: number } {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }
  const o = body as Record<string, unknown>;
  if (typeof o.txHash !== 'string' || !o.txHash.trim()) {
    throw new Error('txHash is required and must be a non-empty string');
  }
  if (typeof o.amount !== 'number' || o.amount <= 0 || !Number.isFinite(o.amount)) {
    throw new Error('amount is required and must be a positive number');
  }
  return { txHash: o.txHash.trim(), amount: o.amount };
}

/**
 * Validate that tx exists and belongs to user. Without a tx store we accept
 * any txHash for the authenticated user. With DB: query remittances by txHash
 * and user_address and return 404 if not found.
 */
async function validateTxBelongsToUser(
  _txHash: string,
  _userAddress: string
): Promise<boolean> {
  // Stub: no persistence of txs yet — consider adding a remittances table
  // with (user_address, tx_hash, amount, created_at) and check here.
  return true;
}

export const POST = withApiLogger(async (request) => {
  let address: string;
  try {
    const auth = await requireAuth();
    address = auth.address;
  } catch {
    return jsonError('UNAUTHORIZED', 'Not authenticated');
  }

  let txHash: string;
  let amount: number;
  try {
    const body = await request.json();
    const parsed = validateAllocateBody(body);
    txHash = parsed.txHash;
    amount = parsed.amount;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid request body';
    return jsonError('VALIDATION_ERROR', message);
  }

  const belongsToUser = await validateTxBelongsToUser(txHash, address);
  if (!belongsToUser) {
    return jsonError('NOT_FOUND', 'Transaction not found or does not belong to you');
  }

  const splitConfig = getSplitConfig(address);
  const allocation = computeAllocation(amount, splitConfig);

  // Optional persistence: insert into allocations table linked to txHash.
  // Example: await db.allocations.create({ userAddress: address, txHash, amount, ...allocation });

  return jsonSuccess({
    txHash,
    amount,
    allocation: {
      spending: allocation.spending,
      savings: allocation.savings,
      bills: allocation.bills,
      insurance: allocation.insurance,
    },
    // Optional: xdrTopUps for savings/bills/insurance contract calls when ready
    // xdrTopUps?: { savings?: string; bills?: string; insurance?: string };
  });
});
