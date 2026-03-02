import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateAmount,
  validateFutureDate,
  validateGoalId,
  validateGoalName,
  validatePublicKey,
} from '@/lib/validation/savings-goals';

describe('Validation Functions - Unit Tests', () => {
  describe('validateAmount', () => {
    it('should accept positive numbers', () => {
      expect(validateAmount(1).isValid).toBe(true);
      expect(validateAmount(100).isValid).toBe(true);
      expect(validateAmount(0.01).isValid).toBe(true);
      expect(validateAmount(1000000).isValid).toBe(true);
    });

    it('should reject zero', () => {
      const result = validateAmount(0);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount must be positive');
    });

    it('should reject negative numbers', () => {
      const result = validateAmount(-1);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount must be positive');
    });

    it('should reject NaN', () => {
      const result = validateAmount(NaN);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount cannot be NaN');
    });

    it('should reject Infinity', () => {
      const result = validateAmount(Infinity);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount must be finite');
    });

    it('should reject negative Infinity', () => {
      const result = validateAmount(-Infinity);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount must be finite');
    });

    it('should reject non-number types', () => {
      const result = validateAmount('100' as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Amount must be a number');
    });
  });

  describe('validateFutureDate', () => {
    it('should accept future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      
      const result = validateFutureDate(futureDate.toISOString());
      expect(result.isValid).toBe(true);
    });

    it('should reject past dates', () => {
      const pastDate = new Date('2020-01-01T00:00:00Z');
      const result = validateFutureDate(pastDate.toISOString());
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Target date must be in the future');
    });

    it('should reject current date/time', () => {
      const now = new Date();
      const result = validateFutureDate(now.toISOString());
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Target date must be in the future');
    });

    it('should reject invalid date strings', () => {
      const result = validateFutureDate('not-a-date');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid date format');
    });

    it('should reject empty strings', () => {
      const result = validateFutureDate('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Date must be a non-empty string');
    });

    it('should reject non-string types', () => {
      const result = validateFutureDate(123 as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Date must be a non-empty string');
    });
  });

  describe('validateGoalId', () => {
    it('should accept non-empty strings', () => {
      expect(validateGoalId('goal_123').isValid).toBe(true);
      expect(validateGoalId('abc').isValid).toBe(true);
      expect(validateGoalId('12345').isValid).toBe(true);
    });

    it('should reject empty strings', () => {
      const result = validateGoalId('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Goal ID must be a non-empty string');
    });

    it('should reject whitespace-only strings', () => {
      const result = validateGoalId('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Goal ID cannot be empty or whitespace');
    });

    it('should reject non-string types', () => {
      const result = validateGoalId(123 as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Goal ID must be a non-empty string');
    });
  });

  describe('validateGoalName', () => {
    it('should accept valid names', () => {
      expect(validateGoalName('Emergency Fund').isValid).toBe(true);
      expect(validateGoalName('a').isValid).toBe(true);
      expect(validateGoalName('A'.repeat(100)).isValid).toBe(true);
    });

    it('should reject empty strings', () => {
      const result = validateGoalName('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Goal name must be a non-empty string');
    });

    it('should reject whitespace-only strings', () => {
      const result = validateGoalName('   ');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Goal name cannot be empty or whitespace');
    });

    it('should reject names longer than 100 characters', () => {
      const result = validateGoalName('A'.repeat(101));
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Goal name cannot exceed 100 characters');
    });

    it('should reject non-string types', () => {
      const result = validateGoalName(123 as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Goal name must be a non-empty string');
    });
  });

  describe('validatePublicKey', () => {
    it('should accept valid Stellar public keys', () => {
      const validKey = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
      expect(validatePublicKey(validKey).isValid).toBe(true);
    });

    it('should reject keys not starting with G', () => {
      const invalidKey = 'ABRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
      const result = validatePublicKey(invalidKey);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid Stellar public key format');
    });

    it('should reject keys with incorrect length', () => {
      const shortKey = 'GBRPYHIL2CI3FNQ4';
      const result = validatePublicKey(shortKey);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid Stellar public key format');
    });

    it('should reject empty strings', () => {
      const result = validatePublicKey('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Public key must be a non-empty string');
    });

    it('should reject non-string types', () => {
      const result = validatePublicKey(123 as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Public key must be a non-empty string');
    });
  });
});
