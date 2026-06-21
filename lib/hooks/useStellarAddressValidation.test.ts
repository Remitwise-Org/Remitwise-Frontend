import { describe, expect, it } from 'vitest';
import { Keypair } from '@stellar/stellar-sdk';
import { getStellarAddressValidationResult } from './useStellarAddressValidation';

describe('getStellarAddressValidationResult', () => {
  it('returns idle state for empty input', () => {
    expect(getStellarAddressValidationResult('')).toEqual({
      tone: 'idle',
      message: 'Paste a Stellar wallet address to verify its checksum before sending.',
      normalized: '',
      isValid: false,
    });
  });

  it('normalizes whitespace and lowercase input before validating', () => {
    const validAddress = Keypair.random().publicKey();
    const result = getStellarAddressValidationResult(`  ${validAddress.toLowerCase()}  `);

    expect(result).toMatchObject({
      normalized: validAddress,
      isValid: true,
      tone: 'success',
    });
  });

  it('reports the correct length errors for too-short and too-long inputs', () => {
    const validAddress = Keypair.random().publicKey();
    const tooShort = validAddress.slice(0, 55);
    const tooLong = `${validAddress}A`;

    expect(getStellarAddressValidationResult(tooShort)).toMatchObject({
      tone: 'error',
      message: 'Recipient address must be 56 characters. 55/56 entered.',
      isValid: false,
    });

    expect(getStellarAddressValidationResult(tooLong)).toMatchObject({
      tone: 'error',
      message: 'Recipient address must be 56 characters. 57/56 entered.',
      isValid: false,
    });
  });

  it('reports unsupported characters for non-base32 values', () => {
    const result = getStellarAddressValidationResult(`G${'A'.repeat(54)}-`);

    expect(result).toMatchObject({
      tone: 'error',
      message: 'Recipient address contains unsupported characters.',
      isValid: false,
    });
  });

  it('reports checksum failures for structurally valid but bad keys', () => {
    const validAddress = Keypair.random().publicKey();
    const invalidChecksumAddress = `${validAddress.slice(0, -1)}${validAddress.at(-1) === 'A' ? 'B' : 'A'}`;

    const result = getStellarAddressValidationResult(invalidChecksumAddress);

    expect(result).toMatchObject({
      tone: 'error',
      message: 'Checksum failed. Double-check the address before sending.',
      isValid: false,
    });
  });
});
