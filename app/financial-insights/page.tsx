'use client'

import FinancialInsightsHeader from '@/components/FinancialInsightsHeader'

export default function FinancialInsightsPage() {
  const handleExport = () => {
    console.log('Exporting financial data...')
    alert('Export functionality will be implemented here (CSV/PDF)')
  }

  const handleDateRangeChange = (range: string) => {
    console.log('Date range changed to:', range)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <FinancialInsightsHeader
        onExport={handleExport}
        onDateRangeChange={handleDateRangeChange}
      />
      
      {/* Page Content - Mobile optimized */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="text-white text-center py-12 sm:py-16 lg:py-20">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">
            Financial Insights Content
          </h2>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto px-4">
            The page content will be implemented here according to the Figma design.
          </p>
        </div>
      </main>
    </div>
  )
}
