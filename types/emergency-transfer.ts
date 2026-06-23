// Emergency Transfer Types and Interfaces

export interface EmergencyTransferRequest {
  amount: string;              // Amount in base units (e.g., stroops for XLM)
  recipientAddress: string;    // Stellar public key (G...)
  memo?: string;               // Optional custom memo (max 28 bytes)
  assetCode?: string;          // Optional asset code (default: XLM)
  assetIssuer?: string;        // Required if assetCode is not XLM
}

export interface EmergencyTransferResponse {
  success: boolean;
  xdr: string;                 // Unsigned transaction XDR
  transactionId: string;       // Internal tracking ID
  fee: string;                 // Calculated fee
  emergencyFeeApplied: boolean;
  estimatedTime: string;       // ISO 8601 timestamp
  limits: {
    maxAmount: string;
    remainingToday: string;
  };
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;              // ERROR_CODE constant
    message: string;           // Human-readable message
    details?: any;             // Additional context
  };
}

export interface EmergencyTransferEvent {
  id: string;
  userId: string;
  amount: string;
  assetCode: string;
  recipientAddress: string;
  transactionId: string;
  timestamp: Date;
  status: 'pending' | 'signed' | 'submitted' | 'failed';
  metadata?: Record<string, any>;
}

export interface EmergencyTransferEventModel {
  id: string;                    // UUID primary key
  user_id: string;               // Foreign key to users table
  recipient_address: string;     // Stellar public key
  amount: string;                // Amount in base units
  asset_code: string;            // Asset code (XLM, USDC, etc.)
  asset_issuer: string | null;   // Asset issuer (null for XLM)
  transaction_id: string;        // Internal tracking ID
  stellar_tx_hash: string | null;// Stellar transaction hash (after submission)
  memo: string | null;           // Transaction memo
  fee: string;                   // Fee charged
  emergency_fee_applied: boolean;// Whether emergency fee was used
  status: string;                // pending, signed, submitted, failed
  created_at: Date;              // Event creation timestamp
  updated_at: Date;              // Last update timestamp
  metadata: any | null;          // Additional data
}

export interface EmergencyTransferConfig {
  enabled: boolean;
  max_amount_per_transfer: string;
  max_daily_amount: string;
  max_monthly_count: number;
  emergency_fee_percentage: number;  
  standard_fee_percentage: number;   
  memo_prefix: string;               
}

export interface EmergencyLimits {
  maxAmountPerTransfer: string;
  maxDailyAmount: string;
  maxMonthlyCount: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  remainingLimits: {
    dailyAmount: string;
    monthlyCount: number;
  };
}

export enum EmergencyTransferErrorCode {
  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  
  // Validation errors
  INVALID_AMOUNT = 'INVALID_AMOUNT',
  INVALID_RECIPIENT = 'INVALID_RECIPIENT',
  INVALID_ASSET = 'INVALID_ASSET',
  INVALID_MEMO = 'INVALID_MEMO',
  
  // Limit errors
  AMOUNT_EXCEEDS_LIMIT = 'AMOUNT_EXCEEDS_LIMIT',
  DAILY_LIMIT_EXCEEDED = 'DAILY_LIMIT_EXCEEDED',
  MONTHLY_COUNT_EXCEEDED = 'MONTHLY_COUNT_EXCEEDED',
  
  // System errors
  TRANSACTION_BUILD_FAILED = 'TRANSACTION_BUILD_FAILED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NOTIFICATION_FAILED = 'NOTIFICATION_FAILED',
  
  // Configuration errors
  FEATURE_DISABLED = 'FEATURE_DISABLED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

export interface EventFilters {
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  limit?: number;
}
