'use client'

import { ReactNode } from 'react'
import {
    AlertTriangle,
    Calendar,
    CheckCircle2,
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

// ── Progress bar state helpers ───────────────────────────────────────────────

type ProgressState = 'early' | 'near-complete' | 'complete' | 'overdue'

function deriveProgressState(
    percentage: number,
    isOverdue: boolean,
): ProgressState {
    if (isOverdue) return 'overdue'
    if (percentage >= 100) return 'complete'
    if (percentage >= 90) return 'near-complete'
    return 'early'
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface ProgressBarProps {
    percentage: number
    state: ProgressState
    iconGradient: { from: string; to: string }
    ariaLabel: string
}

function ProgressBar({ percentage, state, iconGradient, ariaLabel }: ProgressBarProps) {
    // Overdue: use error token bg via inline rgba matching the Tailwind token
    // (status.error.fg = #FDA4AF, status.error.border = rgba(244,63,94,0.28))
    // We use the exact token values from tailwind.config so the progress bar
    // conveys urgency via shape + label, not color alone.
    const fillStyle: React.CSSProperties =
        state === 'overdue'
            ? {
                  width: `${percentage}%`,
                  background: '#FDA4AF', // status.error.fg
                  boxShadow: '0 0 12px rgba(244, 63, 94, 0.35)',
              }
            : state === 'complete'
            ? {
                  width: '100%',
                  background: '#86EFAC', // status.success.fg
                  boxShadow: '0 0 12px rgba(34, 197, 94, 0.25)',
              }
            : state === 'near-complete'
            ? {
                  width: `${percentage}%`,
                  background: '#FDE68A', // status.warning.fg
                  boxShadow: '0 0 12px rgba(245, 158, 11, 0.25)',
              }
            : {
                  // early — use icon gradient, consistent with design
                  width: `${percentage}%`,
                  background: `linear-gradient(90deg, ${iconGradient.from} 0%, ${iconGradient.to} 100%)`,
                  boxShadow: '0 0 20px rgba(255,255,255,0.08)',
              }

    return (
        <div
            className="w-full h-2.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(percentage)}
            aria-label={ariaLabel}
        >
            <div
                className="h-full rounded-full transition-all duration-300"
                style={fillStyle}
            />
        </div>
    )
}

// ── Status badge config keyed by ProgressState ────────────────────────────────

const STATUS_CONFIG = {
    early: {
        // info-tone badge — on track, low urgency
        badgeClassName:
            'border border-status-info-border bg-status-info-bg text-status-info-fg',
        Icon: Clock3,
        labelKey: 'savingsGoals.card.onTrack' as const,
    },
    'near-complete': {
        // warning-tone badge — approaching target
        badgeClassName:
            'border border-status-warning-border bg-status-warning-bg text-status-warning-fg',
        Icon: Sparkles,
        labelKey: 'savingsGoals.card.nearComplete' as const,
    },
    complete: {
        // success-tone badge — goal met
        badgeClassName:
            'border border-status-success-border bg-status-success-bg text-status-success-fg',
        Icon: CheckCircle2,
        labelKey: 'savingsGoals.card.complete' as const,
    },
    overdue: {
        // error-tone badge — uses status tokens + icon, not color alone
        badgeClassName:
            'border border-status-error-border bg-status-error-bg text-status-error-fg',
        Icon: AlertTriangle,
        labelKey: 'savingsGoals.card.overdue' as const,
    },
} as const

// ── Main component ────────────────────────────────────────────────────────────

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

    const percentage = targetAmount > 0
        ? Math.min((currentAmount / targetAmount) * 100, 100)
        : 0
    const remaining = Math.max(targetAmount - currentAmount, 0)

    const progressState = deriveProgressState(percentage, isOverdue)

    const { badgeClassName, Icon: StatusIcon, labelKey } = STATUS_CONFIG[progressState]
    const statusLabel = t(labelKey)

    // Target date info line:
    //  - overdue + no daysLeft → show the target date (required by spec)
    //  - overdue + daysLeft (shouldn't happen, but guard) → "Overdue"
    //  - complete → "Goal met"
    //  - daysLeft defined → "X days left"
    //  - else → show formatted date (no deadline text)
    const targetInfoLine: string = (() => {
        if (progressState === 'overdue') {
            // When daysLeft is unavailable, surface the missed target date explicitly
            return daysLeft === undefined
                ? `Missed ${formatDate(targetDate)}`
                : t('savingsGoals.card.overdue')
        }
        if (progressState === 'complete') return t('savingsGoals.card.goalMet')
        if (daysLeft !== undefined) return t('savingsGoals.card.daysLeft', { count: daysLeft })
        return formatDate(targetDate)
    })()

    // ARIA label for progress bar — conveys state via text
    const progressAriaLabel = `${title}: ${Math.round(percentage)}% complete${progressState === 'overdue' ? ', overdue' : ''}`

    return (
        <div
            className="relative box-border rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#111111_0%,#090909_100%)] p-5 320:p-6 375:p-7 overflow-hidden"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        >
            {/* Decorative glow */}
            <div
                className="absolute right-0 top-0 h-32 w-32 rounded-full"
                style={{
                    background: 'rgba(255,255,255,0.04)',
                    filter: 'blur(60px)',
                }}
                aria-hidden="true"
            />

            <div className="relative z-10 flex flex-col gap-5">
                {/* ── Row 1: icon + status badge ── */}
                <div className="flex min-w-0 items-start justify-between gap-3 375:gap-4">
                    <div
                        className="w-12 h-12 shrink-0 rounded-[14px] flex items-center justify-center"
                        style={{
                            background: `linear-gradient(180deg, ${iconGradient.from} 0%, ${iconGradient.to} 100%)`,
                        }}
                        aria-hidden="true"
                    >
                        <div className="w-6 h-6 text-white">{icon}</div>
                    </div>

                    {/* Status badge — icon + text label, never color alone */}
                    <div
                        className={`inline-flex max-w-full shrink items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${badgeClassName}`}
                    >
                        <StatusIcon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{statusLabel}</span>
                    </div>
                </div>

                {/* ── Row 2: title + description ── */}
                <div className="min-w-0 space-y-1">
                    <h3 className="min-w-0 text-lg font-bold tracking-tight text-white line-clamp-2 [overflow-wrap:anywhere]">
                        {title}
                    </h3>
                    <p className="min-w-0 text-sm tracking-tight text-white/60 line-clamp-2 [overflow-wrap:anywhere]">
                        {description}
                    </p>
                </div>

                {/* ── Row 3: amounts + target date box ── */}
                <div className="grid min-w-0 gap-4 tablet:grid-cols-[1.3fr_0.9fr]">
                    {/* Left: current / target + remaining */}
                    <div className="min-w-0 space-y-2">
                        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                            <span className="text-2xl font-bold text-white tracking-wide">
                                {formatCurrency(currentAmount)}
                            </span>
                            <span className="text-sm tracking-tight text-white/50">
                                of {formatCurrency(targetAmount)}
                            </span>
                        </div>
                        {/* Amount remaining — visible text, not color only */}
                        <div className="min-w-0 break-words text-sm font-semibold text-white/70">
                            {progressState === 'complete'
                                ? t('savingsGoals.card.complete')
                                : t('savingsGoals.card.needMore', { amount: formatCurrency(remaining) })}
                        </div>
                    </div>

                    {/* Right: target date box */}
                    <div
                        className={`min-w-0 rounded-[18px] p-3 border ${
                            progressState === 'overdue'
                                ? 'border-status-error-border bg-status-error-soft'
                                : 'border-white/10 bg-white/5'
                        }`}
                    >
                        <p className="flex items-center gap-1 truncate text-xs uppercase tracking-[0.2em] text-white/40">
                            <Calendar className="w-3 h-3 shrink-0" aria-hidden="true" />
                            {t('savingsGoals.card.target')}
                        </p>
                        <p className="mt-1 break-words text-sm font-semibold text-white">
                            {formatDate(targetDate)}
                        </p>
                        {/* targetInfoLine — overdue shows date label + icon when daysLeft missing */}
                        <p
                            className={`mt-2 break-words text-xs font-semibold leading-tight ${
                                progressState === 'overdue'
                                    ? 'text-status-error-fg'
                                    : progressState === 'complete'
                                    ? 'text-status-success-fg'
                                    : progressState === 'near-complete'
                                    ? 'text-status-warning-fg'
                                    : 'text-white/70'
                            }`}
                        >
                            {progressState === 'overdue' && (
                                <AlertTriangle className="mr-1 inline-block w-3 h-3 align-text-top" aria-hidden="true" />
                            )}
                            {targetInfoLine}
                        </p>
                    </div>
                </div>

                {/* ── Row 4: progress bar + percentage / remaining ── */}
                <div className="space-y-3">
                    <ProgressBar
                        percentage={percentage}
                        state={progressState}
                        iconGradient={iconGradient}
                        ariaLabel={progressAriaLabel}
                    />
                    <div className="flex flex-col gap-2 tablet:flex-row tablet:items-center tablet:justify-between">
                        <span className="min-w-0 break-words text-sm font-semibold text-white">
                            {percentage.toFixed(0)}% {t('savingsGoals.card.complete')}
                        </span>
                        <span className="min-w-0 break-words text-sm text-white/60">
                            {progressState === 'complete'
                                ? t('savingsGoals.card.goalMet')
                                : t('savingsGoals.card.remaining', { amount: formatCurrency(remaining) })}
                        </span>
                    </div>
                </div>

                {/* ── Row 5: action buttons ── */}
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
