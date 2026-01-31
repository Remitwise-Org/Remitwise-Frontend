'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, ChevronDown, Download } from 'lucide-react'
import { useState } from 'react'

type DateRange = 'This Month' | 'Last Month' | 'Last 3 Months' | 'Last 6 Months' | 'This Year' | 'Custom Range'

type FinancialInsightsHeaderProps = {
  onExport?: () => void
  onDateRangeChange?: (range: DateRange) => void
}

export default function FinancialInsightsHeader({
  onExport,
  onDateRangeChange,
}: FinancialInsightsHeaderProps) {
  const router = useRouter()
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false)
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>('This Month')
  const [currentMonth] = useState(() => {
    const now = new Date()
    return now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  })

  const dateRangeOptions: DateRange[] = [
    'This Month',
    'Last Month',
    'Last 3 Months',
    'Last 6 Months',
    'This Year',
    'Custom Range',
  ]

  const handleDateRangeSelect = (range: DateRange) => {
    setSelectedDateRange(range)
    setIsDateDropdownOpen(false)
    onDateRangeChange?.(range)
  }

  const handleExportClick = () => {
    onExport?.()
  }

  return (
    <header className="bg-[#0A0A0A] text-white border-b border-gray-800/50 sticky top-0 z-50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 lg:py-5">
        {/* Mobile Layout - Single row compact like screenshot */}
        <div className="flex items-center justify-between gap-2 lg:hidden">
          {/* Left: Back button + Title section */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] active:scale-95 transition-all touch-manipulation"
              aria-label="Go back to dashboard"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm sm:text-base font-bold text-white leading-tight truncate">
                  Financial Insights
                </h1>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#D72323] text-white text-[9px] font-bold uppercase tracking-wide">
                  PRO
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-gray-400 leading-tight truncate">Your money at a glance</p>
            </div>
          </div>

          {/* Right: Date icon + Export + Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Date Range Selector - ICON ONLY on mobile */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] active:scale-95 transition-all touch-manipulation"
                aria-label="Select date range"
                aria-expanded={isDateDropdownOpen}
              >
                <Calendar className="w-4 h-4 text-[#D72323]" />
              </button>

              {/* Dropdown Menu */}
              {isDateDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10 bg-black/20 backdrop-blur-sm"
                    onClick={() => setIsDateDropdownOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute top-full right-0 mt-2 py-1 bg-[#1a1a1a] border border-gray-800 rounded-xl shadow-2xl z-20 min-w-[180px] max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    {dateRangeOptions.map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => handleDateRangeSelect(range)}
                        className={`w-full text-left px-4 py-3 text-sm transition-all touch-manipulation min-h-[44px] font-medium ${
                          selectedDateRange === range
                            ? 'bg-[#D72323] text-white shadow-lg'
                            : 'text-gray-300 hover:bg-[#252525] active:bg-[#2a2a2a]'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Export Button - Icon only on mobile */}
            <button
              type="button"
              onClick={handleExportClick}
              className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-[#D72323] hover:bg-[#B91C1C] active:scale-95 transition-all shadow-lg shadow-[#D72323]/30 touch-manipulation"
              aria-label="Export financial data"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* RemitWise Logo - Icon only on mobile */}
            <Link href="/" className="flex items-center justify-center w-10 h-10 rounded-full bg-[#D72323] hover:scale-105 active:scale-95 transition-transform touch-manipulation" aria-label="RemitWise Home">
              <div className="w-6 h-6 flex-shrink-0">
                <img 
                  src="/logo.svg" 
                  alt="RemitWise" 
                  className="w-full h-full" 
                />
              </div>
            </Link>
          </div>
        </div>

        {/* Desktop Layout - Responsive */}
        <div className="hidden lg:flex lg:items-center lg:justify-between gap-4 xl:gap-6">
          {/* Left Section */}
          <div className="flex items-center gap-3 xl:gap-4">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl bg-[#1a1a1a] hover:bg-[#252525] active:scale-95 transition-all touch-manipulation"
              aria-label="Go back to dashboard"
            >
              <ArrowLeft className="w-5 h-5 xl:w-6 xl:h-6 text-white" />
            </button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl xl:text-2xl font-bold text-white">Financial Insights</h1>
                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#D72323] text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-[#D72323]/30">
                  PRO
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">Your money at a glance</p>
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3 xl:gap-4">
            {/* Date Range Selector */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] active:scale-98 transition-all border border-gray-800 touch-manipulation min-h-[44px]"
                aria-label="Select date range"
                aria-expanded={isDateDropdownOpen}
              >
                <Calendar className="w-4 h-4 xl:w-5 xl:h-5 text-[#D72323]" />
                <span className="text-sm xl:text-base text-white whitespace-nowrap font-medium">
                  {selectedDateRange} ({currentMonth})
                </span>
                <ChevronDown className={`w-4 h-4 xl:w-5 xl:h-5 text-gray-400 transition-transform duration-200 ${isDateDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {isDateDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsDateDropdownOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute top-full right-0 mt-2 py-1 bg-[#1a1a1a] border border-gray-800 rounded-xl shadow-2xl z-20 min-w-[220px] max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                    {dateRangeOptions.map((range) => (
                      <button
                        key={range}
                        type="button"
                        onClick={() => handleDateRangeSelect(range)}
                        className={`w-full text-left px-4 py-3 text-sm xl:text-base transition-all touch-manipulation min-h-[44px] font-medium ${
                          selectedDateRange === range
                            ? 'bg-[#D72323] text-white shadow-lg'
                            : 'text-gray-300 hover:bg-[#252525] active:bg-[#2a2a2a]'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Export Button */}
            <button
              type="button"
              onClick={handleExportClick}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#D72323] hover:bg-[#B91C1C] active:scale-95 transition-all font-semibold text-sm xl:text-base shadow-lg shadow-[#D72323]/30 touch-manipulation min-h-[44px]"
              aria-label="Export financial data"
            >
              <Download className="w-4 h-4 xl:w-5 xl:h-5" />
              <span>Export</span>
            </button>

            {/* RemitWise Logo */}
            <Link href="/" className="flex items-center gap-2.5 xl:gap-3 pl-3 xl:pl-4 border-l border-gray-800 group touch-manipulation">
              <div className="w-10 h-10 flex-shrink-0">
                <img 
                  src="/logo.svg" 
                  alt="RemitWise" 
                  className="w-full h-full group-hover:scale-110 group-active:scale-95 transition-transform" 
                />
              </div>
              <span className="text-white text-lg xl:text-xl font-bold group-hover:text-gray-200 transition-colors">
                RemitWise
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}
