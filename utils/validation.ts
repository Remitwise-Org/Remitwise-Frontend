// Request Validation Utilities

import { EmergencyTransferErrorCode } from '@/types/emergency-transfer';
import { StrKey } from '@stellar/stellar-sdk';

export interface ValidationError {
  code: EmergencyTransferErrorCode;
  message: string;
  field?: string;
}

/**
 * Validates amount is positive, numeric, and within bounds
 */
export function validateAmount(amount: string): ValidationError | null {
  // Check if amount is provided
  if (!amount || amount.trim() === '') {
    return {
      code: EmergencyTransferErrorCode.INVALID_AMOUNT,
      message: 'Amount is required',
      field: 'amount',
    };
  }

  // Check if amount is numeric
  if (!/^\d+$/.test(amount)) {
    return {
      code: EmergencyTransferErrorCode.INVALID_AMOUNT,
      message: 'Amount must be a valid number',
      field: 'amount',
    };
  }

  // Check if amount is positive
  const amountBigInt = BigInt(amount);
  if (amountBigInt <= BigInt(0)) {
    return {
      code: EmergencyTransferErrorCode.INVALID_AMOUNT,
      message: 'Amount must be greater than zero',
      field: 'amount',
    };
  }

  // Check if amount is within reasonable bounds (max 1 trillion stroops = 100,000 XLM)
  const maxAmount = BigInt('1000000000000');
  if (amountBigInt > maxAmount) {
    return {
      code: EmergencyTransferErrorCode.INVALID_AMOUNT,
      message: 'Amount exceeds maximum allowed value',
      field: 'amount',
    };
  }

  return null;
}

/**
 * Validates recipient address is a valid Stellar public key (G... format, 56 chars)
 */
export function validateRecipientAddress(address: string): ValidationError | null {
  const normalizedAddress = address.trim().toUpperCase();

  // Check if address is provided
  if (!address || normalizedAddress === '') {
    return {
      code: EmergencyTransferErrorCode.INVALID_RECIPIENT,
      message: 'Recipient address is required',
      field: 'recipientAddress',
    };
  }

  // Check if address starts with 'G'
  if (!normalizedAddress.startsWith('G')) {
    return {
      code: EmergencyTransferErrorCode.INVALID_RECIPIENT,
      message: 'Recipient address must start with G',
      field: 'recipientAddress',
    };
  }

  // Check if address is exactly 56 characters
  if (normalizedAddress.length !== 56) {
    return {
      code: EmergencyTransferErrorCode.INVALID_RECIPIENT,
      message: 'Recipient address must be exactly 56 characters',
      field: 'recipientAddress',
    };
  }

  // Check if address contains only valid base32 characters
  const base32Regex = /^[A-Z2-7]+$/;
  if (!base32Regex.test(normalizedAddress)) {
    return {
      code: EmergencyTransferErrorCode.INVALID_RECIPIENT,
      message: 'Recipient address contains invalid characters',
      field: 'recipientAddress',
    };
  }

  // Validate Stellar checksum
  if (!StrKey.isValidEd25519PublicKey(normalizedAddress)) {
    return {
      code: EmergencyTransferErrorCode.INVALID_RECIPIENT,
      message: 'Recipient address checksum is invalid',
      field: 'recipientAddress',
    };
  }

  return null;
}

/**
 * Validates asset code is 1-12 alphanumeric characters
 */
export function validateAssetCode(assetCode?: string): ValidationError | null {
  // Asset code is optional, default to XLM
  if (!assetCode || assetCode === 'XLM') {
    return null;
  }

  // Check length
  if (assetCode.length < 1 || assetCode.length > 12) {
    return {
      code: EmergencyTransferErrorCode.INVALID_ASSET,
      message: 'Asset code must be between 1 and 12 characters',
      field: 'assetCode',
    };
  }

  // Check if alphanumeric
  const alphanumericRegex = /^[A-Za-z0-9]+$/;
  if (!alphanumericRegex.test(assetCode)) {
    return {
      code: EmergencyTransferErrorCode.INVALID_ASSET,
      message: 'Asset code must contain only alphanumeric characters',
      field: 'assetCode',
    };
  }

  return null;
}

/**
 * Validates memo is within 28 bytes
 */
export function validateMemo(memo?: string): ValidationError | null {
  // Memo is optional
  if (!memo) {
    return null;
  }

  // Check byte length (UTF-8 encoding)
  const byteLength = new TextEncoder().encode(memo).length;
  if (byteLength > 28) {
    return {
      code: EmergencyTransferErrorCode.INVALID_MEMO,
      message: 'Memo must not exceed 28 bytes',
      field: 'memo',
    };
  }

  return null;
}

/**
 * Validates asset issuer is required for non-native assets
 */
export function validateAssetIssuer(
  assetCode?: string,
  assetIssuer?: string
): ValidationError | null {
  // If asset is XLM or not provided, issuer is not needed
  if (!assetCode || assetCode === 'XLM') {
    return null;
  }

  // For non-native assets, issuer is required
  if (!assetIssuer || assetIssuer.trim() === '') {
    return {
      code: EmergencyTransferErrorCode.INVALID_ASSET,
      message: 'Asset issuer is required for non-native assets',
      field: 'assetIssuer',
    };
  }

  // Validate issuer is a valid Stellar address
  return validateRecipientAddress(assetIssuer);
}

/**
 * Validates entire emergency transfer request
 */
export function validateEmergencyTransferRequest(request: {
  amount: string;
  recipientAddress: string;
  memo?: string;
  assetCode?: string;
  assetIssuer?: string;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate amount
  const amountError = validateAmount(request.amount);
  if (amountError) errors.push(amountError);

  // Validate recipient address
  const recipientError = validateRecipientAddress(request.recipientAddress);
  if (recipientError) errors.push(recipientError);

  // Validate asset code
  const assetCodeError = validateAssetCode(request.assetCode);
  if (assetCodeError) errors.push(assetCodeError);

  // Validate asset issuer
  const assetIssuerError = validateAssetIssuer(request.assetCode, request.assetIssuer);
  if (assetIssuerError) errors.push(assetIssuerError);

  // Validate memo
  const memoError = validateMemo(request.memo);
  if (memoError) errors.push(memoError);

  return errors;
}
