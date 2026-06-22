'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { BarChart3, PiggyBank, Receipt, Shield, TrendingUp } from 'lucide-react'
import { apiClient, ApiClientError } from '@/lib/client/apiClient'
import WidgetErrorState from '@/components/ui/WidgetErrorState'
import WidgetEmptyState from '@/components/ui/WidgetEmptyState'
import { InsightsLoadingSkeleton } from '@/components/ui/LoadingSkeletons'
import { SpendingVsSavingsChart } from '@/components/Insights/spendingVsSavingChart'

type Period = 'current_month' | 'last_3_months' | 'last_year'

interface InsightsData {
  period: string
  spendingTotal: number
  savingsTotal: number
  billsTotal: number
  insuranceTotal: number
  breakdown: Record<string, number>
  trend: Record<string, number>
  note?: string
}

const PERIODS: { value: Period; label: string }[] = [
  { value: 'current_month', label: 'This Month' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_year', label: 'Last Year' },
]

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function buildChartData(data: InsightsData) {
  const totalTracked = data.spendingTotal + data.savingsTotal
  const spendRatio = totalTracked > 0 ? data.spendingTotal / totalTracked : 0.7

  return Object.entries(data.trend)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, amount]) => {
      const [yr, mo] = key.split('-')
      const label = new Date(Number(yr), Number(mo) - 1).toLocaleString('en-US', { month: 'short' })
      return {
        month: label,
        spending: Math.round(amount * spendRatio),
        savings: Math.round(amount * (1 - spendRatio)),
      }
    })
}

export default function InsightPage() {
  const [period, setPeriod] = useState<Period>('current_month')
  const [data, setData] = useState<InsightsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchData = useCallback(async (selectedPeriod: Period) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setError(null)

    try {
      const res = await apiClient.getJson<InsightsData>(
        `/api/insights?period=${selectedPeriod}`,
        { signal: controller.signal },
      )
      if (res !== null) setData(res)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      const msg =
        err instanceof ApiClientError
          ? `Failed to load insights (${err.status})`
          : 'Failed to load insights.'
      setError(msg)
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData(period)
    return () => { abortRef.current?.abort() }
  }, [period, fetchData])

  const isEmpty =
    !loading &&
    !error &&
    data !== null &&
    data.spendingTotal === 0 &&
    data.savingsTotal === 0 &&
    data.billsTotal === 0 &&
    data.insuranceTotal === 0

  const chartData = data ? buildChartData(data) : []

  const kpiCards = data
    ? [
        { label: 'Spending', value: data.spendingTotal, Icon: TrendingUp, colorClass: 'text-red-400' },
        { label: 'Savings', value: data.savingsTotal, Icon: PiggyBank, colorClass: 'text-sky-400' },
        { label: 'Bills', value: data.billsTotal, Icon: Receipt, colorClass: 'text-yellow-400' },
        { label: 'Insurance', value: data.insuranceTotal, Icon: Shield, colorClass: 'text-emerald-400' },
      ]
    : []

  return (
    <div
      className="min-h-screen p-4 sm:p-6 lg:p-8"
      style={{ background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)' }}
    >
      <div className="max-w-[928px] mx-auto space-y-6">
        {/* Page header + period selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-white">Financial Insights</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Spending, savings &amp; bills — period overview
            </p>
          </div>

          <div
            role="group"
            aria-label="Select insights period"
            className="flex rounded-xl border border-white/10 bg-black/40 p-1 gap-1"
          >
            {PERIODS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
                className={[
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]',
                  period === value
                    ? 'bg-[#DC2626] text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && <InsightsLoadingSkeleton />}

        {/* Error */}
        {!loading && error && (
          <WidgetErrorState message={error} onRetry={() => fetchData(period)} />
        )}

        {/* Empty */}
        {!loading && !error && isEmpty && (
          <WidgetEmptyState
            icon={BarChart3}
            title="No transactions yet"
            description="Complete a transaction to see your financial insights here."
          />
        )}

        {/* Data */}
        {!loading && !error && data && !isEmpty && (
          <>
            {/* KPI cards */}
            <div
              role="list"
              aria-label="Insights summary"
              className="grid grid-cols-2 sm:grid-cols-4 gap-3"
            >
              {kpiCards.map(({ label, value, Icon, colorClass }) => (
                <div
                  key={label}
                  role="listitem"
                  className="rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-sm"
                >
                  <div className={`mb-2 ${colorClass}`}>
                    <Icon className="w-5 h-5" aria-hidden="true" />
                  </div>
                  <p className="text-lg font-bold text-white tabular-nums">
                    {formatCurrency(value)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Spending vs Savings chart */}
            {chartData.length > 0 && <SpendingVsSavingsChart data={chartData} />}

            {/* Category breakdown */}
            {Object.keys(data.breakdown).length > 0 && (
              <section
                aria-labelledby="breakdown-heading"
                className="rounded-3xl border border-white/10 bg-black/40 p-5 sm:p-6 backdrop-blur-sm"
              >
                <h2
                  id="breakdown-heading"
                  className="text-white text-base font-semibold mb-4"
                >
                  Category Breakdown
                </h2>
                <ul className="space-y-3" aria-label="Spending by category">
                  {Object.entries(data.breakdown)
                    .sort(([, a], [, b]) => b - a)
                    .map(([category, amount]) => {
                      const total = Object.values(data.breakdown).reduce(
                        (s, v) => s + v,
                        0,
                      )
                      const pct = total > 0 ? Math.round((amount / total) * 100) : 0
                      return (
                        <li key={category} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">{category}</span>
                            <span className="text-white font-medium tabular-nums">
                              {formatCurrency(amount)}
                            </span>
                          </div>
                          <div
                            className="h-1.5 rounded-full bg-white/5 overflow-hidden"
                            role="presentation"
                          >
                            <div
                              className="h-full rounded-full bg-[#DC2626]/70 transition-[width] duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      )
                    })}
                </ul>
              </section>
            )}

            {/* Mock-data notice */}
            {data.note && (
              <p className="text-xs text-gray-600 text-center italic">{data.note}</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
