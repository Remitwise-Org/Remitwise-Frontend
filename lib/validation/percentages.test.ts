import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { StrKey } from '@stellar/stellar-sdk';
import {
  ValidationError,
  validatePercentages,
  validateStellarAddress,
  StellarAddressSchema,
  PercentagesSchema,
  type SplitPercentages,
} from './percentages';

const VALID_STELLAR_ADDRESS = StrKey.encodeEd25519PublicKey(new Uint8Array(32));
const INVALID_CHECKSUM_ADDRESS =
  VALID_STELLAR_ADDRESS.slice(0, -1) +
  (VALID_STELLAR_ADDRESS.endsWith('A') ? 'B' : 'A');

describe('ValidationError', () => {
  it('sets name to ValidationError and preserves message', () => {
    const err = new ValidationError('custom message');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.name).toBe('ValidationError');
    expect(err.message).toBe('custom message');
  });
});

describe('validatePercentages', () => {
  it('accepts valid integer percentages summing to 100', () => {
    expect(() =>
      validatePercentages({ spending: 50, savings: 20, bills: 20, insurance: 10 })
    ).not.toThrow();
    expect(() =>
      validatePercentages({ spending: 100, savings: 0, bills: 0, insurance: 0 })
    ).not.toThrow();
  });

  it('accepts non-integer percentages summing to 100 or within 0.01 tolerance', () => {
    expect(() =>
      validatePercentages({ spending: 25.5, savings: 24.5, bills: 25, insurance: 25 })
    ).not.toThrow();
    expect(() =>
      validatePercentages({ spending: 33.333, savings: 33.333, bills: 33.333, insurance: 0 })
    ).not.toThrow();
  });

  it('throws when percentages do not sum to 100 outside tolerance', () => {
    expect(() =>
      validatePercentages({ spending: 50, savings: 20, bills: 20, insurance: 5 })
    ).toThrowError(
      new ValidationError('Percentages must sum to 100. Current sum: 95')
    );

    expect(() =>
      validatePercentages({ spending: 50, savings: 25, bills: 20, insurance: 10 })
    ).toThrowError(
      new ValidationError('Percentages must sum to 100. Current sum: 105')
    );

    expect(() =>
      validatePercentages({ spending: 33.33, savings: 33.33, bills: 33.32, insurance: 0 })
    ).toThrow(ValidationError);
  });

  it('throws when any required field is undefined', () => {
    const expected = new ValidationError(
      'Missing required fields: spending, savings, bills, insurance'
    );
    expect(() =>
      validatePercentages({
        spending: undefined as unknown as number,
        savings: 40,
        bills: 40,
        insurance: 20,
      })
    ).toThrowError(expected);
    expect(() =>
      validatePercentages({
        spending: 40,
        savings: undefined as unknown as number,
        bills: 40,
        insurance: 20,
      })
    ).toThrowError(expected);
    expect(() =>
      validatePercentages({
        spending: 40,
        savings: 40,
        bills: undefined as unknown as number,
        insurance: 20,
      })
    ).toThrowError(expected);
    expect(() =>
      validatePercentages({
        spending: 40,
        savings: 40,
        bills: 20,
        insurance: undefined as unknown as number,
      })
    ).toThrowError(expected);
  });

  it('throws when any percentage is negative', () => {
    const expected = new ValidationError('All percentages must be non-negative');
    expect(() =>
      validatePercentages({ spending: -10, savings: 50, bills: 40, insurance: 20 })
    ).toThrowError(expected);
    expect(() =>
      validatePercentages({ spending: 50, savings: -10, bills: 40, insurance: 20 })
    ).toThrowError(expected);
    expect(() =>
      validatePercentages({ spending: 50, savings: 40, bills: -10, insurance: 20 })
    ).toThrowError(expected);
    expect(() =>
      validatePercentages({ spending: 50, savings: 40, bills: 20, insurance: -10 })
    ).toThrowError(expected);
  });

  it('throws when any percentage is NaN', () => {
    const expected = new ValidationError('All percentages must be valid numbers');
    expect(() =>
      validatePercentages({ spending: Number.NaN, savings: 50, bills: 30, insurance: 20 })
    ).toThrowError(expected);
    expect(() =>
      validatePercentages({ spending: 50, savings: Number.NaN, bills: 30, insurance: 20 })
    ).toThrowError(expected);
    expect(() =>
      validatePercentages({ spending: 50, savings: 30, bills: Number.NaN, insurance: 20 })
    ).toThrowError(expected);
    expect(() =>
      validatePercentages({ spending: 50, savings: 30, bills: 20, insurance: Number.NaN })
    ).toThrowError(expected);
  });

  it('property: any four non-negative integers summing to 100 pass, any other sum fails', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        (spending, savings, bills, insurance) => {
          const split: SplitPercentages = { spending, savings, bills, insurance };
          const sum = spending + savings + bills + insurance;
          if (sum === 100) {
            expect(() => validatePercentages(split)).not.toThrow();
          } else {
            expect(() => validatePercentages(split)).toThrow(ValidationError);
          }
        }
      )
    );

    // Also explicitly generate four non-negative integers guaranteed to sum to 100
    const sumTo100Arb = fc
      .tuple(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 0, max: 100 })
      )
      .map(([a, b, c]) => {
        const sorted = [a, b, c].sort((x, y) => x - y);
        return {
          spending: sorted[0],
          savings: sorted[1] - sorted[0],
          bills: sorted[2] - sorted[1],
          insurance: 100 - sorted[2],
        };
      });

    fc.assert(
      fc.property(sumTo100Arb, (split) => {
        expect(() => validatePercentages(split)).not.toThrow();
      })
    );
  });
});

