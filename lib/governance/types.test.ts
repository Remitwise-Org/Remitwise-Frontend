import { describe, it, expect } from 'vitest';
import {
  calculateParameterDiff,
  hasChanges,
  type ParameterChange,
} from './types';
import type { SplitPercentages } from '@/lib/validation/percentages';

describe('Governance Types', () => {
  const currentParameters: SplitPercentages = {
    spending: 50,
    savings: 25,
    bills: 15,
    insurance: 10,
  };

  describe('calculateParameterDiff', () => {
    it('calculates differences correctly for all parameters', () => {
      const proposedParameters: SplitPercentages = {
        spending: 40,
        savings: 30,
        bills: 20,
        insurance: 10,
      };

      const diff = calculateParameterDiff(currentParameters, proposedParameters);

      expect(diff).toHaveLength(4);
      
      const spendingDiff = diff.find((d) => d.key === 'spending');
      expect(spendingDiff).toBeDefined();
      expect(spendingDiff?.currentValue).toBe(50);
      expect(spendingDiff?.proposedValue).toBe(40);
      expect(spendingDiff?.change).toBe(-10);
      expect(spendingDiff?.changePercent).toBe(-20);

      const savingsDiff = diff.find((d) => d.key === 'savings');
      expect(savingsDiff).toBeDefined();
      expect(savingsDiff?.currentValue).toBe(25);
      expect(savingsDiff?.proposedValue).toBe(30);
      expect(savingsDiff?.change).toBe(5);
      expect(savingsDiff?.changePercent).toBe(20);
    });

    it('handles zero current values correctly', () => {
      const zeroCurrent: SplitPercentages = {
        spending: 0,
        savings: 0,
        bills: 0,
        insurance: 100,
      };

      const proposed: SplitPercentages = {
        spending: 25,
        savings: 25,
        bills: 25,
        insurance: 25,
      };

      const diff = calculateParameterDiff(zeroCurrent, proposed);

      const spendingDiff = diff.find((d) => d.key === 'spending');
      expect(spendingDiff?.changePercent).toBe(0); // Division by zero protection
    });

    it('returns all parameter keys', () => {
      const proposedParameters: SplitPercentages = {
        spending: 45,
        savings: 25,
        bills: 20,
        insurance: 10,
      };

      const diff = calculateParameterDiff(currentParameters, proposedParameters);
      const keys = diff.map((d) => d.key);

      expect(keys).toContain('spending');
      expect(keys).toContain('savings');
      expect(keys).toContain('bills');
      expect(keys).toContain('insurance');
    });
  });

  describe('hasChanges', () => {
    it('returns true when there are actual changes', () => {
      const proposedParameters: SplitPercentages = {
        spending: 40,
        savings: 30,
        bills: 20,
        insurance: 10,
      };

      expect(hasChanges(currentParameters, proposedParameters)).toBe(true);
    });

    it('returns false when parameters are identical', () => {
      const identicalParameters: SplitPercentages = {
        spending: 50,
        savings: 25,
        bills: 15,
        insurance: 10,
      };

      expect(hasChanges(currentParameters, identicalParameters)).toBe(false);
    });

    it('returns false for floating point differences within tolerance', () => {
      const nearlyIdentical: SplitPercentages = {
        spending: 50.005,
        savings: 25.003,
        bills: 14.997,
        insurance: 9.995,
      };

      expect(hasChanges(currentParameters, nearlyIdentical)).toBe(false);
    });

    it('returns true for changes exceeding tolerance', () => {
      const slightlyDifferent: SplitPercentages = {
        spending: 50.02,
        savings: 25,
        bills: 15,
        insurance: 9.98,
      };

      expect(hasChanges(currentParameters, slightlyDifferent)).toBe(true);
    });

    it('handles single parameter changes', () => {
      const singleChange: SplitPercentages = {
        spending: 55,
        savings: 25,
        bills: 15,
        insurance: 5,
      };

      expect(hasChanges(currentParameters, singleChange)).toBe(true);
    });
  });
});
