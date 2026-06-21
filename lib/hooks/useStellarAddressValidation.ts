import { useMemo } from 'react';
import { StrKey } from '@stellar/stellar-sdk';

export type StellarAddressValidationTone = 'idle' | 'error' | 'success';

export interface StellarAddressValidationResult {
  tone: StellarAddressValidationTone;
  message: string;
  normalized: string;
  isValid: boolean;
}

export const normalizeStellarAddress = (value: string) =>
  value.toUpperCase().replace(/\s+/g, '').trim();

export const getStellarAddressValidationResult = (
  rawInput: string
): StellarAddressValidationResult => {
  const normalized = normalizeStellarAddress(rawInput);

  if (!normalized) {
    return {
      tone: 'idle',
      message: 'Paste a Stellar wallet address to verify its checksum before sending.',
      normalized: '',
      isValid: false,
    };
  }

  if (!normalized.startsWith('G')) {
    return {
      tone: 'error',
      message: 'Recipient address must start with G.',
      normalized,
      isValid: false,
    };
  }

  if (normalized.length !== 56) {
    return {
      tone: 'error',
      message: `Recipient address must be 56 characters. ${normalized.length}/56 entered.`,
      normalized,
      isValid: false,
    };
  }

  if (!/^[A-Z2-7]+$/.test(normalized)) {
    return {
      tone: 'error',
      message: 'Recipient address contains unsupported characters.',
      normalized,
      isValid: false,
    };
  }

  if (!StrKey.isValidEd25519PublicKey(normalized)) {
    return {
      tone: 'error',
      message: 'Checksum failed. Double-check the address before sending.',
      normalized,
      isValid: false,
    };
  }

  return {
    tone: 'success',
    message: 'Checksum verified. This is a valid Stellar public key.',
    normalized,
    isValid: true,
  };
};

export default function useStellarAddressValidation(rawInput: string) {
  return useMemo(
    () => getStellarAddressValidationResult(rawInput),
    [rawInput]
  );
}
