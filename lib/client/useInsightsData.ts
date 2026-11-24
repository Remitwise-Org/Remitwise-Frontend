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
  unpaidBillsTotal: number;
  insuranceTotal: number;
  counts: {
    payments: number;
    paidBills: number;
    unpaidBills: number;
    activePolicies: number;
    savingsGoals: number;
  };
  breakdown: Record<string, number>;
  trend: Record<string, number>;
  trendCounts: Record<string, number>;
  partial: boolean;
  failedSources: string[];
}

export interface InsightsData {
  categories: CategoryDataPoint[];
  trend: TrendDataPoint[];
  spendingVsSavings: SpendingVsSavingsDataPoint[];
  spendingTotal: number;
  savingsTotal: number;
  billsTotal: number;
  unpaidBillsTotal: number;
  insuranceTotal: number;
  counts: InsightsApiResponse['counts'];
  partial: boolean;
  failedSources: string[];
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
 * Maps the raw /api/insights trend (keyed by "YYYY-MM") into TrendDataPoint[].
 * Uses the per-month transaction counts returned by the API.
 *
 * @param trend - Record<"YYYY-MM", totalAmount> from the API.
 * @param counts - Record<"YYYY-MM", transactionCount> from the API.
 * @returns Chronologically sorted TrendDataPoint[].
 */
export function mapTrendData(
  trend: Record<string, number>,
  counts: Record<string, number> = {},
): TrendDataPoint[] {
  return Object.entries(trend)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, amount]) => {
      const [year, month] = monthKey.split('-');
      const date = new Date(Number(year), Number(month) - 1, 1);
      return {
        date: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
        amount,
        transactions: counts[monthKey] ?? 0,
      };
    });
}

/**
 * Fetches live data from /api/insights and maps it into the chart data shapes.
 * Falls back to empty arrays (which trigger each chart's empty state) on error.
 */
export function useInsightsData(period = 'current_month'): UseInsightsDataResult {
  const [data, setData] = useState<InsightsData | null>(null);
  const [status, setStatus] = useState<InsightsStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setData(null);

    try {
      const raw = await apiClient.getJson<InsightsApiResponse>(
        `/api/insights?period=${encodeURIComponent(period)}`,
      );

      if (raw === null) {
        setData(null);
        setStatus('success');
        return;
      }

      setData({
        categories: mapBreakdownToCategories(raw.breakdown ?? {}),
        trend: mapTrendData(raw.trend ?? {}, raw.trendCounts ?? {}),
        // Goal balances have no dated contribution history, so a savings
        // trend cannot be represented without inventing monthly activity.
        spendingVsSavings: [],
        spendingTotal: raw.spendingTotal,
        savingsTotal: raw.savingsTotal,
        billsTotal: raw.billsTotal,
        unpaidBillsTotal: raw.unpaidBillsTotal,
        insuranceTotal: raw.insuranceTotal,
        counts: raw.counts,
        partial: raw.partial,
        failedSources: raw.failedSources,
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
