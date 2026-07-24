'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus } from 'lucide-react'
import PageHeadingLink from '@/components/PageHeadingLink'

type PageHeaderProps = {
  title: string
  subtitle: string
  ctaLabel: string
  onCtaClick?: () => void
  ctaTestId?: string
  showBottomDivider?: boolean
  headingId?: string
  /** 'red' (default) or 'redOrange' for reddish-orange CTA e.g. Savings Goals */
  ctaVariant?: 'red' | 'redOrange'
}

export default function PageHeader({
  title,
  subtitle,
  ctaLabel,
  onCtaClick,
  ctaTestId,
  showBottomDivider = false,
  headingId = 'page-heading',
  ctaVariant = 'red',
}: PageHeaderProps) {
  const router = useRouter()

  const ctaClass =
    ctaVariant === 'redOrange'
      ? 'flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 bg-gradient-to-b from-orange-600 to-orange-700 text-white font-medium transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010101]'
      : 'flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 bg-gradient-to-b from-red-600 to-red-700 text-white font-medium transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010101]'

  return (
    <header className="overflow-x-hidden bg-[#010101] text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-[14px] bg-[#1a1a1a] hover:bg-[#252525] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010101]"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="min-w-0">
              <h1 className="break-words text-xl font-bold text-white sm:text-2xl">{title}</h1>
              <p className="mt-0.5 break-words text-sm text-gray-400">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCtaClick}
            data-testid={ctaTestId}
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
