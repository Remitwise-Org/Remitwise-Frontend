'use client'

import { Suspense, useCallback, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import { Send, PiggyBank, FileText, Shield } from 'lucide-react'
import FinancialInsightsHeader from '@/components/FinancialInsightsHeader'
import type { DateRangeOption, ExportFormat } from '@/components/FinancialInsightsHeader'
import { MOCK_SPENDING_VS_SAVINGS } from '@/components/Insights/spendingVsSavingChart'
import { MOCK_TREND_DATA } from '@/components/Insights/remittanceTrendChart'
import StatCard from '@/components/Dashboard/StatCard'
import { TopCategoriesWidget } from '@/components/Insights/TopCategoriesWidget'
import { SkeletonChart } from '@/components/ui/Skeleton'
import { useSeo } from '@/lib/hooks/useSeo'
import { useToast } from '@/lib/context/ToastContext'

const SpendingVsSavingsChart = dynamic(
  () => import('@/components/Insights/spendingVsSavingChart').then(m => ({ default: m.SpendingVsSavingsChart })),
  { ssr: false },
)
const RemittanceTrendChart = dynamic(
  () => import('@/components/Insights/remittanceTrendChart').then(m => ({ default: m.RemittanceTrendChart })),
  { ssr: false },
)
const CategoryDonutChart = dynamic(
  () => import('@/components/Insights/categoryDonutChart').then(m => ({ default: m.CategoryDonutChart })),
  { ssr: false },
)

function getRangeLabel(range: DateRangeOption): string {
  switch (range) {
    case 'This Month': return 'this month'
    case 'Last Month': return 'last month'
    case 'Last 3 Months': return 'last 3 months'
    case 'Last 6 Months': return 'last 6 months'
    case 'This Year': return 'this year'
    case 'Custom Range': return 'selected period'
  }
}

// ── Summary stats (dynamic value + change based on range) ───────────────────

function getSummaryStats(rangeLabel: string) {
  return [
    { title: 'Total Remittances', value: '$3,240', change: '+18%', neutral: false, icon: <Send className="w-5 h-5" /> },
    { title: 'Total Saved',       value: '$1,580', change: '+24%', neutral: false, icon: <PiggyBank className="w-5 h-5" /> },
    { title: 'Bills Paid',        value: '$685',   change: '+5%',  neutral: false, icon: <FileText className="w-5 h-5" /> },
    { title: 'Insurance Premiums',value: '$125',   change: '0%',   neutral: true,  icon: <Shield className="w-5 h-5" /> },
  ].map(stat => ({
    ...stat,
    detail2: `vs ${rangeLabel}`,
  }))
}

// ── Simulated export ─────────────────────────────────────────────────────────

function simulateExport(format: ExportFormat): Promise<void> {
  const delay = format === 'pdf' ? 2000 : 1200
  return new Promise(resolve => setTimeout(resolve, delay))
}

export default function FinancialInsightsPage() {
  useSeo({
    title: 'Financial Insights | RemitWise',
    description: 'Analyze your spending vs savings, remittance trends, and category breakdowns on RemitWise.',
  })

  const { toast, dismiss } = useToast()
  const [selectedRange, setSelectedRange] = useState<DateRangeOption>('This Month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const rangeLabel = useMemo(() => getRangeLabel(selectedRange), [selectedRange])
  const summaryStats = useMemo(() => getSummaryStats(rangeLabel), [rangeLabel])

  // Filter charts data based on selected range
  const spendingSavingsData = useMemo(() => {
    if (selectedRange === 'This Month') return MOCK_SPENDING_VS_SAVINGS.slice(-1)
    if (selectedRange === 'Last Month') return MOCK_SPENDING_VS_SAVINGS.slice(-2, -1)
    if (selectedRange === 'Last 3 Months') return MOCK_SPENDING_VS_SAVINGS.slice(-3)
    if (selectedRange === 'Last 6 Months' || selectedRange === 'This Year') return MOCK_SPENDING_VS_SAVINGS
    return MOCK_SPENDING_VS_SAVINGS // custom range fallback
  }, [selectedRange])

  const trendData = useMemo(() => {
    if (selectedRange === 'This Month') return MOCK_TREND_DATA.slice(-4)
    if (selectedRange === 'Last Month') return MOCK_TREND_DATA.slice(-8, -4)
    if (selectedRange === 'Last 3 Months') return MOCK_TREND_DATA.slice(-10)
    if (selectedRange === 'Last 6 Months' || selectedRange === 'This Year') return MOCK_TREND_DATA
    return MOCK_TREND_DATA
  }, [selectedRange])

  const handleExport = useCallback(async (format: ExportFormat) => {
    const toastId = toast({
      variant: 'info',
      title: `Exporting ${format.toUpperCase()}...`,
      description: 'Preparing your financial insights data.',
      duration: 0,
    })

    try {
      await simulateExport(format)
      // Dismiss the loading toast
      dismiss(toastId)
      toast({
        variant: 'success',
        title: `${format.toUpperCase()} exported successfully`,
        description: `Your financial insights have been exported as ${format.toUpperCase()}.`,
      })
    } catch {
      dismiss(toastId)
      toast({
        variant: 'error',
        title: 'Export failed',
        description: 'Something went wrong. Please try again.',
      })
    }
  }, [toast, dismiss])

  const handleDateRangeChange = useCallback((range: DateRangeOption) => {
    setSelectedRange(range)
    if (range !== 'Custom Range') {
      setCustomStart('')
      setCustomEnd('')
    }
    toast({
      variant: 'info',
      title: `Showing data for ${getRangeLabel(range)}`,
      duration: 3000,
    })
  }, [toast])

  const handleCustomDateChange = useCallback((start: string, end: string) => {
    setCustomStart(start)
    setCustomEnd(end)
  }, [])

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <FinancialInsightsHeader
        onExport={handleExport}
        onDateRangeChange={handleDateRangeChange}
        onCustomDateChange={handleCustomDateChange}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">

        {/* Active range indicator */}
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-400">Summary Overview</h2>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-[#D72323]/10 border border-[#D72323]/20 text-[#D72323] text-xs font-medium">
            {selectedRange === 'Custom Range' && customStart && customEnd
              ? `${customStart} – ${customEnd}`
              : selectedRange}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {summaryStats.map(({ title, value, change, neutral, icon, detail2 }) => (
            <StatCard
              key={title}
              title={title}
              value={value}
              icon={icon}
              showTrend={!neutral}
              detail1={change}
              detail1Color={neutral ? 'text-gray-400' : 'text-emerald-400'}
              detail2={detail2}
            />
          ))}
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

          {/* Spending vs Savings — full width on mobile, half on desktop */}
          <div className="lg:col-span-2">
            <Suspense fallback={<SkeletonChart type="bar" />}>
              <SpendingVsSavingsChart data={spendingSavingsData} />
            </Suspense>
          </div>

          {/* Trend line */}
          <Suspense fallback={<SkeletonChart type="line" />}>
            <RemittanceTrendChart data={trendData} />
          </Suspense>

          {/* Category donut */}
          <Suspense fallback={<SkeletonChart type="donut" />}>
            <CategoryDonutChart />
          </Suspense>

          {/* Top categories breakdown (migrated from the former /insights route) */}
          <div className="lg:col-span-2 flex justify-center">
            <TopCategoriesWidget />
          </div>

        </div>

        {/* UX notes — visible in dev, remove before prod */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 border border-white/5 rounded-2xl p-4">
            <summary className="text-gray-500 text-xs cursor-pointer">
              Chart design decisions (dev only)
            </summary>
            <div className="mt-3 space-y-2 text-xs text-gray-500">
              <p><strong className="text-gray-400">Spending vs Savings → Grouped Bar:</strong> Comparing two absolute values across discrete time periods. Bars make the magnitude difference between spending and savings immediately scannable.</p>
              <p><strong className="text-gray-400">Remittance Trend → Area Line:</strong> Continuous progression over time with volume emphasis. Gradient fill under the line communicates cumulative transfer activity without adding visual noise.</p>
              <p><strong className="text-gray-400">Category Breakdown → Donut:</strong> Proportions of a whole. The empty center enables a dynamic label showing total or selected category amount — more information-dense than a pie. Interactive slices and legend rows implement the &quot;click to filter&quot; pattern.</p>
              <p><strong className="text-gray-400">Color palette:</strong> #D72323 (brand red) as primary, #0ea5e9 (sky) as secondary, #f59e0b (amber) and #10b981 (emerald) as tertiary. All contrast above 3:1 against the dark background.</p>
              <p><strong className="text-gray-400">Responsive:</strong> Charts use ResponsiveContainer for fluid width. Y-axis hidden on mobile to reclaim space — values are accessible via hover tooltip. Grid collapses from 2-col to 1-col below lg breakpoint.</p>
            </div>
          </details>
        )}
      </main>
    </div>
  )
}
