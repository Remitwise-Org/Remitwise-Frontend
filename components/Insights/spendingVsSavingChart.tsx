 'use client'

import { useMemo, useCallback, memo } from 'react'
import { usePrefersReducedMotion } from '@/lib/hooks/usePrefersReducedMotion'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    type TooltipContentProps,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import { buildChartImageLabel, buildChartSummary } from '@/lib/a11y/chart'

// ── Mock data ───────────────────────────

/**
 * Index signature added so this type satisfies TrendChartDataPoint in
 * @/lib/a11y/chartAccessibility, which requires dynamic key access.
 */
export interface SpendingVsSavingsDataPoint {
    [key: string]: string | number | undefined
    month: string
    spending: number
    savings: number
}

export const MOCK_SPENDING_VS_SAVINGS: SpendingVsSavingsDataPoint[] = [
    { month: 'Sep', spending: 2400, savings: 600 },
    { month: 'Oct', spending: 2800, savings: 700 },
    { month: 'Nov', spending: 3200, savings: 500 },
    { month: 'Dec', spending: 3800, savings: 400 },
    { month: 'Jan', spending: 2600, savings: 800 },
    { month: 'Feb', spending: 2900, savings: 750 },
    { month: 'Mar', spending: 3100, savings: 900 },
]

// ── Color tokens ──────────────────────────────────────────────────────────────
import { INSIGHTS_PALETTE } from './palette';
const SPENDING_COLOR = INSIGHTS_PALETTE[0];
const SAVINGS_COLOR  = INSIGHTS_PALETTE[1];
const GRID_COLOR     = 'rgba(255,255,255,0.06)';
const AXIS_COLOR     = '#6b7280';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = memo(function CustomTooltip({ active, payload, label }: TooltipContentProps<any, any>) {
    if (!active || !payload?.length) return null

    return (
        <div className="rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-3 shadow-2xl text-sm min-w-[160px]">
            <p className="text-gray-400 font-medium mb-2">{label ?? ''}</p>
            {payload.map((entry: any) => (
                <div key={entry.name} className="flex items-center justify-between gap-4 py-0.5">
                    <div className="flex items-center gap-2">
                        <span
                            className="inline-block w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: entry.color }}
                        />
                        <span className="text-gray-300 capitalize">{entry.name}</span>
                    </div>
                    <span className="font-bold text-white">
                        ${(entry.value ?? 0).toLocaleString()}
                    </span>
                </div>
            ))}
            {payload.length === 2 && (
                <div className="mt-2 pt-2 border-t border-white/10 flex justify-between text-xs">
                    <span className="text-gray-500">Ratio</span>
                    <span className="text-gray-300">
                        {Math.round(
                            ((payload[1].value as number) /
                                ((payload[0].value as number) + (payload[1].value as number))) *
                            100
                        )}% saved
                    </span>
                </div>
            )}
        </div>
    )
})

type SpendingTooltipProps = TooltipContentProps<number | string | readonly (number | string)[], string | number>

// ── Custom legend ─────────────────────────────────────────────────────────────
const LEGEND_ITEMS = [
  { color: SPENDING_COLOR, label: 'Spending' },
  { color: SAVINGS_COLOR,  label: 'Savings'  },
] as const

const CustomLegend = memo(function CustomLegend() {
    return (
        <div className="flex items-center justify-center gap-6 mt-2">
            {LEGEND_ITEMS.map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                    <span className="text-xs text-gray-400">{label}</span>
                </div>
            ))}
        </div>
    )
})

// ── Component ─────────────────────────────────────────────────────────────────

interface SpendingVsSavingsChartProps {
    data?: SpendingVsSavingsDataPoint[]
}

function SpendingVsSavingsChartInner({
    data = MOCK_SPENDING_VS_SAVINGS,
}: SpendingVsSavingsChartProps) {
    // Use the canonical hook — reactive, SSR-safe, shared across the codebase.
    const reducedMotion = usePrefersReducedMotion()

    const savingsRate = useMemo(() => {
        const spending = data.reduce((s, d) => s + d.spending, 0)
        const savings  = data.reduce((s, d) => s + d.savings,  0)
        return Math.round((savings / (spending + savings)) * 100)
    }, [data])

    // Generate accessible label and summary
    const summaryItems = useMemo(
        () =>
            data.map(
                (point) =>
                    `${point.month}: spending $${point.spending.toLocaleString()}, savings $${point.savings.toLocaleString()}`,
            ),
        [data],
    )

    const t = useMemo(() => {
        return (_path: string, options?: string | Record<string, unknown>) =>
            typeof options === 'string' ? options : _path
    }, [])

    const chartLabel = useMemo(() => buildChartImageLabel('Spending vs Savings', summaryItems, t), [summaryItems, t])
    const chartSummary = useMemo(() => buildChartSummary(summaryItems, t), [summaryItems, t])

    const margin = useMemo(() => ({ top: 4, right: 4, bottom: 0, left: -16 }), [])
    const axisTick = useMemo(() => ({ fill: AXIS_COLOR, fontSize: 11 }), [])
    const tooltipCursor = useMemo(() => ({ fill: 'rgba(255,255,255,0.03)' }), [])
    const barRadius = useMemo(() => [4, 4, 0, 0] as const, [])
    const tickFormatter = useCallback((v: number) => `$${v >= 1000 ? `${v / 1000}k` : v}`, [])

    return (
        <div className="bg-black/40 border border-white/10 rounded-3xl p-5 sm:p-6 backdrop-blur-sm w-full">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
                <div className="flex items-start gap-3">
                    <div className="bg-red-500/10 p-2 rounded-lg shrink-0">
                        <TrendingUp className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-white text-base sm:text-lg font-semibold">
                            Spending vs Savings
                        </h2>
                        <p className="text-gray-500 text-xs sm:text-sm">Monthly comparison</p>
                    </div>
                </div>

                {/* Savings rate badge */}
                <div className="text-right shrink-0">
                    <p className="text-[#0ea5e9] font-bold text-lg sm:text-xl">{savingsRate}%</p>
                    <p className="text-gray-500 text-xs">savings rate</p>
                </div>
            </div>

            {/* Chart */}
            <div role="img" aria-label={chartLabel}>
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                        data={data}
                        barCategoryGap="30%"
                        barGap={4}
                        margin={margin}
                        aria-hidden="true"
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke={GRID_COLOR}
                            vertical={false}
                        />
                        <XAxis
                            dataKey="month"
                            tick={axisTick}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={axisTick}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={tickFormatter}
                            width={40}
                            className="hidden sm:block"
                        />
                        <Tooltip content={CustomTooltip as any} cursor={tooltipCursor} />
                        <Bar dataKey="spending" name="spending" fill={SPENDING_COLOR} radius={barRadius} isAnimationActive={!reducedMotion} />
                        <Bar dataKey="savings"  name="savings"  fill={SAVINGS_COLOR}  radius={barRadius} isAnimationActive={!reducedMotion} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* Screen‑reader summary */}
            <p className="sr-only" aria-live="polite">
                {chartSummary}
            </p>

            <CustomLegend />
        </div>
    )
}

export const SpendingVsSavingsChart = memo(SpendingVsSavingsChartInner)
