'use client'

import { useState } from 'react'
import {
  ArrowRight,
  Clock3,
  DollarSign,
  Layers3,
  ShieldCheck,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import AsyncOperationsPanel from '@/components/AsyncOperationsPanel'
import AsyncSubmissionStatus from '@/components/AsyncSubmissionStatus'

interface EmergencyTransferModalProps {
  isOpen: boolean
  onClose: () => void
}

const emergencyStages = [
  {
    label: 'Review transfer inputs',
    duration: '0-2 sec',
    detail:
      'Surface fees, speed, and recipient details in the same view before an emergency contract request is built.',
    placement: 'Inline in the modal body',
    icon: ShieldCheck,
  },
  {
    label: 'Build emergency payload',
    duration: '2-5 sec',
    detail:
      'Show the contract-build state close to the confirm action so the user knows the request is still being prepared.',
    placement: 'Above the modal footer',
    icon: Layers3,
  },
  {
    label: 'Collect wallet signature',
    duration: '15-45 sec',
    detail:
      'Escalate only when the payload is ready and keep the amount summary visible while the wallet prompt is open.',
    placement: 'Wallet sheet or modal',
    icon: Wallet,
  },
  {
    label: 'Submit and confirm',
    duration: '5-30 sec',
    detail:
      'Once the modal closes, confirmation should move into the global stack so the user can continue sending flows without losing context.',
    placement: 'Top-right desktop, inline mobile',
    icon: Clock3,
  },
]

const emergencyQueue = [
  {
    title: 'Emergency transfer submission',
    duration: 'Live',
    detail:
      'The active transfer keeps the strongest visual treatment and remains pinned while waiting on network confirmation.',
    status: 'active' as const,
  },
  {
    title: 'Wallet approval waiting',
    duration: 'Queued',
    detail:
      'If another transfer is in flight, collapse it into a smaller stacked card instead of replacing the active item.',
    status: 'queued' as const,
  },
  {
    title: 'Transfer confirmed',
    duration: '< 1 min',
    detail:
      'Leave the final state visible briefly so users can trust the result before moving on.',
    status: 'complete' as const,
  },
]

export default function EmergencyTransferModal({
  isOpen,
  onClose,
}: EmergencyTransferModalProps) {
  const [confirmed, setConfirmed] = useState(false)
  const [amount, setAmount] = useState('')
  const [speed, setSpeed] = useState<'emergency' | 'regular'>('emergency')

  if (!isOpen) return null

  const numericAmount = Number(amount) || 0
  const priorityFee = speed === 'emergency' ? 2 : 0
  const total = numericAmount + priorityFee

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:p-6">
      <div className="mx-auto flex min-h-full max-w-6xl items-center justify-center">
        <div className="w-full rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))] shadow-[0_32px_120px_rgba(0,0,0,0.55)] overflow-hidden">
          <div className="flex items-start justify-between border-b border-white/[0.08] px-5 py-5 sm:px-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-300">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-white sm:text-2xl">
                    Emergency Transfer
                  </h2>
                  <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-red-100">
                    Priority flow
                  </span>
                </div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
                  Funds arrive in 2–5 minutes. A $2.00 priority fee applies.
                  This transfer cannot be reversed — only use it for urgent situations.
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

          <div className="grid gap-8 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <div className="grid gap-6 rounded-3xl border border-white/[0.08] bg-black/20 p-5 sm:grid-cols-2 sm:p-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-300">
                    Recipient
                  </label>
                  <input
                    type="text"
                    disabled
                    value="GXXXXXXXXXXXXXXXXXXXXXXXX"
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
                      className="w-full rounded-2xl border border-white/10 bg-[#1a1a1a] py-3 pl-4 pr-16 text-white placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-red-500"
                    />
                    <span className="pointer-events-none absolute right-4 top-3 text-sm font-medium text-gray-400">
                      USDC
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setSpeed('emergency')}
                  className={`rounded-3xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] ${
                    speed === 'emergency'
                      ? 'border-red-500/20 bg-red-500/10'
                      : 'border-white/[0.08] bg-black/20'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">Emergency</p>
                  <p className="mt-2 text-2xl font-semibold text-white">2–5 min</p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">
                    Highest priority. +$2.00 fee. Use for urgent household or family needs only.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSpeed('regular')}
                  className={`rounded-3xl border p-5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] ${
                    speed === 'regular'
                      ? 'border-white/15 bg-white/[0.05]'
                      : 'border-white/[0.08] bg-black/20'
                  }`}
                >
                  <p className="text-sm font-semibold text-white">Regular</p>
                  <p className="mt-2 text-2xl font-semibold text-white">30–60 min</p>
                  <p className="mt-2 text-sm leading-6 text-gray-300">
                    Standard processing. No extra fee. Choose this if the transfer is not time-critical.
                  </p>
                </button>
              </div>

              <div className="rounded-3xl border border-white/[0.08] bg-black/20 p-5 sm:p-6">
                <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
                  <div>
                    <p className="text-sm font-medium text-gray-300">Transfer summary</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Review the amount and fee before confirming. These figures are final.
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

              <AsyncSubmissionStatus
                pending={false}
                idleTitle="Ready to submit"
                idleDescription="Check the recipient, amount, and fee above. Once you confirm, the transfer is queued immediately and cannot be cancelled."
                pendingTitle="Preparing emergency transfer"
                pendingDescription="Building the transaction. Your wallet approval will be requested next."
              />

              <label className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-sm text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-500 bg-[#1a1a1a] text-red-600 focus:ring-red-500"
                />
                <span className="leading-6">
                  I confirm this is an urgent transfer. I understand the $2.00 priority
                  fee will be charged and this transaction cannot be reversed once submitted.
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
                  disabled={!confirmed || numericAmount <= 0}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-red-600 to-red-700 px-6 py-3 font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#101010] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Review Transfer
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <aside className="space-y-6">
              <AsyncOperationsPanel
                eyebrow="Async behavior"
                title="Emergency Submission Pattern"
                description="Urgent transfers carry the highest stakes in the product. Each stage below shows what the user sees and how long to expect it to take."
                stages={emergencyStages}
                queueTitle="Stack behavior"
                queueDescription="The modal owns the review and build stages. After wallet signature, progress moves into the global stack so it stays visible if the user navigates away."
                queueItems={emergencyQueue}
              />
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
