'use client'

import { Send, Wallet, Crown, ArrowRight, type LucideIcon } from 'lucide-react'

const roles = [
  {
    icon: Send,
    name: 'Sender',
    summary: 'Starts transfers, funds household needs, and tracks outgoing activity.',
    bestFor: 'Adults who send or approve payments',
    permissions: [
      'Create transfers and fund shared expenses',
      'Review utilization before new remittances go out',
      'Coordinate with recipients without changing global settings',
    ],
    accent: 'border-sky-500/30 bg-sky-500/[0.12] text-sky-300',
    dot: 'bg-sky-300',
  },
  {
    icon: Wallet,
    name: 'Recipient',
    summary: 'Receives money and spends within a defined monthly limit.',
    bestFor: 'Dependents or members with managed allowances',
    permissions: [
      'Receive wallet funds with contract guardrails',
      'Stay within a clearly visible spending ceiling',
      'Avoid admin complexity for routine usage',
    ],
    accent: 'border-emerald-500/30 bg-emerald-500/[0.12] text-emerald-300',
    dot: 'bg-emerald-300',
  },
  {
    icon: Crown,
    name: 'Admin',
    summary: 'Manages permissions, spending policies, and family-wide settings.',
    bestFor: 'Trusted owners coordinating the whole wallet',
    permissions: [
      'Update roles and member-level spending limits',
      'Review exceptions, edge cases, and account health',
      'Handle contract setup and governance tasks',
    ],
    accent: 'border-amber-500/30 bg-amber-500/[0.12] text-amber-200',
    dot: 'bg-amber-200',
  },
]

export default function UnderstandingRolesSection() {
  return (
    <section className="rounded-3xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,18,0.96),rgba(10,10,10,0.96))] p-6 sm:p-8">
      <div className="border-b border-white/[0.08] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300">
          Role guide
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          Understanding Roles
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
          Match each member to the narrowest permission set that supports their
          task. This keeps the most important decisions visible without making
          the section feel like policy text.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
        {roles.map(
          ({
            icon: Icon,
            name,
            summary,
            bestFor,
            permissions,
            accent,
            dot,
          }: {
            icon: LucideIcon
            name: string
            summary: string
            bestFor: string
            permissions: string[]
            accent: string
            dot: string
          }) => (
            <article
              key={name}
              className="rounded-2xl border border-white/[0.08] bg-black/20 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${accent}`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{name}</h3>
                    <p className="text-sm text-gray-400">{bestFor}</p>
                  </div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-500" />
              </div>

              <p className="mt-4 text-sm leading-6 text-gray-300">{summary}</p>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Core permissions
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
                  {permissions.map((permission) => (
                    <li key={permission} className="flex gap-3">
                      <span
                        className={`mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full ${dot}`}
                        aria-hidden
                      />
                      <span>{permission}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          )
        )}
      </div>

      <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-950/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-200">
          Assignment tip
        </p>
        <p className="mt-2 text-sm leading-6 text-red-50">
          Default to <span className="font-semibold text-white">Recipient</span>{' '}
          for spend-only access, use{' '}
          <span className="font-semibold text-white">Sender</span> for members
          who initiate transfers, and keep{' '}
          <span className="font-semibold text-white">Admin</span> limited to
          the smallest trusted group.
        </p>
      </div>
    </section>
  )
}