describe('validateStellarAddress', () => {
  it('accepts a valid Stellar Ed25519 public key', () => {
    expect(() => validateStellarAddress(VALID_STELLAR_ADDRESS)).not.toThrow();
  });

  it('accepts a valid Stellar address with surrounding whitespace or lowercase', () => {
    expect(() =>
      validateStellarAddress(`  ${VALID_STELLAR_ADDRESS.toLowerCase()}  `)
    ).not.toThrow();
  });

  it('throws for empty or non-string addresses', () => {
    const expected = new ValidationError('Address must be a non-empty string');
    expect(() => validateStellarAddress('')).toThrowError(expected);
    expect(() =>
      validateStellarAddress(null as unknown as string)
    ).toThrowError(expected);
    expect(() =>
      validateStellarAddress(undefined as unknown as string)
    ).toThrowError(expected);
    expect(() =>
      validateStellarAddress(12345 as unknown as string)
    ).toThrowError(expected);
  });

  it('throws for invalid Stellar address format', () => {
    const expected = new ValidationError('Invalid Stellar address format');
    expect(() => validateStellarAddress('   ')).toThrowError(expected);
    expect(() => validateStellarAddress('GSHORT')).toThrowError(expected);
    expect(() =>
      validateStellarAddress('S' + VALID_STELLAR_ADDRESS.slice(1))
    ).toThrowError(expected);
    expect(() =>
      validateStellarAddress(VALID_STELLAR_ADDRESS + 'A')
    ).toThrowError(expected);
    expect(() =>
      validateStellarAddress('G' + '0'.repeat(55))
    ).toThrowError(expected);
  });

  it('throws for valid format with invalid checksum', () => {
    expect(() => validateStellarAddress(INVALID_CHECKSUM_ADDRESS)).toThrowError(
      new ValidationError('Invalid Stellar address checksum')
    );
  });
});

describe('StellarAddressSchema', () => {
  it('accepts a valid Stellar address', () => {
    expect(StellarAddressSchema.safeParse(VALID_STELLAR_ADDRESS).success).toBe(true);
    expect(
      StellarAddressSchema.safeParse(` ${VALID_STELLAR_ADDRESS.toLowerCase()} `).success
    ).toBe(true);
  });

  it('rejects an invalid Stellar address with custom message', () => {
    const result = StellarAddressSchema.safeParse(INVALID_CHECKSUM_ADDRESS);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe('Invalid Stellar address');
    }
  });

  it('rejects non-string input', () => {
    expect(StellarAddressSchema.safeParse(123).success).toBe(false);
  });
});

describe('PercentagesSchema', () => {
  it('accepts valid percentages summing to 100', () => {
    const result = PercentagesSchema.safeParse({
      spending: 40,
      savings: 30,
      bills: 20,
      insurance: 10,
    });
    expect(result.success).toBe(true);
  });

  it('rejects percentages that do not sum to 100', () => {
    const result = PercentagesSchema.safeParse({
      spending: 40,
      savings: 30,
      bills: 20,
      insurance: 5,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'Percentages must sum to 100. Current sum: 95'
      );
    }
  });

  it('rejects negative percentages', () => {
    const result = PercentagesSchema.safeParse({
      spending: -10,
      savings: 50,
      bills: 40,
      insurance: 20,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        'All percentages must be non-negative'
      );
    }
  });

  it('rejects NaN values', () => {
    const result = PercentagesSchema.safeParse({
      spending: Number.NaN,
      savings: 50,
      bills: 30,
      insurance: 20,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields and extra unknown fields (strict)', () => {
    expect(
      PercentagesSchema.safeParse({ spending: 50, savings: 50, bills: 0 }).success
    ).toBe(false);
    expect(
      PercentagesSchema.safeParse({
        spending: 40,
        savings: 30,
        bills: 20,
        insurance: 10,
        extra: 0,
      }).success
    ).toBe(false);
  });
});
