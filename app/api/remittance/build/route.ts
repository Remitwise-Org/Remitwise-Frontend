/**
 * POST /api/remittance/build (protected)
 *
 * Builds a Stellar/Soroban transaction for sending a remittance (USDC transfer to recipient).
 * Returns unsigned transaction XDR for the frontend to sign and submit.
 *
 * Flow:
 * 1. Frontend calls this endpoint with { amount, currency?, recipientAddress, memo? }
 * 2. Backend validates inputs and builds the transaction
 * 3. Returns { xdr, networkPassphrase } to frontend
 * 4. Frontend signs with user's wallet
 * 5. Frontend submits to Stellar network
 *
 * Requirements:
 * - Validates amount > 0 and valid Stellar address
 * - Uses Soroban client for transaction building
 * - Handles token transfers (USDC) or native XLM
 * - Simulates transaction to catch errors early
 * - Returns clear errors for invalid recipient or insufficient balance
 */

import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/session';
import { jsonSuccess, jsonError } from '@/lib/api/types';
import {
  TransactionBuilder,
  Operation,
  Asset,
  Memo,
  BASE_FEE,
  StrKey,
  Account,
} from '@stellar/stellar-sdk';
import { getServer, getNetworkPassphrase } from '@/lib/soroban/client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface BuildRemittanceRequest {
  amount: number;
  currency?: string;
  recipientAddress: string;
  memo?: string;
}

interface BuildRemittanceResponse {
  xdr: string;
  networkPassphrase: string;
  simulate?: {
    fee: string;
    success: boolean;
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateBuildRequest(body: unknown): BuildRemittanceRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be a JSON object');
  }

  const o = body as Record<string, unknown>;

  // Validate amount
  if (typeof o.amount !== 'number' || o.amount <= 0 || !Number.isFinite(o.amount)) {
    throw new Error('amount is required and must be a positive number');
  }

  // Validate recipientAddress
  if (typeof o.recipientAddress !== 'string' || !o.recipientAddress.trim()) {
    throw new Error('recipientAddress is required and must be a non-empty string');
  }

  const recipientAddress = o.recipientAddress.trim();
  if (!StrKey.isValidEd25519PublicKey(recipientAddress)) {
    throw new Error('recipientAddress must be a valid Stellar public key (G...)');
  }

  // Validate currency (optional, defaults to USDC)
  const currency = typeof o.currency === 'string' ? o.currency.trim().toUpperCase() : 'USDC';
  if (!['XLM', 'USDC'].includes(currency)) {
    throw new Error('currency must be either XLM or USDC');
  }

  // Validate memo (optional)
  const memo = typeof o.memo === 'string' ? o.memo.trim() : undefined;
  if (memo && memo.length > 28) {
    throw new Error('memo must be 28 characters or less');
  }

  return {
    amount: o.amount,
    currency,
    recipientAddress,
    memo,
  };
}

// ── Transaction Building ──────────────────────────────────────────────────────

async function buildRemittanceTransaction(
  sourceAddress: string,
  request: BuildRemittanceRequest
): Promise<{ xdr: string; networkPassphrase: string }> {
  const server = getServer();
  const networkPassphrase = getNetworkPassphrase();

  // Load source account to get current sequence number
  let sourceAccount: Account;
  try {
    const accountResponse = await server.getAccount(sourceAddress);
    sourceAccount = new Account(accountResponse.accountId(), accountResponse.sequenceNumber());
  } catch (error) {
    throw new Error(
      `Failed to load source account: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Determine asset
  let asset: Asset;
  if (request.currency === 'XLM') {
    asset = Asset.native();
  } else {
    // USDC on Stellar testnet - using Circle's testnet USDC issuer
    // For production, use the appropriate USDC issuer address
    const usdcIssuer = process.env.USDC_ISSUER_ADDRESS || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
    asset = new Asset('USDC', usdcIssuer);
  }

  // Build transaction
  const transactionBuilder = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase,
  });

  // Add payment operation
  transactionBuilder.addOperation(
    Operation.payment({
      destination: request.recipientAddress,
      asset,
      amount: request.amount.toFixed(7), // Stellar requires 7 decimal places
    })
  );

  // Add memo if provided
  if (request.memo) {
    transactionBuilder.addMemo(Memo.text(request.memo));
  }

  // Set timeout (5 minutes)
  transactionBuilder.setTimeout(300);

  const transaction = transactionBuilder.build();

  return {
    xdr: transaction.toXDR(),
    networkPassphrase,
  };
}

// ── Simulation ────────────────────────────────────────────────────────────────

async function simulateTransaction(xdr: string): Promise<{
  success: boolean;
  fee: string;
  error?: string;
}> {
  const server = getServer();

  try {
    const { TransactionBuilder } = await import('@stellar/stellar-sdk');
    const transaction = TransactionBuilder.fromXDR(xdr, getNetworkPassphrase());

    const simulation = await server.simulateTransaction(transaction);

    // Check for simulation errors
    if ('error' in simulation) {
      return {
        success: false,
        fee: '0',
        error: simulation.error || 'Simulation failed',
      };
    }

    // Check if simulation was successful
    if ('result' in simulation && simulation.result) {
      return {
        success: true,
        fee: simulation.minResourceFee || '0',
      };
    }

    return {
      success: false,
      fee: '0',
      error: 'Simulation returned no result',
    };
  } catch (error) {
    return {
      success: false,
      fee: '0',
      error: error instanceof Error ? error.message : 'Simulation error',
    };
  }
}

// ── Route Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Authenticate user
  let address: string;
  try {
    const auth = await requireAuth();
    address = auth.address;
  } catch {
    return jsonError('UNAUTHORIZED', 'Not authenticated');
  }

  // Validate request body
  let buildRequest: BuildRemittanceRequest;
  try {
    const body = await request.json();
    buildRequest = validateBuildRequest(body);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Invalid request body';
    return jsonError('VALIDATION_ERROR', message);
  }

  // Build transaction
  let xdr: string;
  let networkPassphrase: string;
  try {
    const result = await buildRemittanceTransaction(address, buildRequest);
    xdr = result.xdr;
    networkPassphrase = result.networkPassphrase;
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to build transaction';
    return jsonError('CONTRACT_ERROR', message);
  }

  // Simulate transaction to catch errors early
  const simulation = await simulateTransaction(xdr);

  // Check for common errors
  if (!simulation.success) {
    const errorMsg = simulation.error || 'Unknown simulation error';

    // Check for insufficient balance
    if (errorMsg.toLowerCase().includes('insufficient') || errorMsg.toLowerCase().includes('balance')) {
      return jsonError('VALIDATION_ERROR', 'Insufficient balance to complete this transaction');
    }

    // Check for invalid destination
    if (errorMsg.toLowerCase().includes('destination') || errorMsg.toLowerCase().includes('account')) {
      return jsonError('VALIDATION_ERROR', 'Invalid or non-existent recipient address');
    }

    return jsonError('CONTRACT_ERROR', `Transaction simulation failed: ${errorMsg}`);
  }

  // Return successful response
  const response: BuildRemittanceResponse = {
    xdr,
    networkPassphrase,
    simulate: {
      fee: simulation.fee,
      success: simulation.success,
    },
  };

  return jsonSuccess(response);
}
