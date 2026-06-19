'use client'

import FinancialInsightsHeader from '@/components/FinancialInsightsHeader'
import { SpendingVsSavingsChart } from '@/components/Insights/spendingVsSavingChart'
import { RemittanceTrendChart }   from '@/components/Insights/remittanceTrendChart'
import { CategoryDonutChart }     from '@/components/Insights/categoryDonutChart'

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

        {/* Summary stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Total Sent',    value: '$3,240', change: '+12%',  up: true  },
            { label: 'Avg per Week',  value: '$810',   change: '+5%',   up: true  },
            { label: 'Transactions',  value: '24',     change: '+3',    up: true  },
            { label: 'Savings Rate',  value: '22%',    change: '-2pp',  up: false },
          ].map(({ label, value, change, up }) => (
            <div
              key={label}
              className="bg-black/40 border border-white/10 rounded-2xl p-4 backdrop-blur-sm"
            >
              <p className="text-gray-500 text-xs mb-1">{label}</p>
              <p className="text-white font-bold text-lg sm:text-xl leading-tight">{value}</p>
              <p className={`text-xs mt-1 font-medium ${up ? 'text-emerald-400' : 'text-red-400'}`}>
                {up ? '↑' : '↓'} {change} vs last period
              </p>
            </div>
          ))}
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">

          {/* Spending vs Savings — full width on mobile, half on desktop */}
          <div className="lg:col-span-2">
            <SpendingVsSavingsChart />
          </div>

          {/* Trend line */}
          <RemittanceTrendChart />

          {/* Category donut */}
          <CategoryDonutChart />

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