'use client'

import { useMemo, memo } from 'react'
import { Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Area
} from 'recharts';
import { INSIGHTS_PALETTE } from './palette';
import { generateTrendChartLabel, generateTrendChartSummary } from '@/lib/a11y';
const LINE_COLOR = INSIGHTS_PALETTE[0];

function useReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// ── Mock data ─────────────────────────────────────────────────────────────────

/**
 * A single point on the remittance trend timeline.
 *
 * The chart plots one entry per period (typically weekly), ordered oldest →
 * newest. `amount` drives the area/`YAxis` and the average `ReferenceLine`;
 * `date` is the `XAxis` category; `transactions` is surfaced in the tooltip and
 * the screen-reader summary only.
 *
 * @property date         Period label shown on the X axis (e.g. `"Sep 1"`).
 * @property amount       Remittance volume for the period, in USD.
 * @property transactions Number of transactions in the period.
 */
export interface TrendDataPoint {
  date: string
  amount: number
  transactions: number
}

export const MOCK_TREND_DATA: TrendDataPoint[] = [
  { date: 'Sep 1',  amount: 520,  transactions: 2 },
  { date: 'Sep 8',  amount: 780,  transactions: 3 },
  { date: 'Sep 15', amount: 650,  transactions: 2 },
  { date: 'Sep 22', amount: 940,  transactions: 4 },
  { date: 'Oct 1',  amount: 820,  transactions: 3 },
  { date: 'Oct 8',  amount: 1100, transactions: 4 },
  { date: 'Oct 15', amount: 980,  transactions: 3 },
  { date: 'Oct 22', amount: 1250, transactions: 5 },
  { date: 'Nov 1',  amount: 1050, transactions: 4 },
  { date: 'Nov 8',  amount: 890,  transactions: 3 },
  { date: 'Nov 15', amount: 1320, transactions: 5 },
  { date: 'Nov 22', amount: 1480, transactions: 6 },
  { date: 'Dec 1',  amount: 1650, transactions: 6 },
  { date: 'Dec 8',  amount: 1420, transactions: 5 },
]

const AXIS_COLOR  = '#6b7280'
const GRID_COLOR  = 'rgba(255,255,255,0.06)'

// ── Custom tooltip ────────────────────────────────────────────────────────────
interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: TrendDataPoint }>
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload as TrendDataPoint

  return (
    <div className="rounded-xl border border-white/10 bg-black/80 px-4 py-3 shadow-2xl text-sm" aria-live="polite" role="region" aria-label="Remittance trend tooltip">
      <p className="text-gray-400 font-medium mb-2">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-gray-400">Amount</span>
          <span className="font-bold text-white">${point.amount.toLocaleString()}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-gray-400">Transactions</span>
          <span className="font-bold text-white">{point.transactions}</span>
        </div>
      </div>
    </div>
  )
}

// ── Component ───────────────────────────────────────

interface RemittanceTrendChartProps {
  /** Trend points, oldest → newest. Defaults to {@link MOCK_TREND_DATA}. */
  data?: TrendDataPoint[]
}

/**
 * Remittance volume area chart for the Insights surface.
 *
 * Renders a Recharts `AreaChart` of {@link TrendDataPoint} amounts over time,
 * with an average `ReferenceLine`, peak / vs-previous stats, a custom tooltip,
 * and an `sr-only` summary of every point. Animation is disabled for users who
 * prefer reduced motion. An empty `data` array renders a non-crashing empty
 * state rather than `NaN`/`-Infinity` stats.
 *
 * @param data Trend points consumed by the chart. See {@link TrendDataPoint}.
 */
function RemittanceTrendChartInner({
  data = MOCK_TREND_DATA,
}: RemittanceTrendChartProps) {
  const reducedMotion = useReducedMotion()
  const isEmpty = data.length === 0
  const total   = useMemo(() => data.reduce((s, d) => s + d.amount, 0), [data])
  const average = useMemo(() => (data.length ? Math.round(total / data.length) : 0), [total, data.length])
  const peak    = useMemo(() => (data.length ? Math.max(...data.map(d => d.amount)) : 0), [data])
  const latest  = useMemo(() => data[data.length - 1]?.amount ?? 0, [data])
  const prev    = useMemo(() => data[data.length - 2]?.amount ?? latest, [data, latest])
  const trend   = latest >= prev ? 'up' : 'down'

  // Generate accessible label and summary
  const chartLabel = useMemo(
    () => generateTrendChartLabel("Remittance Trend", data, ["amount"]),
    [data]
  )

  const chartSummary = useMemo(
    () => generateTrendChartSummary(data, ["amount"]),
    [data]
  )

  if (isEmpty) {
    return (
      <div className="bg-black/40 border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-sm w-full">
        <div className="flex items-start gap-3 mb-6">
          <div className="bg-red-500/10 p-2 rounded-lg shrink-0">
            <Activity className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-white text-base sm:text-lg font-semibold">
              Remittance Trend
            </h2>
            <p className="text-gray-500 text-xs sm:text-sm">Volume over time</p>
          </div>
        </div>
        <div className="flex h-[220px] items-center justify-center text-center">
          <p className="text-gray-500 text-sm">No remittance data yet.</p>
        </div>
        <p className="sr-only" aria-live="polite">
          No remittance trend data available.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-black/40 border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-sm w-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-start gap-3">
          <div className="bg-red-500/10 p-2 rounded-lg shrink-0">
            <Activity className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h2 className="text-white text-base sm:text-lg font-semibold">
              Remittance Trend
            </h2>
            <p className="text-gray-500 text-xs sm:text-sm">Volume over time</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-right shrink-0">
          <div>
            <p className="text-white font-bold text-sm sm:text-base">
              ${peak.toLocaleString()}
            </p>
            <p className="text-gray-500 text-xs">peak</p>
          </div>
          <div>
            <p
              className={`font-bold text-sm sm:text-base ${
                trend === 'up' ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {trend === 'up' ? '↑' : '↓'} ${Math.abs(latest - prev).toLocaleString()}
            </p>
            <p className="text-gray-500 text-xs">vs prev</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div role="img" aria-label={chartLabel}>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart
            data={data}
            margin={{ top: 8, right: 4, bottom: 0, left: -16 }}
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={LINE_COLOR} stopOpacity={0.3} />
                <stop offset="95%" stopColor={LINE_COLOR} stopOpacity={0}   />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />

            <XAxis
              dataKey="date"
              tick={{ fill: AXIS_COLOR, fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fill: AXIS_COLOR, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${v >= 1000 ? `${v / 1000}k` : v}`}
              width={40}
              className="hidden sm:block"
            />

            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }} />

            {/* Average reference line */}
            <ReferenceLine
              y={average}
              stroke="rgba(255,255,255,0.15)"
              strokeDasharray="4 4"
              label={{
                value: `Avg $${average.toLocaleString()}`,
                position: 'insideTopRight',
                fontSize: 10,
                fill: '#6b7280',
              }}
            />

            <Area
              type="monotone"
              dataKey="amount"
              stroke={LINE_COLOR}
              strokeWidth={2.5}
              fill="url(#trendGradient)"
              dot={false}
              isAnimationActive={!reducedMotion}
              activeDot={{ r: 5, fill: LINE_COLOR, stroke: '#0A0A0A', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {/* Screen‑reader summary */}
      <p className="sr-only" aria-live="polite">
        {chartSummary}
      </p>
    </div>
  )
}

export const RemittanceTrendChart = memo(RemittanceTrendChartInner)