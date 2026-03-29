'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'

type PageHeaderProps = {
  title: string
  subtitle: string
  ctaLabel: string
  onCtaClick?: () => void
  showBottomDivider?: boolean
  /** 'red' (default) or 'redOrange' for reddish-orange CTA e.g. Savings Goals */
  ctaVariant?: 'red' | 'redOrange'
}

export default function PageHeader({
  title,
  subtitle,
  ctaLabel,
  onCtaClick,
  showBottomDivider = false,
  ctaVariant = 'red',
}: PageHeaderProps) {
  const router = useRouter()

  const ctaClass =
    ctaVariant === 'redOrange'
      ? 'flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 bg-gradient-to-b from-orange-600 to-orange-700 text-white font-medium transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010101]'
      : 'flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 bg-gradient-to-b from-red-600 to-red-700 text-white font-medium transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010101]'

  return (
    <header className="bg-[#010101] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-[14px] bg-[#1a1a1a] hover:bg-[#252525] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010101]"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">{title}</h1>
              <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCtaClick}
            className={ctaClass}
          >
            <Plus className="w-5 h-5" />
            <span>{ctaLabel}</span>
          </button>
        </div>
      </div>
      {showBottomDivider && (
        <div className="h-px w-full bg-gray-600/50" aria-hidden />
      )}
    </header>
  )
}
