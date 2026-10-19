// Type definitions for savings goals transactions

export interface CreateGoalParams {
  owner: string;        // Stellar public key
  name: string;         // Goal name (1-100 characters)
  targetAmount: number; // Target amount (positive number)
  targetDate: string;   // ISO 8601 date string (future date)
}

export interface GoalOperationParams {
  caller: string;  // Stellar public key from session
  goalId: string;  // Unique goal identifier
  amount?: number; // Amount for add/withdraw operations (positive)
}

export interface BuildTxResult {
  xdr: string;
}

export interface Session {
  publicKey: string; // User's Stellar public key
}

export interface ApiSuccessResponse {
  xdr: string;
  simulation?: {
    success: boolean;
    result?: any;
  };
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
}
