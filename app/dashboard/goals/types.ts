import { ReactNode } from 'react'

export interface SavingsGoal {
  id: number | string
  title: string
  description: string
  icon: ReactNode
  iconGradient: { from: string; to: string }
  currentAmount: number
  targetAmount: number
  targetDate: string
}

export interface SavingsGoalFormData {
  title: string
  description: string
  targetAmount: number
  targetDate: string
  iconType: 'education' | 'medical' | 'home' | 'vacation'
}
