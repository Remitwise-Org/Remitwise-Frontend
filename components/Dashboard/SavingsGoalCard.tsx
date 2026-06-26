'use client'

import { ReactNode } from 'react'
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
    Clock,
    Clock3,
    Sparkles,
} from 'lucide-react'
import { useClientTranslator } from '@/lib/i18n/client'

export interface SavingsGoalCardProps {
    title: string
    description: string
    icon: ReactNode
    iconGradient: { from: string; to: string }
    currentAmount: number
    targetAmount: number
    targetDate: string
    daysLeft?: number
    isOverdue?: boolean
    onAddFunds?: () => void
    onEdit?: () => void
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
}

function formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    }).format(new Date(dateString))
}

export default function SavingsGoalCard({
    title,
    description,
    icon,
    iconGradient,
    currentAmount,
    targetAmount,
    targetDate,
    daysLeft,
    isOverdue = false,
    onAddFunds,
    onEdit,
}: SavingsGoalCardProps) {
    const { t } = useClientTranslator()
    const percentage = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0
    const remaining = Math.max(targetAmount - currentAmount, 0)
    const isComplete = !isOverdue && percentage >= 100
    const isNearComplete = !isOverdue && !isComplete && percentage >= 90

    const state = isOverdue
        ? 'overdue'
        : isComplete
        ? 'complete'
        : isNearComplete
        ? 'near-complete'
        : 'on-track'

    const statusStyles = {
        overdue: {
            label: t('savingsGoals.card.overdue'),
            icon: AlertTriangle,
            background: 'rgba(220, 38, 38, 0.18)',
            border: 'rgba(220, 38, 38, 0.35)',
            text: '#FCA5A5',
        },
        complete: {
            label: t('savingsGoals.card.complete'),
            icon: CheckCircle2,
            background: 'rgba(16, 185, 129, 0.16)',
            border: 'rgba(34, 197, 94, 0.28)',
            text: '#A7F3D0',
        },
        'near-complete': {
            label: t('savingsGoals.card.nearComplete'),
            icon: Sparkles,
            background: 'rgba(245, 158, 11, 0.18)',
            border: 'rgba(245, 158, 11, 0.3)',
            text: '#FCD34D',
        },
        'on-track': {
            label: t('savingsGoals.card.onTrack'),
            icon: Clock3,
            background: 'rgba(56, 189, 248, 0.18)',
            border: 'rgba(56, 189, 248, 0.3)',
            text: '#7DD3FC',
        },
    }[state]

    const targetInfoLabel = isOverdue
        ? t('savingsGoals.card.overdue')
        : isComplete
        ? t('savingsGoals.card.goalMet')
        : daysLeft !== undefined
        ? t('savingsGoals.card.daysLeft', { count: daysLeft })
        : t('savingsGoals.card.noDeadline')

    return (
        <div
            className="relative box-border rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#111111_0%,#090909_100%)] p-5 320:p-6 375:p-7 overflow-hidden"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        >
            <div
                className="absolute right-0 top-0 h-32 w-32 rounded-full"
                style={{
                    background: 'rgba(255,255,255,0.04)',
                    filter: 'blur(60px)',
                }}
            />

            <div className="relative z-10 flex flex-col gap-5">
                <div className="flex min-w-0 items-start justify-between gap-3 375:gap-4">
                    <div
                        className="w-12 h-12 rounded-[14px] flex items-center justify-center"
                        style={{
                            background: `linear-gradient(180deg, ${iconGradient.from} 0%, ${iconGradient.to} 100%)`,
                        }}
                    >
                        <div className="w-6 h-6 text-white">{icon}</div>
                    </div>

                    <div
                        className="inline-flex max-w-full shrink items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                        style={{
                            background: statusStyles.background,
                            border: `1px solid ${statusStyles.border}`,
                            color: statusStyles.text,
                        }}
                    >
                        <statusStyles.icon className="w-3.5 h-3.5" />
                        <span className="truncate">{statusStyles.label}</span>
                    </div>
                </div>

                <div className="min-w-0 space-y-1">
                    <h3 className="min-w-0 text-lg font-bold tracking-tight text-white line-clamp-2 [overflow-wrap:anywhere]">
                        {title}
                    </h3>
                    <p className="min-w-0 text-sm tracking-tight text-white/60 line-clamp-2 [overflow-wrap:anywhere]">{description}</p>
                </div>

                <div className="grid min-w-0 gap-4 tablet:grid-cols-[1.3fr_0.9fr]">
                    <div className="min-w-0 space-y-2">
                        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span className="text-2xl font-bold text-white tracking-wide">
                                {formatCurrency(currentAmount)}
                            </span>
                            <span className="text-sm tracking-tight text-white/50">
                                of {formatCurrency(targetAmount)}
                            </span>
                        </div>
                        <div className="min-w-0 break-words text-sm font-semibold text-white/70">
                            {isComplete
                                ? t('savingsGoals.card.complete')
                                : t('savingsGoals.card.needMore', { amount: formatCurrency(remaining) })}
                        </div>
                    </div>
                    <div className="min-w-0 rounded-[18px] border border-white/10 bg-white/5 p-3">
                        <p className="truncate text-xs uppercase tracking-[0.2em] text-white/40">{t('savingsGoals.card.target')}</p>
                        <p className="mt-1 break-words text-sm font-semibold text-white">{formatDate(targetDate)}</p>
                        <p className={`mt-2 break-words text-sm font-semibold ${isOverdue ? 'text-red-300' : isComplete ? 'text-emerald-200' : 'text-white/70'}`}>
                            {targetInfoLabel}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="w-full h-2.5 overflow-hidden rounded-full bg-white/10">
                        <div
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(percentage)}
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                                width: `${percentage}%`,
                                background: `linear-gradient(180deg, ${iconGradient.from} 0%, ${iconGradient.to} 100%)`,
                                boxShadow: '0 0 20px rgba(255,255,255,0.08)',
                            }}
                        />
                    </div>
                    <div className="flex flex-col gap-2 tablet:flex-row tablet:items-center tablet:justify-between">
                        <span className="min-w-0 break-words text-sm font-semibold text-white">
                            {percentage.toFixed(0)}% complete
                        </span>
                        <span className="min-w-0 break-words text-sm text-white/60">
                            {isComplete ? t('savingsGoals.card.goalMet') : t('savingsGoals.card.remaining', { amount: formatCurrency(remaining) })}
                        </span>
                    </div>
                </div>

                <div className="grid gap-3 tablet:grid-cols-2">
                    <button
                        type="button"
                        onClick={onAddFunds}
                        className="touch-target-wide rounded-[14px] bg-gradient-to-b from-[#DC2626] to-[#B91C1C] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110"
                    >
                        {t('savingsGoals.card.addFunds')}
                    </button>
                    <button
                        type="button"
                        onClick={onEdit}
                        className="touch-target-wide rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10"
                    >
                        {t('savingsGoals.card.edit')}
                    </button>
                </div>
            </div>
        </div>
    )
}
