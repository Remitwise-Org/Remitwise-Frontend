'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, DollarSign, ShieldAlert, X, Zap } from 'lucide-react'
import {
  EMERGENCY_TRANSFER_ACKNOWLEDGEMENT,
  EMERGENCY_TRANSFER_BADGE,
  EMERGENCY_TRANSFER_DESCRIPTION,
  EMERGENCY_TRANSFER_FEE_PERCENT,
  EMERGENCY_TRANSFER_IMPACTS,
  EMERGENCY_TRANSFER_TITLE,
  EMERGENCY_TRANSFER_WARNING,
} from './emergencyTransferContent'

interface EmergencyTransferModalProps {
  open: boolean
  onClose: () => void
  recipientAddress?: string
}

export default function EmergencyTransferModal({
  open,
  onClose,
  recipientAddress = '',
}: EmergencyTransferModalProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [amount, setAmount] = useState('')

  useEffect(() => {
    if (!open) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [open, onClose])

  useEffect(() => {
    if (open) return

    setConfirmed(false)
    setAmount('')
  }, [open])

  if (!open) return null

  const numericAmount = Number(amount) || 0
  const priorityFee = numericAmount * (EMERGENCY_TRANSFER_FEE_PERCENT / 100)
  const total = numericAmount + priorityFee
  const isAmountValid = numericAmount >= 1

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 p-4 backdrop-blur-sm sm:p-6"
      onClick={onClose}
    >
      <div className="mx-auto flex min-h-full max-w-4xl items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="emergency-transfer-title"
          aria-describedby="emergency-transfer-description"
          className="w-full rounded-[28px] border border-red-500/20 bg-[linear-gradient(180deg,rgba(25,10,10,0.98),rgba(10,10,10,0.98))] shadow-[0_32px_120px_rgba(0,0,0,0.55)]"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between border-b border-white/[0.08] px-5 py-5 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="emergency-transfer-title"
                    className="text-xl font-semibold capitalize text-white sm:text-2xl"
                  >
                    {EMERGENCY_TRANSFER_TITLE}
                  </h2>
                  <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-red-100">
                    {EMERGENCY_TRANSFER_BADGE}
                  </span>
                </div>
                <p
                  id="emergency-transfer-description"
                  className="mt-2 max-w-2xl text-sm leading-6 text-gray-300"
                >
                  {EMERGENCY_TRANSFER_DESCRIPTION}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-gray-300 transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010]"
              aria-label="Close emergency transfer modal"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-red-500/20 bg-red-950/20 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-300" />
                  <p className="text-sm leading-6 text-red-50/90">
                    {EMERGENCY_TRANSFER_WARNING}
                  </p>
                </div>
              </div>

              <div className="grid gap-6 rounded-3xl border border-white/[0.08] bg-black/20 p-5 sm:grid-cols-2 sm:p-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Recipient
                  </label>
                  <input
                    type="text"
                    disabled
                    value={recipientAddress || 'Add a recipient on the send page'}
                    className="w-full rounded-2xl border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-gray-300"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Amount (USDC)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="250.00"
                      min="0"
                      step="0.01"
                      className="w-full rounded-2xl border border-white/10 bg-[#1a1a1a] py-3 pl-4 pr-16 text-white placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-red-500"
                    />
                    <span className="pointer-events-none absolute right-4 top-3 text-sm font-medium text-gray-400">
                      USDC
                    </span>
                  </div>
                  {!isAmountValid && amount !== '' ? (
                    <p className="mt-2 text-sm text-red-200">
                      Enter at least 1.00 USDC to continue.
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">
                      The priority fee is calculated from the amount you enter.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                {EMERGENCY_TRANSFER_IMPACTS.map((impact) => (
                  <div
                    key={impact.label}
                    className="rounded-2xl border border-white/[0.08] bg-black/20 p-4"
                  >
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-gray-500">
                      {impact.label}
                    </p>
                    <p className="mt-2 text-sm font-medium leading-6 text-white">
                      {impact.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="rounded-3xl border border-white/[0.08] bg-black/20 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-300">Transfer summary</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Keep fees and total in the same reading zone as the confirm action.
                    </p>
                  </div>
                  <DollarSign className="h-5 w-5 text-red-300" />
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center justify-between text-gray-300">
                    <span>Transfer amount</span>
                    <span className="font-semibold text-white">
                      {numericAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      USDC
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-gray-300">
                    <span>Priority fee</span>
                    <span className="font-semibold text-red-100">
                      +{priorityFee.toFixed(2)} USDC
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/[0.08] pt-3">
                    <span className="text-sm font-medium text-gray-300">Total</span>
                    <span className="text-2xl font-semibold text-white">
                      {total.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      USDC
                    </span>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-sm text-gray-300">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-500 bg-[#1a1a1a] text-red-600 focus:ring-red-500"
                />
                <span className="leading-6">
                  {EMERGENCY_TRANSFER_ACKNOWLEDGEMENT}
                </span>
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-2xl border border-white/10 bg-[#161616] px-6 py-3 font-semibold text-white transition hover:bg-[#202020] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!confirmed || !isAmountValid}
                  className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-red-600 to-red-700 px-6 py-3 font-semibold text-white transition hover:from-red-500 hover:to-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue with emergency transfer
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <aside className="space-y-6">
              <div className="rounded-3xl border border-white/[0.08] bg-black/20 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 flex-shrink-0 place-items-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-100">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium uppercase tracking-[0.18em] text-gray-500">
                      Review checklist
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-white">
                      Confirm before bypassing splits
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-gray-300">
                      Emergency transfers should feel deliberate. Keep the fee,
                      the skipped split behavior, and the entered total visible
                      before the user proceeds.
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                    <p className="text-sm font-medium text-white">Recipient ready</p>
                    <p className="mt-1 text-sm leading-6 text-gray-400">
                      Double-check the wallet before using the fastest route.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                    <p className="text-sm font-medium text-white">Fee understood</p>
                    <p className="mt-1 text-sm leading-6 text-gray-400">
                      The added fee scales with the entered amount.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                    <p className="text-sm font-medium text-white">Split rules skipped</p>
                    <p className="mt-1 text-sm leading-6 text-gray-400">
                      This send will not use the user&apos;s automatic allocation rules.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
