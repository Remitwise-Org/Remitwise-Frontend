/**
 * Horizon client helper for remittance history.
 *
 * Wraps @stellar/stellar-sdk's Horizon.Server to provide a typed,
 * lazily-initialised singleton and a mapper for payment operations.
 *
 * Rate limits (public testnet): ~3500 requests / hour / IP.
 * For production, run your own Horizon instance or use SDF's mainnet endpoint.
 * Env: HORIZON_URL (defaults to testnet).
 */

import { Horizon } from '@stellar/stellar-sdk';

const HORIZON_URL =
  process.env.HORIZON_URL ?? 'https://horizon-testnet.stellar.org';

let _server: Horizon.Server | null = null;

/** Returns a lazily-initialised Horizon.Server singleton. */
export function getHorizonServer(): Horizon.Server {
  if (!_server) {
    _server = new Horizon.Server(HORIZON_URL, { allowHttp: false });
  }
  return _server;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TxStatus = 'completed' | 'failed';

export interface TransactionItem {
  /** Horizon payment operation ID */
  id: string;
  /** Parent transaction hash (64-char hex) */
  hash: string;
  /** Transfer amount (string to preserve decimal precision) */
  amount: string;
  /** Asset code — "XLM" for native, otherwise the asset code (e.g. "USDC") */
  currency: string;
  /** Destination Stellar account G-address */
  recipient: string;
  /** Source Stellar account G-address */
  sender: string;
  /** ISO 8601 timestamp when the operation was included in a ledger */
  date: string;
  /** completed = transaction was successful; failed = transaction failed */
  status: TxStatus;
  /** Decoded text memo from the parent transaction, if present */
  memo?: string;
}

// ---------------------------------------------------------------------------
// Mapper
// ---------------------------------------------------------------------------

/** Narrows a Horizon OperationRecord to a payment-like op. */
type PaymentOp = Horizon.ServerApi.PaymentOperationRecord;

/**
 * Maps a Horizon payment operation record to a TransactionItem.
 *
 * @param op     - The payment operation returned by Horizon
 * @param memo   - Optional text memo decoded from the parent transaction
 */
export function mapPaymentToTx(op: PaymentOp, memo?: string): TransactionItem {
  const status: TxStatus = op.transaction_successful ? 'completed' : 'failed';

  const currency =
    op.asset_type === 'native'
      ? 'XLM'
      : (op as PaymentOp & { asset_code: string }).asset_code ?? 'UNKNOWN';

  return {
    id: op.id,
    hash: op.transaction_hash,
    amount: op.amount,
    currency,
    recipient: op.to,
    sender: op.from,
    date: op.created_at,
    status,
    memo: memo || undefined,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** Returns true if the string is a valid 64-character lowercase hex hash. */
export function isValidTxHash(hash: string): boolean {
  return /^[0-9a-f]{64}$/i.test(hash);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fetches refined transaction history for an account.
 */
export async function fetchTransactionHistory(
  address: string,
  options: {
    limit?: number;
    cursor?: string;
    status?: 'completed' | 'failed' | 'pending';
  } = {}
): Promise<{ transactions: TransactionItem[]; nextCursor?: string }> {
  const server = getHorizonServer();

  // If status is pending, we don't have a good way to fetch from Horizon history.
  // We return empty for now as standard Stellar history is finalized.
  if (options.status === 'pending') {
    return { transactions: [], nextCursor: undefined };
  }

  let query = server.payments().forAccount(address).order('desc');

  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.cursor) {
    query = query.cursor(options.cursor);
  }

  const response = await query.call();
  let transactions = response.records
    .filter(
      (record): record is PaymentOp =>
        record.type === 'payment' ||
        record.type === 'path_payment_strict_receive' ||
        record.type === 'path_payment_strict_send'
    )
    .map((op) => mapPaymentToTx(op));

  if (options.status) {
    transactions = transactions.filter((tx) => tx.status === options.status);
  }

  const nextCursor =
    response.records.length > 0
      ? response.records[response.records.length - 1].paging_token
      : undefined;

  return { transactions, nextCursor };
}

/**
 * Fetches current status for a single transaction hash.
 */
export async function fetchTransactionStatus(
  hash: string
): Promise<TxStatus | 'pending' | 'not_found'> {
  if (!isValidTxHash(hash)) {
    throw new Error('Invalid transaction hash');
  }

  const server = getHorizonServer();
  try {
    const tx = await server.transactions().transaction(hash).call();
    return tx.successful ? 'completed' : 'failed';
  } catch (error: any) {
    if (error.response?.status === 404) {
      // In Stellar, 404 from Horizon transactions endpoint could mean:
      // 1. It's pending (in mempool, not yet in ledger)
      // 2. It doesn't exist/never submitted
      // For this API, we can return 'pending' if it's potentially in flight, 
      // but usually 'not_found' is safer unless we check mempool (RPC).
      return 'not_found';
    }
    throw error;
  }
}
