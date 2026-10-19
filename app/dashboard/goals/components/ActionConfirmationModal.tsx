'use client'

import React from 'react'
import { X, Lock, Unlock, ArrowDownToLine } from 'lucide-react'
import { useFocusTrap } from '@/lib/hooks/useFocusTrap'
import { useClientTranslator } from '@/lib/i18n/client'    

export type ActionType = 'lock' | 'unlock' | 'withdraw'

interface ActionConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  actionType: ActionType
  title: string
  description?: string
  isActionLoading?: boolean
}

export default function ActionConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  title,
  description,
  isActionLoading = false,
}: ActionConfirmationModalProps) {
  const { t } = useClientTranslator()
  const modalRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onEscape: onClose,
  })

  if (!isOpen) return null

  const getActionConfig = () => {
    switch (actionType) {
      case 'lock':
        return {
          icon: <Lock className="w-6 h-6" />,
          gradient: { from: '#3b82f6', to: '#2563eb' },
          confirmLabel: t('savingsGoals.actions.confirmLock') || 'Confirm Lock',
        }
      case 'unlock':
        return {
          icon: <Unlock className="w-6 h-6" />,
          gradient: { from: '#f59e0b', to: '#d97706' },
          confirmLabel: t('savingsGoals.actions.confirmUnlock') || 'Confirm Unlock',
        }
      case 'withdraw':
        return {
          icon: <ArrowDownToLine className="w-6 h-6" />,
          gradient: { from: '#10b981', to: '#059669' },
          confirmLabel: t('savingsGoals.actions.confirmWithdraw') || 'Confirm Withdraw',
        }
      default:
        return {
          icon: <Lock className="w-6 h-6" />,
          gradient: { from: '#6b7280', to: '#4b5563' },
          confirmLabel: 'Confirm',
        }
    }
  }

  const { icon, gradient, confirmLabel } = getActionConfig()

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm motion-reduce:backdrop-blur-none"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="relative mx-4 w-full max-w-sm rounded-2xl p-6 shadow-2xl motion-safe:animate-slide-in-bottom motion-reduce:animate-none 375:p-8"
        style={{
          background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <button
          onClick={onClose}
          className="touch-target absolute right-4 top-4 flex items-center justify-center p-2 text-white/50 transition-colors hover:text-white motion-reduce:transition-none"
          aria-label={t('common.close') || 'Close'}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div
            className="mb-5 flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px]"
            style={{
              background: `linear-gradient(180deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
            }}
            aria-hidden="true"
          >
            <div className="text-white">{icon}</div>
          </div>

          <h2 id="confirm-modal-title" className="mb-2 text-xl font-bold text-white 375:text-2xl">
            {title}
          </h2>

          {description && (
            <p className="mb-8 text-sm text-white/60">
              {description}
            </p>
          )}

          <div className="grid w-full gap-3 tablet:grid-cols-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isActionLoading}
              className="touch-target-wide rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
            >
              {t('common.cancel') || 'Cancel'}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isActionLoading}
              className="touch-target-wide rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              style={{
                background: `linear-gradient(180deg, ${gradient.from} 0%, ${gradient.to} 100%)`,
              }}
            >
              {isActionLoading ? '...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
