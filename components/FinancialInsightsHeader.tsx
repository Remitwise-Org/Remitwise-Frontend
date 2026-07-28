'use client'

import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Calendar, ChevronDown, Download, FileText, FileSpreadsheet } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import PageHeadingLink from '@/components/PageHeadingLink'
import { CTA_TEST_IDS } from '@/lib/cta-testids'

type DateRangePreset = 'This Month' | 'Last Month' | 'Last 3 Months' | 'Last 6 Months' | 'This Year'
export type DateRangeOption = DateRangePreset | 'Custom Range'
export type ExportFormat = 'csv' | 'pdf'

type FinancialInsightsHeaderProps = {
  onExport?: (format: ExportFormat) => void
  onDateRangeChange?: (range: DateRangeOption) => void
  onCustomDateChange?: (start: string, end: string) => void
}

export default function FinancialInsightsHeader({
  onExport,
  onDateRangeChange,
  onCustomDateChange,
}: FinancialInsightsHeaderProps) {
  const router = useRouter()
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false)
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)
  const [selectedDateRange, setSelectedDateRange] = useState<DateRangeOption>('This Month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const dateDropdownRef = useRef<HTMLDivElement>(null)
  const exportDropdownRef = useRef<HTMLDivElement>(null)
  const [focusedDateIndex, setFocusedDateIndex] = useState(-1)
  const [focusedExportIndex, setFocusedExportIndex] = useState(-1)
  const [currentMonth] = useState(() => {
    const now = new Date()
    return now.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  })

  const dateRangeOptions: DateRangeOption[] = [
    'This Month',
    'Last Month',
    'Last 3 Months',
    'Last 6 Months',
    'This Year',
    'Custom Range',
  ]

  const exportOptions: { format: ExportFormat; label: string; icon: typeof FileText }[] = [
    { format: 'csv', label: 'Export as CSV', icon: FileSpreadsheet },
    { format: 'pdf', label: 'Export as PDF', icon: FileText },
  ]

  const handleDateRangeSelect = (range: DateRangeOption) => {
    setSelectedDateRange(range)
    setFocusedDateIndex(-1)
    if (range === 'Custom Range') {
      // Keep dropdown open so user can fill in date inputs
      return
    }
    setIsDateDropdownOpen(false)
    setCustomStart('')
    setCustomEnd('')
    onDateRangeChange?.(range)
  }

  const handleExportSelect = (format: ExportFormat) => {
    setIsExportDropdownOpen(false)
    setFocusedExportIndex(-1)
    onExport?.(format)
  }

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setIsDateDropdownOpen(false)
        setFocusedDateIndex(-1)
      }
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setIsExportDropdownOpen(false)
        setFocusedExportIndex(-1)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard navigation for date dropdown
  const handleDateKeyDown = (e: React.KeyboardEvent) => {
    const items = dateRangeOptions
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedDateIndex(prev => (prev < items.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedDateIndex(prev => (prev > 0 ? prev - 1 : items.length - 1))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedDateIndex >= 0) {
          handleDateRangeSelect(items[focusedDateIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsDateDropdownOpen(false)
        setFocusedDateIndex(-1)
        break
    }
  }

  // Keyboard navigation for export dropdown
  const handleExportKeyDown = (e: React.KeyboardEvent) => {
    const items = exportOptions
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setFocusedExportIndex(prev => (prev < items.length - 1 ? prev + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedExportIndex(prev => (prev > 0 ? prev - 1 : items.length - 1))
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (focusedExportIndex >= 0) {
          handleExportSelect(items[focusedExportIndex].format)
        }
        break
      case 'Escape':
        e.preventDefault()
        setIsExportDropdownOpen(false)
        setFocusedExportIndex(-1)
        break
    }
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
                <PageHeadingLink
                  headingId="financial-insights-page-heading-mobile"
                  copyHeadingId="financial-insights-page-heading"
                  label="Financial Insights"
                  headingClassName="truncate text-sm sm:text-base font-bold text-white leading-tight"
                  buttonClassName="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
                  iconClassName="h-3.5 w-3.5"
                >
                  Financial Insights
                </PageHeadingLink>
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
            <div className="relative" ref={dateDropdownRef}>
              <button
                type="button"
                onClick={() => { setIsDateDropdownOpen(!isDateDropdownOpen); setIsExportDropdownOpen(false) }}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] active:scale-95 transition-all touch-manipulation"
                aria-label="Select date range"
                aria-expanded={isDateDropdownOpen}
                aria-haspopup="listbox"
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
                  <div
                    className="absolute top-full right-0 mt-2 py-1 bg-[#1a1a1a] border border-gray-800 rounded-xl shadow-2xl z-20 min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200"
                    role="listbox"
                    aria-label="Date range options"
                    onKeyDown={handleDateKeyDown}
                  >
                    {dateRangeOptions.map((range, index) => (
                      <button
                        key={range}
                        type="button"
                        role="option"
                        aria-selected={selectedDateRange === range}
                        onClick={() => handleDateRangeSelect(range)}
                        onMouseEnter={() => setFocusedDateIndex(index)}
                        tabIndex={focusedDateIndex === index ? 0 : -1}
                        className={`w-full text-left px-4 py-3 text-sm transition-all touch-manipulation min-h-[44px] font-medium ${
                          selectedDateRange === range
                            ? 'bg-[#D72323] text-white shadow-lg'
                            : 'text-gray-300 hover:bg-[#252525] active:bg-[#2a2a2a]'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                    {/* Custom range date inputs */}
                    {selectedDateRange === 'Custom Range' && (
                      <div className="px-4 py-3 border-t border-gray-800 space-y-2">
                        <label className="text-xs text-gray-400 block">From</label>
                        <input
                          type="date"
                          value={customStart}
                          onChange={(e) => {
                            const val = e.target.value
                            setCustomStart(val)
                            if (val && customEnd) onCustomDateChange?.(val, customEnd)
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D72323]"
                        />
                        <label className="text-xs text-gray-400 block">To</label>
                        <input
                          type="date"
                          value={customEnd}
                          onChange={(e) => {
                            const val = e.target.value
                            setCustomEnd(val)
                            if (customStart && val) onCustomDateChange?.(customStart, val)
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D72323]"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Export Dropdown - Icon only on mobile */}
            <div className="relative" ref={exportDropdownRef}>
              <button
                type="button"
                onClick={() => { setIsExportDropdownOpen(!isExportDropdownOpen); setIsDateDropdownOpen(false) }}
                data-testid={CTA_TEST_IDS.page.financialInsightsPrimary}
                className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-[#D72323] hover:bg-[#B91C1C] active:scale-95 transition-all shadow-lg shadow-[#D72323]/30 touch-manipulation"
                aria-label="Export financial data"
                aria-expanded={isExportDropdownOpen}
                aria-haspopup="menu"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Export Dropdown Menu */}
              {isExportDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsExportDropdownOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute top-full right-0 mt-2 py-1 bg-[#1a1a1a] border border-gray-800 rounded-xl shadow-2xl z-20 min-w-[180px] animate-in fade-in slide-in-from-top-2 duration-200"
                    role="menu"
                    aria-label="Export options"
                    onKeyDown={handleExportKeyDown}
                  >
                    {exportOptions.map((opt, index) => {
                      const Icon = opt.icon
                      return (
                        <button
                          key={opt.format}
                          type="button"
                          role="menuitem"
                          onClick={() => handleExportSelect(opt.format)}
                          onMouseEnter={() => setFocusedExportIndex(index)}
                          tabIndex={focusedExportIndex === index ? 0 : -1}
                          className="w-full text-left px-4 py-3 text-sm transition-all touch-manipulation min-h-[44px] font-medium text-gray-300 hover:bg-[#252525] active:bg-[#2a2a2a] flex items-center gap-3"
                        >
                          <Icon className="w-4 h-4 text-[#D72323]" />
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* RemitWise Logo - Icon only on mobile */}
            <Link href="/" className="flex items-center justify-center w-10 h-10 rounded-full bg-[#D72323] hover:scale-105 active:scale-95 transition-transform touch-manipulation" aria-label="RemitWise Home">
              <div className="w-6 h-6 flex-shrink-0">
                <Image 
                  src="/logo.svg" 
                  alt="RemitWise" 
                  width={24} 
                  height={24} 
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
                <PageHeadingLink
                  headingId="financial-insights-page-heading"
                  label="Financial Insights"
                  headingClassName="text-xl xl:text-2xl font-bold text-white"
                  buttonClassName="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
                >
                  Financial Insights
                </PageHeadingLink>
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
            <div className="relative" ref={dateDropdownRef}>
              <button
                type="button"
                onClick={() => { setIsDateDropdownOpen(!isDateDropdownOpen); setIsExportDropdownOpen(false) }}
                className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-[#1a1a1a] hover:bg-[#252525] active:scale-98 transition-all border border-gray-800 touch-manipulation min-h-[44px]"
                aria-label="Select date range"
                aria-expanded={isDateDropdownOpen}
                aria-haspopup="listbox"
              >
                <Calendar className="w-4 h-4 xl:w-5 xl:h-5 text-[#D72323]" />
                <span className="text-sm xl:text-base text-white whitespace-nowrap font-medium">
                  {selectedDateRange === 'Custom Range' && customStart && customEnd
                    ? `${customStart} – ${customEnd}`
                    : `${selectedDateRange} (${currentMonth})`}
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
                  <div
                    className="absolute top-full right-0 mt-2 py-1 bg-[#1a1a1a] border border-gray-800 rounded-xl shadow-2xl z-20 min-w-[260px] animate-in fade-in slide-in-from-top-2 duration-200"
                    role="listbox"
                    aria-label="Date range options"
                    onKeyDown={handleDateKeyDown}
                  >
                    {dateRangeOptions.map((range, index) => (
                      <button
                        key={range}
                        type="button"
                        role="option"
                        aria-selected={selectedDateRange === range}
                        onClick={() => handleDateRangeSelect(range)}
                        onMouseEnter={() => setFocusedDateIndex(index)}
                        tabIndex={focusedDateIndex === index ? 0 : -1}
                        className={`w-full text-left px-4 py-3 text-sm xl:text-base transition-all touch-manipulation min-h-[44px] font-medium ${
                          selectedDateRange === range
                            ? 'bg-[#D72323] text-white shadow-lg'
                            : 'text-gray-300 hover:bg-[#252525] active:bg-[#2a2a2a]'
                        }`}
                      >
                        {range}
                      </button>
                    ))}
                    {/* Custom range date inputs */}
                    {selectedDateRange === 'Custom Range' && (
                      <div className="px-4 py-3 border-t border-gray-800 space-y-2">
                        <label className="text-xs text-gray-400 block">From</label>
                        <input
                          type="date"
                          value={customStart}
                          onChange={(e) => {
                            const val = e.target.value
                            setCustomStart(val)
                            if (val && customEnd) onCustomDateChange?.(val, customEnd)
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D72323]"
                        />
                        <label className="text-xs text-gray-400 block">To</label>
                        <input
                          type="date"
                          value={customEnd}
                          onChange={(e) => {
                            const val = e.target.value
                            setCustomEnd(val)
                            if (customStart && val) onCustomDateChange?.(customStart, val)
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-[#0A0A0A] border border-gray-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D72323]"
                        />
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Export Dropdown */}
            <div className="relative" ref={exportDropdownRef}>
              <button
                type="button"
                onClick={() => { setIsExportDropdownOpen(!isExportDropdownOpen); setIsDateDropdownOpen(false) }}
                data-testid={CTA_TEST_IDS.page.financialInsightsPrimary}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#D72323] hover:bg-[#B91C1C] active:scale-95 transition-all font-semibold text-sm xl:text-base shadow-lg shadow-[#D72323]/30 touch-manipulation min-h-[44px]"
                aria-label="Export financial data"
                aria-expanded={isExportDropdownOpen}
                aria-haspopup="menu"
              >
                <Download className="w-4 h-4 xl:w-5 xl:h-5" />
                <span>Export</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExportDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Export Dropdown Menu */}
              {isExportDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsExportDropdownOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    className="absolute top-full right-0 mt-2 py-1 bg-[#1a1a1a] border border-gray-800 rounded-xl shadow-2xl z-20 min-w-[220px] animate-in fade-in slide-in-from-top-2 duration-200"
                    role="menu"
                    aria-label="Export options"
                    onKeyDown={handleExportKeyDown}
                  >
                    {exportOptions.map((opt, index) => {
                      const Icon = opt.icon
                      return (
                        <button
                          key={opt.format}
                          type="button"
                          role="menuitem"
                          onClick={() => handleExportSelect(opt.format)}
                          onMouseEnter={() => setFocusedExportIndex(index)}
                          tabIndex={focusedExportIndex === index ? 0 : -1}
                          className="w-full text-left px-4 py-3 text-sm xl:text-base transition-all touch-manipulation min-h-[44px] font-medium text-gray-300 hover:bg-[#252525] active:bg-[#2a2a2a] flex items-center gap-3"
                        >
                          <Icon className="w-4 h-4 text-[#D72323]" />
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>

            {/* RemitWise Logo */}
            <Link href="/" className="flex items-center gap-2.5 xl:gap-3 pl-3 xl:pl-4 border-l border-gray-800 group touch-manipulation">
              <div className="w-10 h-10 flex-shrink-0">
                <Image 
                  src="/logo.svg" 
                  alt="RemitWise" 
                  width={40} 
                  height={40} 
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
