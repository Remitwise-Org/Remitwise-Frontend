'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, AlertCircle } from 'lucide-react'

interface SmartMoneySplitHeaderProps {
  totalPercentage?: number
}

export default function SmartMoneySplitHeader({ totalPercentage = 100 }: SmartMoneySplitHeaderProps) {
  const router = useRouter()
  const isValid = totalPercentage === 100

  return (
    <div className="bg-[#010101] text-white safari-safe-top">
      <div className="max-w-7xl mx-auto px-5 320:px-6 375:px-7 sm:px-6 lg:px-8 pt-7 375:pt-8 pb-5 375:pb-6">
        {/* Header Top Section */}
        <div className="flex items-start gap-3 375:gap-4 mb-7 375:mb-8">
          <button
            onClick={() => router.back()}
            className="touch-target flex-shrink-0 flex items-center justify-center w-10 h-10 375:w-11 375:h-11 rounded-full bg-[#1a1a1a] border border-white/10 hover:bg-[#252525] transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          <div>
            <h1 className="text-2xl 375:text-3xl font-bold text-white tracking-tight">Smart Money Split</h1>
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
