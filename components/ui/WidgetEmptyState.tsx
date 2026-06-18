import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface WidgetEmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
}

export default function WidgetEmptyState({
  icon: Icon,
  title,
  description,
  ctaLabel,
  ctaHref,
}: WidgetEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#DC2626]/30 bg-[#DC2626]/10 text-[#DC2626]">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-white/50">{description}</p>
      </div>
      <Link
        href={ctaHref}
        className="rounded-lg bg-[#DC2626] px-4 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
      >
        {ctaLabel}
      </Link>
    </div>
  )
}
