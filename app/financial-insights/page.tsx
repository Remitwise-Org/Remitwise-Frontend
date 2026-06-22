'use client'

import { lazy, Suspense } from 'react'
import { Send, PiggyBank, FileText, Shield } from 'lucide-react'
import FinancialInsightsHeader from '@/components/FinancialInsightsHeader'
import StatCard from '@/components/Dashboard/StatCard'
import { SpendingVsSavingsChart } from '@/components/Insights/spendingVsSavingChart'
import { TopCategoriesWidget } from '@/components/Insights/TopCategoriesWidget'

const RemittanceTrendChart = lazy(() =>
  import('@/components/Insights/remittanceTrendChart').then(m => ({ default: m.RemittanceTrendChart }))
)
const CategoryDonutChart = lazy(() =>
  import('@/components/Insights/categoryDonutChart').then(m => ({ default: m.CategoryDonutChart }))
)

// Summary overview — merges the StatCard breakdown (Total Remittances / Saved /
// Bills / Insurance) with the "vs last period" change deltas. These map to the
// totals returned by /api/insights (spending / savings / bills / insurance).
const SUMMARY_STATS = [
  { title: 'Total Remittances', value: '$3,240', change: '+18%', neutral: false, icon: <Send className="w-5 h-5" /> },
  { title: 'Total Saved',       value: '$1,580', change: '+24%', neutral: false, icon: <PiggyBank className="w-5 h-5" /> },
  { title: 'Bills Paid',        value: '$685',   change: '+5%',  neutral: false, icon: <FileText className="w-5 h-5" /> },
  { title: 'Insurance Premiums',value: '$125',   change: '0%',   neutral: true,  icon: <Shield className="w-5 h-5" /> },
] as const

export default function FinancialInsightsPage() {
  const handleExport = () => {
    console.log('Exporting financial data...')
    alert('Export functionality will be implemented here (CSV/PDF)')
  }

  const handleDateRangeChange = (range: string) => {
    console.log('Date range changed to:', range)
    // TODO: pass selected range to charts to filter data via API
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <FinancialInsightsHeader
        onExport={handleExport}
        onDateRangeChange={handleDateRangeChange}
      />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">

        {/* Summary overview */}
        <h2 className="text-lg sm:text-xl font-semibold text-gray-400 mb-4 sm:mb-6">Summary Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {SUMMARY_STATS.map(({ title, value, change, neutral, icon }) => (
            <StatCard
              key={title}
              title={title}
              value={value}
              icon={icon}
              showTrend={!neutral}
              detail1={change}
              detail1Color={neutral ? 'text-gray-400' : 'text-emerald-400'}
              detail2="vs last period"
            />
          ))}
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

          {/* Spending vs Savings — full width on mobile, half on desktop */}
          <div className="lg:col-span-2">
            <SpendingVsSavingsChart />
          </div>

          {/* Trend line */}
          <Suspense fallback={<div className="h-[308px] rounded-3xl bg-white/5 animate-pulse" />}>
            <RemittanceTrendChart />
          </Suspense>

          {/* Category donut */}
          <Suspense fallback={<div className="h-[308px] rounded-3xl bg-white/5 animate-pulse" />}>
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
