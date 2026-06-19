import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateAmount,
  validateFutureDate,
  validateGoalId,
  validateGoalName,
} from '@/lib/validation/savings-goals';
import {
  validatePercentages,
  validateStellarAddress,
  ValidationError,
  SplitPercentages,
} from '@/lib/validation/percentages';

/**
 * Property-Based Tests for Validation Functions
 * Feature: savings-goals-transactions
 * 
 * These tests verify correctness properties across many randomly generated inputs.
 */

describe('Validation Properties - Property-Based Tests', () => {
  /**
   * Property 2: Amount validation rejects non-positive values
   * Validates: Requirements 1.3, 2.2, 3.2
   * 
   * For any amount that is zero, negative, NaN, or infinite,
   * the validation function should return isValid: false with an appropriate error message.
   */
  it('Property 2: Amount validation rejects non-positive values', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(0),
          fc.double({ min: -1000000, max: -0.0001 }),
          fc.constant(NaN),
          fc.constant(Infinity),
          fc.constant(-Infinity)
        ),
        (invalidAmount) => {
          const result = validateAmount(invalidAmount);
          return result.isValid === false && result.error !== undefined;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2 (positive case): Amount validation accepts positive values', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.0001, max: 1000000, noNaN: true }),
        (validAmount) => {
          const result = validateAmount(validAmount);
          return result.isValid === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 3: Goal ID validation rejects empty strings
   * Validates: Requirements 2.3, 3.3, 4.2, 5.2
   * 
   * For any string that is empty or contains only whitespace,
   * the goal ID validation should return isValid: false.
   */
  it('Property 3: Goal ID validation rejects empty strings', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.constant('\t\t'),
          fc.constant('\n\n')
        ),
        (emptyOrWhitespace) => {
          const result = validateGoalId(emptyOrWhitespace);
          return result.isValid === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 3 (positive case): Goal ID validation accepts non-empty strings', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        (validGoalId) => {
          const result = validateGoalId(validGoalId);
          return result.isValid === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 4: Goal name validation enforces length constraints
   * Validates: Requirements 1.2
   * 
   * For any string with length less than 1 or greater than 100 characters,
   * the goal name validation should return isValid: false.
   */
  it('Property 4: Goal name validation rejects names over 100 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 101, maxLength: 200 }),
        (longName) => {
          const result = validateGoalName(longName);
          return result.isValid === false && result.error?.includes('100 characters');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4: Goal name validation rejects empty names', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.constant('\t\t'),
          fc.constant('\n\n')
        ),
        (emptyName) => {
          const result = validateGoalName(emptyName);
          return result.isValid === false;
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 4 (positive case): Goal name validation accepts valid names', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        (validName) => {
          const result = validateGoalName(validName);
          return result.isValid === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 5: Future date validation rejects past dates
   * Validates: Requirements 1.4
   * 
   * For any date string representing a time in the past or present,
   * the date validation should return isValid: false.
   */
  it('Property 5: Future date validation rejects past dates', () => {
    const now = Date.now();
    fc.assert(
      fc.property(
        fc.date({ max: new Date(now - 1000) }).filter(d => !isNaN(d.getTime())), // At least 1 second in the past
        (pastDate) => {
          const result = validateFutureDate(pastDate.toISOString());
          return result.isValid === false && result.error?.includes('future');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5 (positive case): Future date validation accepts future dates', () => {
    const now = Date.now();
    fc.assert(
      fc.property(
        fc.date({ min: new Date(now + 60000) }).filter(d => !isNaN(d.getTime())), // At least 1 minute in the future
        (futureDate) => {
          const result = validateFutureDate(futureDate.toISOString());
          return result.isValid === true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 10: Percentage validation accepts sets that sum to ~100
   */
  it('Property 10: validatePercentages accepts sets that sum to 100', () => {
    fc.assert(
      fc.property(
        fc.array(fc.double({ min: 0, max: 100, noNaN: true, noDefaultInfinity: true }), { minLength: 4, maxLength: 4 }),
        (arr) => {
          const total = arr.reduce((s, v) => s + v, 0);
          const factor = total === 0 ? 0 : 100 / total;
          const percentages: SplitPercentages = {
            spending: total === 0 ? 25 : arr[0] * factor,
            savings: total === 0 ? 25 : arr[1] * factor,
            bills: total === 0 ? 25 : arr[2] * factor,
            insurance: total === 0 ? 25 : arr[3] * factor,
          };
          
          // Should not throw
          expect(() => validatePercentages(percentages)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 11: validatePercentages rejects negative values', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3 }),
        fc.double({ min: -100, max: -0.01, noNaN: true, noDefaultInfinity: true }),
        (negativeIndex, negativeValue) => {
          const p: SplitPercentages = { spending: 25, savings: 25, bills: 25, insurance: 25 };
          const keys = ['spending', 'savings', 'bills', 'insurance'] as const;
          p[keys[negativeIndex]] = negativeValue;
          
          expect(() => validatePercentages(p)).toThrow('must be non-negative');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 12: validatePercentages rejects sums not equal to 100', () => {
    fc.assert(
      fc.property(
        fc.double({ noNaN: true, noDefaultInfinity: true }).filter(s => Math.abs(s - 100) > 0.1),
        (invalidSum) => {
          const p: SplitPercentages = { 
            spending: invalidSum / 4, 
            savings: invalidSum / 4, 
            bills: invalidSum / 4, 
            insurance: invalidSum / 4 
          };
          // Filter out negative results which might trigger the negative value check first
          if (p.spending < 0) return true; 

          try {
            validatePercentages(p);
            return false;
          } catch (e) {
            return (e as Error).message.includes('sum');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 13: validateStellarAddress accepts valid-looking addresses
   * 
   * NOTE: This validator uses a regex check (^G[A-Z0-9]{55}$) which is a 
   * structural check only. It does NOT verify the Base32 checksum or use 
   * the Stellar StrKey encoding validation (which uses CRC16).
   * 
   * Discrepancy: The UI (RecipientAddressInput) uses a stricter validation 
   * that includes checksum verification. The server-side regex is a 
   * permissive fallback. The intended source of truth for full validation 
   * should be the Stellar SDK's StrKey.decodeEd25519PublicKey, but for 
   * basic property coverage, we verify the regex's invariants.
   */
  it('Property 13: validateStellarAddress accepts valid-looking addresses', () => {
    const stellarAlphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('');
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...stellarAlphabet), { minLength: 55, maxLength: 55 }),
        (arr) => {
          const address = 'G' + arr.join('');
          expect(() => validateStellarAddress(address)).not.toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 14: validateStellarAddress rejects adversarial inputs', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string().filter(s => s.length !== 56), // Wrong length
          fc.string({ minLength: 56, maxLength: 56 }).filter(s => !s.startsWith('G')), // Wrong prefix
          fc.string({ minLength: 56, maxLength: 56, alphabet: 'abcdefghijklmnopqrstuvwxyz' }), // Lowercase
          fc.string({ minLength: 56, maxLength: 56 }).filter(s => /[^A-Z0-9]/.test(s)), // Illegal characters
          fc.constant(''), // Empty
          fc.constant(null as any), // Non-string
          fc.constant(undefined as any) // Non-string
        ),
        (invalidAddress) => {
          // All these should throw ValidationError
          expect(() => validateStellarAddress(invalidAddress)).toThrow();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 9: Error responses have consistent structure
   * Validates: Requirements 8.2
   * 
   * For any error response from any validation function,
   * the response should contain an "error" field with a string message.
   */
  it('Property 9: All validation errors have consistent structure', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant({ fn: validateAmount, input: -1 }),
          fc.constant({ fn: validateGoalId, input: '' }),
          fc.constant({ fn: validateGoalName, input: '' }),
          fc.constant({ fn: validateFutureDate, input: '2020-01-01' })
        ),
        (testCase) => {
          const result = testCase.fn(testCase.input as any);
          return (
            result.isValid === false &&
            typeof result.error === 'string' &&
            result.error.length > 0
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});

