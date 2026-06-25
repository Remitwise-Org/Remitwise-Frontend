'use client'

import { useState, useMemo } from 'react'
import {
  GraduationCap,
  HeartPulse,
  Home,
  Plane,
} from 'lucide-react'
import PageHeader from '@/components/PageHeader'
import SavingsGoalCard from '@/components/Dashboard/SavingsGoalCard'
import SavingsGoalsStatsCards from './components/SavingsGoalsStatsCards'
import SavingsGoalModal from './components/SavingsGoalModal'
import { SavingsGoal } from './types'
import { calculateDaysLeft, checkIsOverdue } from './utils'
import { useClientTranslator } from '@/lib/i18n/client'

// Sample data matching Figma design
const initialGoals: SavingsGoal[] = [
  {
    id: 1,
    title: "Children's Education",
    description: 'Saving for school fees and supplies',
    icon: <GraduationCap className="w-6 h-6" />,
    iconGradient: { from: '#DC2626', to: '#B91C1C' },
    currentAmount: 3600,
    targetAmount: 5000,
    targetDate: '2026-12-31',
  },
  {
    id: 2,
    title: 'Emergency Medical Fund',
    description: 'Building emergency health fund',
    icon: <HeartPulse className="w-6 h-6" />,
    iconGradient: { from: '#F87171', to: '#EF4444' },
    currentAmount: 1800,
    targetAmount: 2000,
    targetDate: '2026-08-15',
  },
  {
    id: 3,
    title: 'Family Home',
    description: 'Saving for down payment on house',
    icon: <Home className="w-6 h-6" />,
    iconGradient: { from: '#DC2626', to: '#B91C1C' },
    currentAmount: 8500,
    targetAmount: 25000,
    targetDate: '2026-05-15', // This will be overdue as of June 17, 2026
  },
  {
    id: 4,
    title: 'Vacation Trip',
    description: 'Family vacation to the beach',
    icon: <Plane className="w-6 h-6" />,
    iconGradient: { from: '#F87171', to: '#EF4444' },
    currentAmount: 3000,
    targetAmount: 3000,
    targetDate: '2026-07-01',
  },
]

export default function SavingsGoalsPage() {
  const { t } = useClientTranslator()
  const [goals, setGoals] = useState<SavingsGoal[]>(initialGoals)
  const [showModal, setShowModal] = useState(false)
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null)

  // Calculate summary stats dynamically
  const stats = useMemo(() => {
    const totalGoals = goals.length
    const totalTarget = goals.reduce((sum, goal) => sum + goal.targetAmount, 0)
    const totalSaved = goals.reduce((sum, goal) => sum + goal.currentAmount, 0)
    return { totalGoals, totalTarget, totalSaved }
  }, [goals])

  const handleNewGoal = () => {
    setEditingGoal(null)
    setShowModal(true)
  }

  const handleEditGoal = (goal: SavingsGoal) => {
    setEditingGoal(goal)
    setShowModal(true)
  }

  const handleSaveGoal = (goalData: Partial<SavingsGoal>) => {
    if (editingGoal) {
      setGoals(goals.map(g => g.id === editingGoal.id ? { ...g, ...goalData } as SavingsGoal : g))
    } else {
      const newGoal: SavingsGoal = {
        ...goalData,
        id: Date.now(),
        currentAmount: 0,
      } as SavingsGoal
      setGoals([...goals, newGoal])
    }
    setShowModal(false)
  }

  return (
    <div className="min-h-screen bg-[#010101] safari-safe-bottom">
      {/* Header */}
      <PageHeader
        title={t('savingsGoals.title')}
        subtitle={t('savingsGoals.subtitle')}
        ctaLabel={t('savingsGoals.newGoal')}
        onCtaClick={handleNewGoal}
        showBottomDivider
      />

      <main className="mx-auto max-w-7xl overflow-x-hidden px-5 py-7 320:px-6 375:px-7 375:py-8 tablet:px-6 laptop:px-8">
        {/* Savings Goals Stats Cards */}
        <div className="mb-7 375:mb-8">
          <SavingsGoalsStatsCards
            totalGoals={stats.totalGoals}
            totalTarget={stats.totalTarget}
            totalSaved={stats.totalSaved}
          />
        </div>

        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-gray-300">
          Savings goals are tracked in USDC and stored through the connected savings_goals contract. Funds remain in your wallet until each signed goal action is submitted.
        </div>

        {/* Goals Grid */}
        <div className="grid min-w-0 grid-cols-1 gap-5 375:gap-6 450:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => (
            <SavingsGoalCard
              key={goal.id}
              title={goal.title}
              description={goal.description}
              icon={goal.icon}
              iconGradient={goal.iconGradient}
              currentAmount={goal.currentAmount}
              targetAmount={goal.targetAmount}
              targetDate={goal.targetDate}
              daysLeft={calculateDaysLeft(goal.targetDate)}
              isOverdue={checkIsOverdue(goal.targetDate)}
              onAddFunds={() => console.log('Add funds to', goal.title)}
              onEdit={() => handleEditGoal(goal)}
            />
          ))}
        </div>
      </main>

      {/* Savings Goal Modal */}
      <SavingsGoalModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveGoal}
        editingGoal={editingGoal}
      />
    </div>
  )
}

