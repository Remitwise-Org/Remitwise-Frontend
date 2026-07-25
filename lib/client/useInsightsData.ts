'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from './apiClient';
import type { CategoryDataPoint } from '@/components/Insights/categoryDonutChart';
import type { TrendDataPoint } from '@/components/Insights/remittanceTrendChart';
import type { SpendingVsSavingsDataPoint } from '@/components/Insights/spendingVsSavingChart';

/** Raw shape returned by GET /api/insights */
interface InsightsApiResponse {
  period: string;
  spendingTotal: number;
  savingsTotal: number;
  billsTotal: number;
  insuranceTotal: number;
  breakdown: Record<string, number>;
  trend: Record<string, number>;
  note?: string;
}

export interface InsightsData {
  categories: CategoryDataPoint[];
  trend: TrendDataPoint[];
  spendingVsSavings: SpendingVsSavingsDataPoint[];
}

export type InsightsStatus = 'idle' | 'loading' | 'success' | 'error';

export interface UseInsightsDataResult {
  data: InsightsData | null;
  status: InsightsStatus;
  error: string | null;
  refetch: () => void;
}

/**
 * Maps the raw /api/insights breakdown into CategoryDataPoint[].
 * Calculates percentages from the sum of all category amounts.
 *
 * @param breakdown - Record<category, amount> from the API.
 * @returns Sorted array of CategoryDataPoint, largest first.
 */
export function mapBreakdownToCategories(
  breakdown: Record<string, number>,
): CategoryDataPoint[] {
  const entries = Object.entries(breakdown).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total === 0) return [];

  return entries
    .sort(([, a], [, b]) => b - a)
    .map(([name, amount]) => ({
      name,
      amount,
      percentage: Math.round((amount / total) * 100),
    }));
}

/**
 * Maps the raw /api/insights trend (keyed by "YYYY-M") into TrendDataPoint[].
 * Fills in placeholder transaction counts since the API only returns totals.
 *
 * @param trend - Record<"YYYY-M", totalAmount> from the API.
 * @returns Chronologically sorted TrendDataPoint[].
 */
export function mapTrendData(trend: Record<string, number>): TrendDataPoint[] {
  return Object.entries(trend)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, amount]) => {
      const [year, month] = monthKey.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      return {
        date: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
        amount,
        transactions: 1,
      };
    });
}

/**
 * Maps the raw /api/insights response into SpendingVsSavingsDataPoint[].
 *
 * @param raw - Full API response.
 * @returns Array of per-month spending/savings data points.
 */
export function mapSpendingVsSavings(
  raw: InsightsApiResponse,
): SpendingVsSavingsDataPoint[] {
  const now = new Date();
  const month = now.toLocaleString('default', { month: 'short' });

  const trendEntries = Object.entries(raw.trend).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  if (trendEntries.length > 0) {
    return trendEntries.map(([monthKey, spending]) => {
      const [year, m] = monthKey.split('-');
      const label = new Date(Number(year), Number(m) - 1, 1).toLocaleString(
        'default',
        { month: 'short' },
      );
      return { month: label, spending, savings: raw.savingsTotal };
    });
  }

  return [{ month, spending: raw.spendingTotal, savings: raw.savingsTotal }];
}

/**
 * Fetches live data from /api/insights and maps it into the three chart shapes.
 * Falls back to empty arrays (which trigger each chart's empty state) on error.
 */
export function useInsightsData(period = 'current_month'): UseInsightsDataResult {
  const [data, setData] = useState<InsightsData | null>(null);
  const [status, setStatus] = useState<InsightsStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const raw = await apiClient.getJson<InsightsApiResponse>(
        `/api/insights?period=${encodeURIComponent(period)}`,
      );

      if (raw === null) {
        return;
      }

      setData({
        categories: mapBreakdownToCategories(raw.breakdown ?? {}),
        trend: mapTrendData(raw.trend ?? {}),
        spendingVsSavings: mapSpendingVsSavings(raw),
      });
      setStatus('success');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load insights data.',
      );
      setStatus('error');
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, status, error, refetch: fetchData };
}
