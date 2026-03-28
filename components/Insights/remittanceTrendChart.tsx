'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { Activity } from 'lucide-react'

// ── Mock data ─────────────────────────────────────────────────────────────────

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
const LINE_COLOR  = '#D72323'

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
    <div className="rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 shadow-2xl text-sm">
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
  data?: TrendDataPoint[]
}

export function RemittanceTrendChart({
  data = MOCK_TREND_DATA,
}: RemittanceTrendChartProps) {
  const total   = data.reduce((s, d) => s + d.amount, 0)
  const average = Math.round(total / data.length)
  const peak    = Math.max(...data.map(d => d.amount))
  const latest  = data[data.length - 1]?.amount ?? 0
  const prev    = data[data.length - 2]?.amount ?? latest
  const trend   = latest >= prev ? 'up' : 'down'

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
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={data}
          margin={{ top: 8, right: 4, bottom: 0, left: -16 }}
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
            activeDot={{ r: 5, fill: LINE_COLOR, stroke: '#0A0A0A', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}