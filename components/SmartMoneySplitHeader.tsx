'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, AlertCircle } from 'lucide-react'
import { SPLIT_BUCKETS } from '@/lib/config/split-buckets'
import type { SplitConfig } from '@/lib/remittance/split'

interface SmartMoneySplitHeaderProps {
  totalPercentage?: number
  /** Current allocation — when provided, renders a compact proportional bar */
  allocation?: SplitConfig
}

/**
 * Rounds an array of values so they sum exactly to 100 (largest-remainder method).
 * Duplicated from the split page so the header stays self-contained.
 */
function roundToHundred(values: number[]): number[] {
  const floored = values.map(Math.floor)
  const remainders = values.map((v, i) => ({ i, r: v - floored[i] }))
  const deficit = 100 - floored.reduce((a, b) => a + b, 0)
  remainders
    .sort((a, b) => b.r - a.r)
    .slice(0, deficit)
    .forEach(({ i }) => { floored[i]++ })
  return floored
}

export default function SmartMoneySplitHeader({
  totalPercentage = 100,
  allocation,
}: SmartMoneySplitHeaderProps) {
  const router = useRouter()
  const isValid = totalPercentage === 100

  // Build display segments when an allocation is provided and valid
  const segments =
    allocation && isValid
      ? (() => {
          const raw = SPLIT_BUCKETS.map((b) => allocation[b.key])
          const rounded = roundToHundred(raw)
          return SPLIT_BUCKETS.map((b, i) => ({ ...b, pct: rounded[i] }))
        })()
      : null

  return (
    <div className="bg-[#010101] text-white safari-safe-top">
      <div className="max-w-7xl mx-auto px-5 320:px-6 375:px-7 sm:px-6 lg:px-8 pt-7 375:pt-8 pb-5 375:pb-6">
        {/* Header Top Section */}
        <div className="flex min-w-0 items-start gap-3 375:gap-4 mb-7 375:mb-8">
          <button
            onClick={() => router.back()}
            className="touch-target flex-shrink-0 flex items-center justify-center w-10 h-10 375:w-11 375:h-11 rounded-full bg-[#1a1a1a] border border-white/10 hover:bg-[#252525] transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          <div className="min-w-0">
            <h1 className="break-words text-2xl 375:text-3xl font-bold text-white tracking-tight">Smart Money Split</h1>
            <p className="text-white/40 text-xs 375:text-sm mt-1">Configure automatic allocation</p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-white/5 mb-7 375:mb-8" />

        {/* Description Section */}
        <div className="mb-7 375:mb-8">
          <p className="text-white/70 text-sm 375:text-base leading-relaxed">
            Set how your remittances are automatically split across different categories. This helps your family manage money more effectively.
          </p>
        </div>

        {/* Compact allocation bar — shown when allocation prop is supplied */}
        {segments && (
          <div className="mb-5 375:mb-6">
            {/* Segmented bar */}
            <div
              className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/10"
              role="img"
              aria-label={segments.map((s) => `${s.label} ${s.pct}%`).join(', ')}
            >
              {segments.map((s) =>
                s.pct > 0 ? (
                  <div
                    key={s.key}
                    className={`${s.barColor} h-full`}
                    style={{ width: `${s.pct}%` }}
                  />
                ) : null
              )}
            </div>

            {/* Legend — icon + text, not color alone */}
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
              {segments.map((s) => {
                const Icon = s.icon
                return (
                  <span key={s.key} className="flex items-center gap-1.5 text-xs text-white/50">
                    <Icon className={`h-3 w-3 ${s.textColor}`} aria-hidden="true" />
                    <span className={s.textColor}>{s.pct}%</span>
                    <span>{s.label}</span>
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Alert Section */}
        <div className="rounded-xl bg-[#1c0a0a] border border-[#3d1414] p-4 375:p-5 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-xs 375:text-sm text-white">
            <span className="font-bold">Important:</span> <span className='text-white/80'>Percentages must total exactly 100%</span>
          </p>
        </div>
      </div>
    </div>
  )
}
