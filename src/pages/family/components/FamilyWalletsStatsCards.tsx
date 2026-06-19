'use client'

import {
  Users,
  DollarSign,
  Activity,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

type FamilyStatsData = {
  familyMembers: number
  totalSpendingLimit: number
  spentThisMonth: number
  averageUtilization: number
  admins: number
}

const defaultStats: FamilyStatsData = {
  familyMembers: 4,
  totalSpendingLimit: 7800,
  spentThisMonth: 1670,
  averageUtilization: 21,
  admins: 1,
}

const iconWrapperClass =
  'flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/25 bg-[#161616] text-red-500'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

export default function FamilyWalletsStatsCards({
  stats = defaultStats,
}: {
  stats?: FamilyStatsData
}) {
  const remainingBudget = stats.totalSpendingLimit - stats.spentThisMonth

  const cards: Array<{
    title: string
    value: string
    supporting: string
    footnote: string
    icon: LucideIcon
    highlighted?: boolean
  }> = [
    {
      title: 'Active members',
      value: `${stats.familyMembers}`,
      supporting: `${stats.admins} admin overseeing permissions`,
      footnote: 'Recipients and senders stay visible at a glance.',
      icon: Users,
    },
    {
      title: 'Monthly spend tracked',
      value: currencyFormatter.format(stats.spentThisMonth),
      supporting: `${currencyFormatter.format(remainingBudget)} remaining budget`,
      footnote: `${currencyFormatter.format(
        stats.totalSpendingLimit
      )} total limit across the wallet`,
      icon: DollarSign,
      highlighted: true,
    },
    {
      title: 'Average utilization',
      value: `${stats.averageUtilization}%`,
      supporting: 'Healthy headroom across member limits',
      footnote: 'Use this to spot which members need limit reviews first.',
      icon: Activity,
    },
    {
      title: 'Coverage',
      value: 'Permissions set',
      supporting: `${stats.familyMembers - stats.admins} managed members`,
      footnote: 'Reserve admin access for the smallest possible group.',
      icon: ShieldCheck,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(
        ({ title, value, supporting, footnote, icon: Icon, highlighted }) => (
          <article
            key={title}
            className={`rounded-3xl border p-5 sm:p-6 ${
              highlighted
                ? 'border-red-500/25 bg-[linear-gradient(180deg,rgba(127,29,29,0.32),rgba(15,15,15,0.96))] shadow-[0_16px_48px_rgba(127,29,29,0.24)]'
                : 'border-white/[0.08] bg-[linear-gradient(180deg,rgba(20,20,20,0.96),rgba(12,12,12,0.96))]'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className={iconWrapperClass}>
                <Icon className="h-5 w-5" strokeWidth={1.5} />
              </div>
              <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-gray-400">
                Snapshot
              </span>
            </div>

            <div className="mt-5 space-y-2">
              <p className="text-sm font-medium text-gray-300">{title}</p>
              <p className="text-3xl font-semibold tracking-tight text-white">
                {value}
              </p>
              <p
                className={`text-sm ${
                  highlighted ? 'text-red-100' : 'text-gray-300'
                }`}
              >
                {supporting}
              </p>
            </div>

            <p className="mt-5 border-t border-white/[0.08] pt-4 text-sm leading-6 text-gray-400">
              {footnote}
            </p>
          </article>
        )
      )}
    </div>
  )
}
