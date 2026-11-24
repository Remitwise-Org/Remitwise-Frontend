import { describe, expect, it } from 'vitest';
import { mapTrendData } from '@/lib/client/useInsightsData';

describe('mapTrendData', () => {
  it('uses the API transaction counts instead of placeholder values', () => {
    expect(
      mapTrendData(
        { '2026-03': 40, '2026-04': 20 },
        { '2026-03': 3 },
      ).map(({ amount, transactions }) => ({ amount, transactions })),
    ).toEqual([
      { amount: 40, transactions: 3 },
      { amount: 20, transactions: 0 },
    ]);
  });
});
