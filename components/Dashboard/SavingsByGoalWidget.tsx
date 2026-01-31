'use client'

import React from 'react'
import { PiggyBank } from 'lucide-react'

interface SavingsGoal {
  name: string
  amount: number
  percentage: number
}

interface SavingsByGoalWidgetProps {
  goals?: SavingsGoal[]
}

export default function SavingsByGoalWidget({
  goals = [
    { name: 'Emergency Fund', amount: 720, percentage: 46 },
    { name: 'Education Fund', amount: 550, percentage: 35 },
    { name: 'Medical Fund', amount: 310, percentage: 19 },
  ],
}: SavingsByGoalWidgetProps) {
  return (
    <div className="bg-[#0f0f0f] rounded-2xl p-6 border border-gray-800 w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <PiggyBank className="w-6 h-6 text-red-500" />
        <h2 className="text-xl font-bold text-white">Savings by Goal</h2>
      </div>
      
      {/* Subtitle */}
      <p className="text-sm text-gray-400 mb-6">Where you're saving</p>

      {/* Goals List */}
      <div className="space-y-6">
        {goals.map((goal, index) => (
          <div key={index}>
            {/* Goal Header - Name, Amount, Percentage */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-white">{goal.name}</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-white">${goal.amount}</span>
                <span className="text-xs text-gray-400">{goal.percentage}%</span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-red-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${goal.percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
