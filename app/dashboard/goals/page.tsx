'use client'

import { useState } from 'react'
import {
  Target,
  DollarSign,
  PiggyBank,
  GraduationCap,
  HeartPulse,
  Home,
  Plane,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import DashboardInfoCard from '@/components/Dashboard/DashboardInfoCard'
import SavingsGoalCard from '@/components/Dashboard/SavingsGoalCard'

// Sample data matching Figma design
const goalsData = [
  {
    id: 1,
    title: "Children's Education",
    description: 'Saving for school fees and supplies',
    icon: <GraduationCap className="w-6 h-6" />,
    iconGradient: { from: '#DC2626', to: '#B91C1C' },
    currentAmount: 3600,
    targetAmount: 5000,
    targetDate: 'Dec 31, 2025',
    daysLeft: 335,
    isOverdue: false,
  },
  {
    id: 2,
    title: 'Emergency Medical Fund',
    description: 'Building emergency health fund',
    icon: <HeartPulse className="w-6 h-6" />,
    iconGradient: { from: '#F87171', to: '#EF4444' },
    currentAmount: 1800,
    targetAmount: 2000,
    targetDate: 'Mar 15, 2025',
    daysLeft: 44,
    isOverdue: false,
  },
  {
    id: 3,
    title: 'Family Home',
    description: 'Saving for down payment on house',
    icon: <Home className="w-6 h-6" />,
    iconGradient: { from: '#DC2626', to: '#B91C1C' },
    currentAmount: 8500,
    targetAmount: 25000,
    targetDate: 'Jan 15, 2025',
    isOverdue: true,
  },
  {
    id: 4,
    title: 'Vacation Trip',
    description: 'Family vacation to the beach',
    icon: <Plane className="w-6 h-6" />,
    iconGradient: { from: '#F87171', to: '#EF4444' },
    currentAmount: 1200,
    targetAmount: 3000,
    targetDate: 'Jul 1, 2025',
    daysLeft: 152,
    isOverdue: false,
  },
]

// Calculate summary stats
const totalGoals = goalsData.length
const totalTarget = goalsData.reduce((sum, goal) => sum + goal.targetAmount, 0)
const totalSaved = goalsData.reduce((sum, goal) => sum + goal.currentAmount, 0)

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function SavingsGoalsPage() {
  const [showNewGoalModal, setShowNewGoalModal] = useState(false)

  return (
    <div className="min-h-screen bg-[#010101]">
      {/* Header */}
      <PageHeader
        title="Savings Goals"
        subtitle="Track and achieve your financial dreams"
        ctaLabel="New Goal"
        onCtaClick={() => setShowNewGoalModal(true)}
        showBottomDivider
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <DashboardInfoCard
            title="Total Goals"
            value={String(totalGoals).padStart(2, '0')}
            icon={<Target className="w-5 h-5" />}
          />
          <DashboardInfoCard
            title="Total Target"
            value={formatCurrency(totalTarget)}
            icon={<DollarSign className="w-5 h-5" />}
          />
          <DashboardInfoCard
            title="Total Saved"
            value={formatCurrency(totalSaved)}
            icon={<PiggyBank className="w-5 h-5" />}
          />
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {goalsData.map((goal) => (
            <SavingsGoalCard
              key={goal.id}
              title={goal.title}
              description={goal.description}
              icon={goal.icon}
              iconGradient={goal.iconGradient}
              currentAmount={goal.currentAmount}
              targetAmount={goal.targetAmount}
              targetDate={goal.targetDate}
              daysLeft={goal.daysLeft}
              isOverdue={goal.isOverdue}
              onAddFunds={() => console.log('Add funds to', goal.title)}
              onDetails={() => console.log('View details for', goal.title)}
            />
          ))}
        </div>
      </main>

      {/* New Goal Modal Placeholder */}
      {showNewGoalModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setShowNewGoalModal(false)}
        >
          <div
            className="rounded-2xl p-8 max-w-md mx-4"
            style={{
              background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-xl font-bold text-white mb-4">Create New Goal</h2>
            <p className="text-sm text-white/50 mb-6">
              Goal creation form will be implemented here. Connect to savings_goals smart contract.
            </p>
            <button
              type="button"
              onClick={() => setShowNewGoalModal(false)}
              className="w-full h-[42px] rounded-[14px] text-sm font-semibold text-white"
              style={{
                background: 'linear-gradient(180deg, #DC2626 0%, #B91C1C 100%)',
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
