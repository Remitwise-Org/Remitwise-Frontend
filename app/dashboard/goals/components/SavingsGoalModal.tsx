'use client'

import React, { useState, useEffect, useRef } from 'react'
import { 
  X, 
  GraduationCap, 
  HeartPulse, 
  Home, 
  Plane,
  AlertCircle
} from 'lucide-react'
import { SavingsGoal, SavingsGoalFormData } from '../types'
import { 
  validateGoalName, 
  validateGoalDescription,
  validateAmount, 
  validateFutureDate 
} from '@/lib/validation/savings-goals'
import { useClientTranslator } from '@/lib/i18n/client'

interface SavingsGoalModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (goalData: Partial<SavingsGoal>) => void
  editingGoal: SavingsGoal | null
}

const ICONS = [
  { type: 'education', icon: <GraduationCap className="w-6 h-6" />, gradient: { from: '#DC2626', to: '#B91C1C' } },
  { type: 'medical', icon: <HeartPulse className="w-6 h-6" />, gradient: { from: '#F87171', to: '#EF4444' } },
  { type: 'home', icon: <Home className="w-6 h-6" />, gradient: { from: '#DC2626', to: '#B91C1C' } },
  { type: 'vacation', icon: <Plane className="w-6 h-6" />, gradient: { from: '#F87171', to: '#EF4444' } },
] as const

export default function SavingsGoalModal({
  isOpen,
  onClose,
  onSave,
  editingGoal,
}: SavingsGoalModalProps) {
  const { t } = useClientTranslator()
  const [formData, setFormData] = useState<SavingsGoalFormData>({
    title: '',
    description: '',
    targetAmount: 0,
    targetDate: '',
    iconType: 'education',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editingGoal) {
      // Find iconType from icon or title if possible, else default
      let iconType: SavingsGoalFormData['iconType'] = 'education'
      if (editingGoal.title.toLowerCase().includes('medical') || editingGoal.title.toLowerCase().includes('health')) iconType = 'medical'
      else if (editingGoal.title.toLowerCase().includes('home') || editingGoal.title.toLowerCase().includes('house')) iconType = 'home'
      else if (editingGoal.title.toLowerCase().includes('vacation') || editingGoal.title.toLowerCase().includes('trip')) iconType = 'vacation'

      setFormData({
        title: editingGoal.title,
        description: editingGoal.description,
        targetAmount: editingGoal.targetAmount,
        targetDate: editingGoal.targetDate,
        iconType,
      })
    } else {
      setFormData({
        title: '',
        description: '',
        targetAmount: 0,
        targetDate: '',
        iconType: 'education',
      })
    }
    setErrors({})
  }, [editingGoal, isOpen])

  // Focus trap and ESC key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (!focusableElements) return
        
        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus()
            e.preventDefault()
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus()
            e.preventDefault()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    
    const titleVal = validateGoalName(formData.title)
    if (!titleVal.isValid) newErrors.title = titleVal.error ? t(`errors.${titleVal.error}`) : t('errors.invalid_name')

    const descVal = validateGoalDescription(formData.description)
    if (!descVal.isValid) newErrors.description = descVal.error ? t(`errors.${descVal.error}`) : t('errors.goal_description_invalid')
    
    const amountVal = validateAmount(formData.targetAmount)
    if (!amountVal.isValid) newErrors.targetAmount = amountVal.error ? t(`errors.${amountVal.error}`) : t('errors.invalid_amount')
    
    const dateVal = validateFutureDate(formData.targetDate)
    if (!dateVal.isValid) newErrors.targetDate = dateVal.error ? t(`errors.${dateVal.error}`) : t('errors.goal_invalid_date')
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      const selectedIcon = ICONS.find(i => i.type === formData.iconType) || ICONS[0]
      onSave({
        title: formData.title,
        description: formData.description,
        targetAmount: formData.targetAmount,
        targetDate: formData.targetDate,
        icon: selectedIcon.icon,
        iconGradient: selectedIcon.gradient,
      })
    }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm motion-reduce:backdrop-blur-none"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="rounded-2xl p-6 375:p-8 max-w-lg w-full mx-4 shadow-2xl relative motion-safe:animate-slide-in-bottom motion-reduce:animate-none"
        style={{
          background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <button
          onClick={onClose}
          className="touch-target absolute right-4 top-4 flex items-center justify-center p-2 text-white/50 hover:text-white transition-colors motion-reduce:transition-none"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 id="modal-title" className="text-xl 375:text-2xl font-bold text-white mb-6">
          {editingGoal ? t('savingsGoals.modal.editTitle') : t('savingsGoals.modal.createTitle')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Goal Title */}
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium text-white/70">
              {t('savingsGoals.modal.titleLabel')}
            </label>
            <input
              id="title"
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full rounded-xl bg-white/5 border ${errors.title ? 'border-red-500' : 'border-white/10'} px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all motion-reduce:transition-none`}
              placeholder={t('savingsGoals.modal.titlePlaceholder')}
              autoFocus
            />
            {errors.title && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-white/70">
              {t('savingsGoals.modal.descriptionLabel')}
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className={`w-full rounded-xl bg-white/5 border ${errors.description ? 'border-red-500' : 'border-white/10'} px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all motion-reduce:transition-none resize-none h-20`}
              placeholder={t('savingsGoals.modal.descriptionPlaceholder')}
            />
            {errors.description && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Target Amount */}
            <div className="space-y-2">
              <label htmlFor="targetAmount" className="text-sm font-medium text-white/70">
                {t('savingsGoals.modal.amountLabel')}
              </label>
              <input
                id="targetAmount"
                type="number"
                value={formData.targetAmount || ''}
                onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })}
                className={`w-full rounded-xl bg-white/5 border ${errors.targetAmount ? 'border-red-500' : 'border-white/10'} px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all motion-reduce:transition-none`}
                placeholder="0.00"
                step="0.01"
              />
              {errors.targetAmount && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.targetAmount}
                </p>
              )}
            </div>

            {/* Target Date */}
            <div className="space-y-2">
              <label htmlFor="targetDate" className="text-sm font-medium text-white/70">
                {t('savingsGoals.modal.dateLabel')}
              </label>
              <input
                id="targetDate"
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                className={`w-full rounded-xl bg-white/5 border ${errors.targetDate ? 'border-red-500' : 'border-white/10'} px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 transition-all motion-reduce:transition-none`}
              />
              {errors.targetDate && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {errors.targetDate}
                </p>
              )}
            </div>
          </div>

          {/* Icon Selector */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-white/70">{t('savingsGoals.modal.iconLabel')}</label>
            <div className="flex gap-4">
              {ICONS.map((iconOption) => (
                <button
                  key={iconOption.type}
                  type="button"
                  onClick={() => setFormData({ ...formData, iconType: iconOption.type })}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all motion-reduce:transition-none ${
                    formData.iconType === iconOption.type 
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0A0A0A] scale-110 motion-reduce:scale-100' 
                      : 'opacity-50 hover:opacity-100'
                  }`}
                  style={{
                    background: `linear-gradient(180deg, ${iconOption.gradient.from} 0%, ${iconOption.gradient.to} 100%)`,
                  }}
                >
                  <div className="text-white">{iconOption.icon}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="touch-target-wide w-full rounded-xl py-4 text-base font-bold text-white shadow-lg transition-all motion-reduce:transition-none hover:brightness-110 active:scale-[0.98] motion-reduce:active:scale-100"
              style={{
                background: 'linear-gradient(180deg, #DC2626 0%, #B91C1C 100%)',
              }}
            >
              {editingGoal ? t('savingsGoals.editGoal') : t('savingsGoals.createGoal')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
