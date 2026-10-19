// API response types

/** POST /api/send — request body */
export interface SendTransactionRequest {
  /** Stellar public key of the recipient (G…) */
  recipient: string;
  /** Token amount to send, in token units (must be > 0) */
  amount: number;
  /** Token/asset symbol, e.g. "USDC" */
  currency: string;
}

/** POST /api/send — successful response */
export interface SendTransactionResponse {
  success: true;
  /** XDR hash / placeholder until Stellar broadcasting is wired */
  transactionId: string;
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

