// API response types

/** POST /api/send — request body */
export interface SendTransactionRequest {
  /** Stellar public key of the recipient (G…) */
  recipient: string;
  /** Token amount to send, in token units (must be > 0) */
  amount: number;
  /** Token/asset symbol, e.g. "USDC" */
  currency: string;
  /** Optional Stellar text memo (maximum 28 UTF-8 bytes). */
  memo?: string;
}

/** POST /api/send — successful response */
export interface SendTransactionResponse {
  success: true;
  /** Base64-encoded unsigned Stellar transaction XDR. */
  xdr: string;
  networkPassphrase: string;
  /** Transaction fee in stroops. */
  fee: string;
}

/** POST /api/send — error response */
export interface SendTransactionErrorResponse {
  success: false;
  error: string;
}

/**
 * Union of all possible /api/send response shapes.
 * Discriminate via the `success` field.
 */
export type SendTransactionResult = SendTransactionResponse | SendTransactionErrorResponse;

export interface RecurringSchedule {
  id: string;
  userAddress: string;
  recipientAddress: string;
  amount: number;
  currency: string;
  frequency: 'weekly' | 'biweekly' | 'monthly';
  nextRunAt: string; // ISO date
  lastRunAt?: string;
  createdAt: string;
}

export interface APIResponse {
  success: boolean;
  xdr?: string;
  simulate?: {
    cost: string;
    results: any[];
  };
  message?: string;
  error?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export interface SuccessResponse {
  success: true;
  xdr: string;
  simulate?: {
    cost: string;
    results: any[];
  };
  message: string;
}

