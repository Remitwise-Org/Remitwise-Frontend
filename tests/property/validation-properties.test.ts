import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import {
  validateAmount,
  validateFutureDate,
  validateGoalId,
  validateGoalName,
} from '@/lib/validation/savings-goals';

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
    fc.assert(
      fc.property(
        fc.date({ max: new Date(Date.now() - 1000) }), // At least 1 second in the past
        (pastDate) => {
          const result = validateFutureDate(pastDate.toISOString());
          return result.isValid === false && result.error?.includes('future');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 5 (positive case): Future date validation accepts future dates', () => {
    fc.assert(
      fc.property(
        fc.date({ min: new Date(Date.now() + 60000) }), // At least 1 minute in the future
        (futureDate) => {
          const result = validateFutureDate(futureDate.toISOString());
          return result.isValid === true;
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
