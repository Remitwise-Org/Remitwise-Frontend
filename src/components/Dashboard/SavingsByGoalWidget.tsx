'use client'

import React, { useCallback, useState } from 'react'
import { PiggyBank } from 'lucide-react'
import WidgetEmptyState from '@/components/ui/WidgetEmptyState'
import WidgetErrorState from '@/components/ui/WidgetErrorState'

interface SavingsGoal {
  name: string
  amount: number
  percentage: number
}

interface SavingsByGoalWidgetProps {
  /** Pass an empty array to show the empty state */
  goals?: SavingsGoal[]
  /** Pass true to show the error state */
  hasError?: boolean
}

export default function SavingsByGoalWidget({
  goals = [
    { name: 'Emergency Fund', amount: 720, percentage: 46 },
    { name: 'Education Fund', amount: 550, percentage: 35 },
    { name: 'Medical Fund', amount: 310, percentage: 19 },
  ],
  hasError = false,
}: SavingsByGoalWidgetProps) {
  const [retryKey, setRetryKey] = useState(0)
  const handleRetry = useCallback(() => setRetryKey((k) => k + 1), [])

  const isEmpty = !hasError && goals.length === 0

  return (
    <div key={retryKey} className="bg-[#0f0f0f] rounded-2xl p-6 border border-gray-800 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <PiggyBank className="w-6 h-6 text-red-500" aria-hidden="true" />
        <h2 className="text-xl font-bold text-white">Savings by Goal</h2>
      </div>
      <p className="text-sm text-gray-400 mb-6">Where you&apos;re saving</p>

      {hasError ? (
        <WidgetErrorState
          message="We couldn't load your savings goals. Please try again."
          onRetry={handleRetry}
        />
      ) : isEmpty ? (
        <WidgetEmptyState
          icon={PiggyBank}
          title="No savings goals yet"
          description="Create a goal to start tracking your savings progress."
          ctaLabel="Create a goal"
          ctaHref="/goals"
        />
      ) : (
        <div className="space-y-6">
          {goals.map((goal, index) => (
            <div key={index}>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-white">{goal.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white">${goal.amount}</span>
                  <span className="text-xs text-gray-400">{goal.percentage}%</span>
                </div>
              </div>
              <div
                className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden"
                role="progressbar"
                aria-valuenow={goal.percentage}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${goal.name} progress`}
              >
                <div
                  className="bg-red-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${goal.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
