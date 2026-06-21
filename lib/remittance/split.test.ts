import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeAllocation, DEFAULT_SPLIT_CONFIG, type SplitConfig } from './split';

describe('computeAllocation', () => {
  const sumBuckets = (r: { spending: number; savings: number; bills: number; insurance: number }) =>
    r.spending + r.savings + r.bills + r.insurance;

  describe('DEFAULT_SPLIT_CONFIG', () => {
    it('sums to 100 and matches split page defaults', () => {
      const total =
        DEFAULT_SPLIT_CONFIG.spending +
        DEFAULT_SPLIT_CONFIG.savings +
        DEFAULT_SPLIT_CONFIG.bills +
        DEFAULT_SPLIT_CONFIG.insurance;
      expect(total).toBe(100);
      expect(DEFAULT_SPLIT_CONFIG.spending).toBe(50);
      expect(DEFAULT_SPLIT_CONFIG.savings).toBe(30);
      expect(DEFAULT_SPLIT_CONFIG.bills).toBe(15);
      expect(DEFAULT_SPLIT_CONFIG.insurance).toBe(5);
    });
  });

  describe('conservation invariant', () => {
    it('holds for arbitrary non-negative amounts (property-based)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1_000_000, noNaN: true, noDefaultInfinity: true }),
          (amount) => {
            const result = computeAllocation(amount);
            return Math.abs(sumBuckets(result) - amount) < 0.001;
          }
        ),
        { numRuns: 1000 }
      );
    });

    it('holds for arbitrary negative amounts (property-based)', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1_000_000, max: 0, noNaN: true, noDefaultInfinity: true }),
          (amount) => {
            const result = computeAllocation(amount);
            return Math.abs(sumBuckets(result) - amount) < 0.001;
          }
        ),
        { numRuns: 500 }
      );
    });

    it('holds for DEFAULT_SPLIT_CONFIG across many amounts', () => {
      for (const amount of [0, 1, 10, 50, 99, 100, 101, 500, 1000, 10_000, 1_000_000]) {
        const result = computeAllocation(amount);
        expect(sumBuckets(result)).toBe(amount);
      }
    });
  });

  describe('remainder lands on spending', () => {
    it('spending absorbs rounding surplus', () => {
      const config: SplitConfig = { spending: 33, savings: 33, bills: 33, insurance: 1 };
      const result = computeAllocation(4, config);
      expect(result.spending).toBe(2);
      expect(result.savings).toBe(1);
      expect(result.bills).toBe(1);
      expect(result.insurance).toBe(0);
      expect(sumBuckets(result)).toBe(4);
    });

    it('spending absorbs rounding deficit', () => {
      const config: SplitConfig = { spending: 25, savings: 25, bills: 25, insurance: 25 };
      const result = computeAllocation(1, config);
      expect(result.spending).toBe(1);
      expect(result.savings).toBe(0);
      expect(result.bills).toBe(0);
      expect(result.insurance).toBe(0);
      expect(sumBuckets(result)).toBe(1);
    });

    it('no remainder when rounding is exact', () => {
      const config: SplitConfig = { spending: 50, savings: 30, bills: 15, insurance: 5 };
      const result = computeAllocation(200, config);
      expect(result.spending).toBe(100);
      expect(result.savings).toBe(60);
      expect(result.bills).toBe(30);
      expect(result.insurance).toBe(10);
      expect(sumBuckets(result)).toBe(200);
    });
  });

  describe('edge amounts', () => {
    it('handles amount = 0', () => {
      const result = computeAllocation(0);
      expect(result.spending).toBe(0);
      expect(result.savings).toBe(0);
      expect(result.bills).toBe(0);
      expect(result.insurance).toBe(0);
    });

    it('handles amount = 1', () => {
      const result = computeAllocation(1);
      expect(sumBuckets(result)).toBe(1);
    });

    it('handles odd amounts that force remainder onto spending', () => {
      for (const amount of [3, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]) {
        const result = computeAllocation(amount);
        expect(sumBuckets(result)).toBe(amount);
      }
    });

    it('handles large values', () => {
      const result = computeAllocation(10_000_000);
      expect(sumBuckets(result)).toBe(10_000_000);
    });

    it('handles very small decimal amounts', () => {
      const result = computeAllocation(0.01);
      expect(Math.abs(sumBuckets(result) - 0.01)).toBeLessThan(0.0001);
    });

    it('handles floating point edge (0.1 + 0.2)', () => {
      const amount = 0.1 + 0.2;
      const result = computeAllocation(amount);
      expect(Math.abs(sumBuckets(result) - amount)).toBeLessThan(0.001);
    });
  });

  describe('throw on invalid config', () => {
    it('throws when config sums to more than 100', () => {
      const config: SplitConfig = { spending: 60, savings: 30, bills: 15, insurance: 10 };
      expect(() => computeAllocation(100, config)).toThrow('Split config must sum to 100%');
    });

    it('throws when config sums to less than 100', () => {
      const config: SplitConfig = { spending: 40, savings: 20, bills: 10, insurance: 5 };
      expect(() => computeAllocation(100, config)).toThrow('Split config must sum to 100%');
    });

    it('throws for configs far from 100 (property-based)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 99 }).filter((t) => t !== 100),
          (total) => {
            const config: SplitConfig = { spending: total, savings: 0, bills: 0, insurance: 0 };
            expect(() => computeAllocation(100, config)).toThrow('Split config must sum to 100%');
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('tolerance (0.01)', () => {
    it('accepts config summing to 99.99', () => {
      const config: SplitConfig = { spending: 49.99, savings: 30, bills: 15, insurance: 5 };
      expect(() => computeAllocation(100, config)).not.toThrow();
    });

    it('accepts config summing to 100.01', () => {
      const config: SplitConfig = { spending: 50.01, savings: 30, bills: 15, insurance: 5 };
      expect(() => computeAllocation(100, config)).not.toThrow();
    });

    it('rejects config summing to 99.98', () => {
      const config: SplitConfig = { spending: 49.98, savings: 30, bills: 15, insurance: 5 };
      expect(() => computeAllocation(100, config)).toThrow('Split config must sum to 100%');
    });

    it('rejects config summing to 100.02', () => {
      const config: SplitConfig = { spending: 50.02, savings: 30, bills: 15, insurance: 5 };
      expect(() => computeAllocation(100, config)).toThrow('Split config must sum to 100%');
    });
  });

  describe('config with a zero bucket', () => {
    it('handles config where insurance is 0', () => {
      const config: SplitConfig = { spending: 50, savings: 30, bills: 20, insurance: 0 };
      const result = computeAllocation(100, config);
      expect(result.insurance).toBe(0);
      expect(sumBuckets(result)).toBe(100);
    });

    it('handles config where spending is 0', () => {
      const config: SplitConfig = { spending: 0, savings: 50, bills: 30, insurance: 20 };
      const result = computeAllocation(100, config);
      expect(sumBuckets(result)).toBe(100);
    });

    it('handles config where all but one bucket is 0', () => {
      const config: SplitConfig = { spending: 100, savings: 0, bills: 0, insurance: 0 };
      for (const amount of [0, 1, 100, 1000]) {
        const result = computeAllocation(amount, config);
        expect(result.spending).toBe(amount);
        expect(result.savings).toBe(0);
        expect(result.bills).toBe(0);
        expect(result.insurance).toBe(0);
      }
    });
  });

  describe('negative amounts (no special handling, conservation still holds)', () => {
    it('handles -100', () => {
      const result = computeAllocation(-100);
      expect(sumBuckets(result)).toBe(-100);
    });

    it('handles -1 (negative odd)', () => {
      const result = computeAllocation(-1);
      expect(sumBuckets(result)).toBe(-1);
    });

    it('conservation holds for negative amounts near zero', () => {
      for (const amount of [-0.5, -0.01, -0.001]) {
        const result = computeAllocation(amount);
        expect(Math.abs(sumBuckets(result) - amount)).toBeLessThan(0.0001);
      }
    });
  });
});
