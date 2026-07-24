import { describe, expect, it } from 'vitest';
import {
  assertDashboardPerformanceBudget,
  normalizeLighthouseScore,
  PERFORMANCE_BUDGET_THRESHOLD,
} from '@/lib/performance/lighthouse-budget';

describe('Lighthouse performance budget helpers', () => {
  it('normalizes a Lighthouse score to a percentage', () => {
    expect(normalizeLighthouseScore(0.91)).toBe(91);
    expect(normalizeLighthouseScore(0)).toBe(0);
    expect(normalizeLighthouseScore(null)).toBe(0);
  });

  it('passes when the score meets the dashboard budget threshold', () => {
    expect(assertDashboardPerformanceBudget(0.95)).toBe(95);
    expect(assertDashboardPerformanceBudget(PERFORMANCE_BUDGET_THRESHOLD / 100)).toBe(
      PERFORMANCE_BUDGET_THRESHOLD,
    );
  });

  it('throws when the score falls below the dashboard budget threshold', () => {
    expect(() => assertDashboardPerformanceBudget(0.89)).toThrow(
      /Dashboard Lighthouse performance score 89 is below the required 90\./,
    );
  });
});
