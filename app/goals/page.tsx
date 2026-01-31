'use client'

import React from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Plus,
  GraduationCap,
  Heart,
  Home,
  Plane,
  Calendar,
  Clock,
  Target,
  DollarSign,
  TrendingUp
} from 'lucide-react'

// --- Types & Mock Data ---

type GoalType = 'education' | 'health' | 'home' | 'travel'

interface Goal {
  id: string
  title: string
  description: string
  currentAmount: number
  targetAmount: number
  deadline: string // ISO date string YYYY-MM-DD
  type: GoalType
}

const SAMPLE_GOALS: Goal[] = [
  {
    id: '1',
    title: "Children's Education",
    description: "University tuition fund for 2025",
    currentAmount: 8500,
    targetAmount: 15000,
    deadline: "2025-09-01",
    type: 'education'
  },
  {
    id: '2',
    title: "Emergency Medical Fund",
    description: "Healthcare and medical emergencies",
    currentAmount: 3200,
    targetAmount: 5000,
    deadline: "2025-12-31",
    type: 'health'
  },
  {
    id: '3',
    title: "Family Home",
    description: "Down payment for house",
    currentAmount: 12000,
    targetAmount: 25000,
    deadline: "2026-06-01",
    type: 'home'
  },
  {
    id: '4',
    title: "Vacation Trip",
    description: "Family vacation to homeland",
    currentAmount: 2800,
    targetAmount: 3000,
    deadline: "2025-07-15",
    type: 'travel'
  }
]

// --- Helper Functions ---

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount)
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

const getDaysLeft = (dateString: string) => {
  const target = new Date(dateString)
  const today = new Date('2026-01-30T19:10:07+01:00') // Using fixed current time provided in context
  const diffTime = target.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

const getGoalIcon = (type: GoalType) => {
  switch (type) {
    case 'education': return GraduationCap
    case 'health': return Heart
    case 'home': return Home
    case 'travel': return Plane
  }
}

// --- Components ---

const StatCard = ({ label, value, icon: Icon, valueColor = 'text-white' }: { label: string, value: string, icon: any, valueColor?: string }) => (
  <div className="bg-[#111111] p-6 rounded-2xl border border-white/5 flex flex-col justify-between h-32 relative overflow-hidden group">
    <div className="absolute -top-6 -right-6 w-24 h-24 bg-orange-600/10 blur-[30px] rounded-full pointer-events-none group-hover:bg-orange-600/20 transition-all" />
    <div className="absolute top-4 right-4 text-red-500 transition-transform group-hover:scale-110 duration-300">
      <Icon className="w-6 h-6" />
    </div>
    <span className="text-gray-400 text-sm font-medium relative z-10">{label}</span>
    <span className={`text-3xl font-bold ${valueColor} relative z-10`}>{value}</span>
  </div>
)

const GoalCard = ({ goal }: { goal: Goal }) => {
  const Icon = getGoalIcon(goal.type)
  const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
  const daysLeft = getDaysLeft(goal.deadline)
  const isOverdue = daysLeft < 0
  const remainingAmount = goal.targetAmount - goal.currentAmount

  return (
    <div className="bg-[#111111] rounded-2xl p-6 border border-white/5 hover:border-red-500/20 transition-all duration-300 group relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-orange-600/10 blur-[50px] rounded-full pointer-events-none group-hover:bg-orange-600/20 transition-all" />

      {/* Header */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center text-white mb-4 shadow-[0_0_15px_-3px_rgba(220,38,38,0.4)] group-hover:scale-105 transition-transform duration-300">
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="mb-6 relative z-10">
        <h3 className="text-xl font-bold text-white mb-1 group-hover:text-red-500 transition-colors">{goal.title}</h3>
        <p className="text-gray-500 text-sm">{goal.description}</p>
      </div>

      {/* Amount Stats */}
      <div className="flex items-baseline justify-between mb-2 relative z-10">
        <span className="text-2xl font-bold text-white">{formatCurrency(goal.currentAmount)}</span>
        <span className="text-sm text-gray-500">of {formatCurrency(goal.targetAmount)}</span>
      </div>

      {/* Progress Bar */}
      <div className="relative w-full h-2 bg-gray-800 rounded-full mb-2 overflow-hidden z-10">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-red-600 to-red-500 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between text-xs font-medium mb-6 relative z-10">
        <span className="text-white">{percentage.toFixed(1)}% Complete</span>
        <span className="text-gray-500">{formatCurrency(remainingAmount)} remaining</span>
      </div>

      {/* Date & Status */}
      <div className={`rounded-xl p-3 flex items-center justify-between mb-6 border transition-colors relative z-10 ${isOverdue ? 'bg-red-900/10 border-red-500/20' : 'bg-[#1A1A1A] border-white/5'}`}>
        <div className="flex items-center space-x-2">
          <Calendar className={`w-4 h-4 ${isOverdue ? 'text-red-500' : 'text-gray-500'}`} />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 uppercase tracking-wider">Target Date</span>
            <span className="text-xs font-semibold text-white">{formatDate(goal.deadline)}</span>
          </div>
        </div>
        <div className="flex items-center space-x-1.5 px-2 py-1 bg-black/20 rounded-md">
          <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
          <span className={`text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-400'}`}>
            {isOverdue ? 'Overdue' : `${daysLeft}d left`}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3 relative z-10">
        <button className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-all shadow-[0_4px_20px_-4px_rgba(220,38,38,0.5)] hover:shadow-[0_4px_25px_-4px_rgba(220,38,38,0.6)] active:scale-95">
          Add Funds
        </button>
        <button className="bg-[#222] hover:bg-[#333] text-white text-sm font-semibold py-2.5 rounded-xl border border-white/10 transition-colors active:scale-95">
          Details
        </button>
      </div>
    </div>
  )
}

export default function SavingsGoalsPage() {
  const totalGoals = SAMPLE_GOALS.length
  const totalTarget = SAMPLE_GOALS.reduce((acc, goal) => acc + goal.targetAmount, 0)
  const totalSaved = SAMPLE_GOALS.reduce((acc, goal) => acc + goal.currentAmount, 0)

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-red-500/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div className="flex items-center space-x-4">
            <Link href="/" className="w-10 h-10 rounded-full bg-[#111] hover:bg-[#222] flex items-center justify-center transition-colors border border-white/10 text-gray-400 hover:text-white group">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Savings Goals</h1>
              <p className="text-gray-500 mt-1">Track and achieve your financial dreams</p>
            </div>
          </div>

          <button className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-red-900/30 hover:shadow-red-900/50 transition-all flex items-center space-x-2 group">
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
            <span>New Goal</span>
          </button>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <StatCard
            label="Total Goals"
            value={totalGoals.toString()}
            icon={Target}
            valueColor="text-white"
          />
          <StatCard
            label="Total Target"
            value={formatCurrency(totalTarget)}
            icon={DollarSign}
            valueColor="text-white"
          />
          <StatCard
            label="Total Saved"
            value={formatCurrency(totalSaved)}
            icon={TrendingUp}
            valueColor="text-white"
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {SAMPLE_GOALS.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>

      </div>
    </div>
  )
}
