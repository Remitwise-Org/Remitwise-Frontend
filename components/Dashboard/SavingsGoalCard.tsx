'use client'

import { ReactNode } from 'react'
import { Calendar, Clock } from 'lucide-react'

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
    onDetails?: () => void
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount)
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
    onDetails,
}: SavingsGoalCardProps) {
    const percentage = Math.min((currentAmount / targetAmount) * 100, 100)
    const remaining = targetAmount - currentAmount

    return (
        <div
            className="relative box-border rounded-2xl p-6 overflow-hidden"
            style={{
                background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
            }}
        >
            {/* Red glow effect */}
            <div
                className="absolute w-32 h-32 right-0 top-0"
                style={{
                    background: 'rgba(220, 38, 38, 0.05)',
                    filter: 'blur(64px)',
                    borderRadius: '50%',
                }}
            />

            {/* Content */}
            <div className="relative z-10 flex flex-col gap-4">
                {/* Icon */}
                <div
                    className="w-12 h-12 rounded-[14px] flex items-center justify-center"
                    style={{
                        background: `linear-gradient(180deg, ${iconGradient.from} 0%, ${iconGradient.to} 100%)`,
                    }}
                >
                    <div className="w-6 h-6 text-white">{icon}</div>
                </div>

                {/* Title and Description */}
                <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-bold text-white tracking-tight">
                        {title}
                    </h3>
                    <p
                        className="text-sm tracking-tight"
                        style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                    >
                        {description}
                    </p>
                </div>

                {/* Amount and Progress */}
                <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between">
                        <span className="text-2xl font-bold text-white tracking-wide">
                            {formatCurrency(currentAmount)}
                        </span>
                        <span
                            className="text-sm tracking-tight"
                            style={{ color: 'rgba(255, 255, 255, 0.4)' }}
                        >
                            of {formatCurrency(targetAmount)}
                        </span>
                    </div>

                    {/* Progress Bar */}
                    <div
                        className="w-full h-2.5 rounded-full"
                        style={{ background: 'rgba(255, 255, 255, 0.05)' }}
                    >
                        <div
                            className="h-2.5 rounded-full transition-all duration-300"
                            style={{
                                width: `${percentage}%`,
                                background: `linear-gradient(180deg, ${iconGradient.from} 0%, ${iconGradient.to} 100%)`,
                            }}
                        />
                    </div>

                    {/* Progress Stats */}
                    <div className="flex items-center justify-between">
                        <span
                            className="text-xs font-semibold"
                            style={{ color: 'rgba(255, 255, 255, 0.7)' }}
                        >
                            {percentage.toFixed(1)}% Complete
                        </span>
                        <span
                            className="text-xs"
                            style={{ color: 'rgba(255, 255, 255, 0.4)' }}
                        >
                            {formatCurrency(remaining)} remaining
                        </span>
                    </div>
                </div>

                {/* Target Date Box */}
                <div
                    className="flex items-center justify-between px-3 py-3 rounded-[10px]"
                    style={{
                        background: isOverdue
                            ? 'rgba(220, 38, 38, 0.2)'
                            : 'rgba(255, 255, 255, 0.05)',
                        border: isOverdue
                            ? '1px solid rgba(220, 38, 38, 0.3)'
                            : '1px solid rgba(255, 255, 255, 0.08)',
                    }}
                >
                    <div className="flex items-center gap-2">
                        <Calendar
                            className="w-4 h-4"
                            style={{ color: isOverdue ? '#DC2626' : 'rgba(255, 255, 255, 0.4)' }}
                        />
                        <div className="flex flex-col">
                            <span
                                className="text-xs"
                                style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                            >
                                Target Date
                            </span>
                            <span className="text-sm font-semibold text-white tracking-tight">
                                {targetDate}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock
                            className="w-3 h-3"
                            style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                        />
                        <span
                            className="text-xs"
                            style={{ color: 'rgba(255, 255, 255, 0.5)' }}
                        >
                            {isOverdue ? 'Overdue' : daysLeft !== undefined ? `${daysLeft}d left` : ''}
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onAddFunds}
                        className="flex-1 h-[42px] rounded-[14px] text-sm font-semibold text-white"
                        style={{
                            background: 'linear-gradient(180deg, #DC2626 0%, #B91C1C 100%)',
                            boxShadow:
                                '0px 10px 15px -3px rgba(220, 38, 38, 0.2), 0px 4px 6px -4px rgba(220, 38, 38, 0.2)',
                        }}
                    >
                        Add Funds
                    </button>
                    <button
                        type="button"
                        onClick={onDetails}
                        className="w-[80px] h-[42px] rounded-[14px] text-sm font-semibold text-white"
                        style={{
                            background:
                                'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                        }}
                    >
                        Details
                    </button>
                </div>
            </div>
        </div>
    )
}
