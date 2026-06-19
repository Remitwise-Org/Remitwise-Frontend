/**
 * Integration tests for cached contract wrappers
 * Tests validation, error handling, and caching behavior
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearCache } from '@/lib/cache/contract-cache';
import * as remittanceSplitCached from '@/lib/contracts/remittance-split-cached';
import * as insuranceCached from '@/lib/contracts/insurance-cached';

// Mock the original contract modules
vi.mock('@/lib/contracts/remittance-split', () => ({
  getSplit: vi.fn(async (env) => ({
    savings_percent: 30,
    bills_percent: 25,
    insurance_percent: 20,
    family_percent: 25,
  })),
  getConfig: vi.fn(async (env) => ({
    savings_percent: 30,
    bills_percent: 25,
    insurance_percent: 20,
    family_percent: 25,
  })),
  calculateSplit: vi.fn(async (amount, env) => ({
    savings: '300',
    bills: '250',
    insurance: '200',
    family: '250',
    remainder: '0',
  })),
}));

vi.mock('@/lib/contracts/insurance', () => ({
  getPolicy: vi.fn(async (id) => ({
    id,
    name: 'Test Policy',
    coverageType: 'health',
    monthlyPremium: 100,
    coverageAmount: 10000,
    active: true,
    nextPaymentDate: '2024-01-01',
  })),
  getActivePolicies: vi.fn(async (owner) => [
    {
      id: 'policy-1',
      name: 'Test Policy 1',
      coverageType: 'health',
      monthlyPremium: 100,
      coverageAmount: 10000,
      active: true,
      nextPaymentDate: '2024-01-01',
    },
  ]),
  getTotalMonthlyPremium: vi.fn(async (owner) => 100),
}));

describe('Remittance Split Cached Wrapper', () => {
  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
  });

  describe('getSplit', () => {
    it('should return split configuration', async () => {
      const result = await remittanceSplitCached.getSplit('testnet');

      expect(result).toEqual({
        savings_percent: 30,
        bills_percent: 25,
        insurance_percent: 20,
        family_percent: 25,
      });
    });

    it('should validate environment parameter', async () => {
      await expect(
        remittanceSplitCached.getSplit('invalid' as any)
      ).rejects.toThrow('Invalid environment');
    });

    it('should cache results', async () => {
      const originalModule = await import('@/lib/contracts/remittance-split');

      await remittanceSplitCached.getSplit('testnet');
      await remittanceSplitCached.getSplit('testnet');

      expect(originalModule.getSplit).toHaveBeenCalledTimes(1);
    });

    it('should handle RPC errors', async () => {
      const originalModule = await import('@/lib/contracts/remittance-split');
      vi.mocked(originalModule.getSplit).mockRejectedValueOnce(new Error('RPC Error'));

      await expect(
        remittanceSplitCached.getSplit('testnet')
      ).rejects.toThrow('Failed to get split configuration');
    });
  });

  describe('getConfig', () => {
    it('should return config', async () => {
      const result = await remittanceSplitCached.getConfig('testnet');

      expect(result).toEqual({
        savings_percent: 30,
        bills_percent: 25,
        insurance_percent: 20,
        family_percent: 25,
      });
    });

    it('should validate environment parameter', async () => {
      await expect(
        remittanceSplitCached.getConfig('invalid' as any)
      ).rejects.toThrow('Invalid environment');
    });
  });

  describe('calculateSplit', () => {
    it('should calculate split amounts', async () => {
      const result = await remittanceSplitCached.calculateSplit(1000, 'testnet');

      expect(result).toEqual({
        savings: '300',
        bills: '250',
        insurance: '200',
        family: '250',
        remainder: '0',
      });
    });

    it('should validate amount is a number', async () => {
      await expect(
        remittanceSplitCached.calculateSplit('1000' as any, 'testnet')
      ).rejects.toThrow('Invalid amount');

      await expect(
        remittanceSplitCached.calculateSplit(NaN, 'testnet')
      ).rejects.toThrow('Invalid amount');

      await expect(
        remittanceSplitCached.calculateSplit(Infinity, 'testnet')
      ).rejects.toThrow('Invalid amount');
    });

    it('should validate amount is non-negative', async () => {
      await expect(
        remittanceSplitCached.calculateSplit(-100, 'testnet')
      ).rejects.toThrow('Invalid amount');
    });

    it('should validate amount is an integer', async () => {
      await expect(
        remittanceSplitCached.calculateSplit(100.5, 'testnet')
      ).rejects.toThrow('Invalid amount');
    });

    it('should validate environment parameter', async () => {
      await expect(
        remittanceSplitCached.calculateSplit(1000, 'invalid' as any)
      ).rejects.toThrow('Invalid environment');
    });

    it('should cache results for specific amounts', async () => {
      const originalModule = await import('@/lib/contracts/remittance-split');

      await remittanceSplitCached.calculateSplit(1000, 'testnet');
      await remittanceSplitCached.calculateSplit(1000, 'testnet');
      await remittanceSplitCached.calculateSplit(2000, 'testnet');

      expect(originalModule.calculateSplit).toHaveBeenCalledTimes(2);
    });
  });
});

describe('Insurance Cached Wrapper', () => {
  beforeEach(() => {
    clearCache();
    vi.clearAllMocks();
  });

  describe('getPolicy', () => {
    it('should return policy', async () => {
      const result = await insuranceCached.getPolicy('policy-123');

      expect(result).toEqual({
        id: 'policy-123',
        name: 'Test Policy',
        coverageType: 'health',
        monthlyPremium: 100,
        coverageAmount: 10000,
        active: true,
        nextPaymentDate: '2024-01-01',
      });
    });

    it('should validate policy ID', async () => {
      await expect(
        insuranceCached.getPolicy('')
      ).rejects.toThrow('Policy ID must be a non-empty string');

      await expect(
        insuranceCached.getPolicy('invalid<script>')
      ).rejects.toThrow('Policy ID contains invalid characters');

      await expect(
        insuranceCached.getPolicy('x'.repeat(200))
      ).rejects.toThrow('Policy ID exceeds maximum length');
    });

    it('should cache results', async () => {
      const originalModule = await import('@/lib/contracts/insurance');

      await insuranceCached.getPolicy('policy-123');
      await insuranceCached.getPolicy('policy-123');

      expect(originalModule.getPolicy).toHaveBeenCalledTimes(1);
    });

    it('should preserve NOT_FOUND errors', async () => {
      const originalModule = await import('@/lib/contracts/insurance');
      const notFoundError = new Error('Policy not found');
      (notFoundError as any).code = 'NOT_FOUND';
      vi.mocked(originalModule.getPolicy).mockRejectedValueOnce(notFoundError);

      await expect(
        insuranceCached.getPolicy('policy-999')
      ).rejects.toThrow('Policy not found');
    });
  });

  describe('getActivePolicies', () => {
    it('should return active policies', async () => {
      const result = await insuranceCached.getActivePolicies('GABC1234567890123456789012345678901234567890123456789012');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('policy-1');
    });

    it('should validate Stellar address format', async () => {
      await expect(
        insuranceCached.getActivePolicies('')
      ).rejects.toThrow('owner must be a non-empty string');

      await expect(
        insuranceCached.getActivePolicies('invalid')
      ).rejects.toThrow('owner must be a valid Stellar address');

      await expect(
        insuranceCached.getActivePolicies('XABC1234567890123456789012345678901234567890123456789012')
      ).rejects.toThrow('owner must be a valid Stellar address');
    });

    it('should cache results', async () => {
      const originalModule = await import('@/lib/contracts/insurance');
      const address = 'GABC1234567890123456789012345678901234567890123456789012';

      await insuranceCached.getActivePolicies(address);
      await insuranceCached.getActivePolicies(address);

      expect(originalModule.getActivePolicies).toHaveBeenCalledTimes(1);
    });

    it('should preserve INVALID_ADDRESS errors', async () => {
      const originalModule = await import('@/lib/contracts/insurance');
      const invalidError = new Error('Invalid address');
      (invalidError as any).code = 'INVALID_ADDRESS';
      vi.mocked(originalModule.getActivePolicies).mockRejectedValueOnce(invalidError);

      await expect(
        insuranceCached.getActivePolicies('GABC1234567890123456789012345678901234567890123456789012')
      ).rejects.toThrow('Invalid address');
    });
  });

  describe('getTotalMonthlyPremium', () => {
    it('should return total premium', async () => {
      const result = await insuranceCached.getTotalMonthlyPremium('GABC1234567890123456789012345678901234567890123456789012');

      expect(result).toBe(100);
    });

    it('should validate Stellar address format', async () => {
      await expect(
        insuranceCached.getTotalMonthlyPremium('')
      ).rejects.toThrow('owner must be a non-empty string');

      await expect(
        insuranceCached.getTotalMonthlyPremium('invalid')
      ).rejects.toThrow('owner must be a valid Stellar address');
    });

    it('should validate premium is a valid number', async () => {
      const originalModule = await import('@/lib/contracts/insurance');
      vi.mocked(originalModule.getTotalMonthlyPremium).mockResolvedValueOnce(NaN);

      await expect(
        insuranceCached.getTotalMonthlyPremium('GABC1234567890123456789012345678901234567890123456789012')
      ).rejects.toThrow('Invalid premium value');
    });

    it('should validate premium is non-negative', async () => {
      const originalModule = await import('@/lib/contracts/insurance');
      vi.mocked(originalModule.getTotalMonthlyPremium).mockResolvedValueOnce(-100);

      await expect(
        insuranceCached.getTotalMonthlyPremium('GABC1234567890123456789012345678901234567890123456789012')
      ).rejects.toThrow('Premium cannot be negative');
    });

    it('should cache results', async () => {
      const originalModule = await import('@/lib/contracts/insurance');
      const address = 'GABC1234567890123456789012345678901234567890123456789012';

      await insuranceCached.getTotalMonthlyPremium(address);
      await insuranceCached.getTotalMonthlyPremium(address);

      expect(originalModule.getTotalMonthlyPremium).toHaveBeenCalledTimes(1);
    });
  });
});
