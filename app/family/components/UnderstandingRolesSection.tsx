'use client'

import { useClientTranslator } from '@/lib/i18n/client'
import { Send, Wallet, Crown, ArrowRight, type LucideIcon } from 'lucide-react'

const roles = [
  {
    icon: Send,
    nameKey: 'understanding_roles.sender.name',
    summaryKey: 'understanding_roles.sender.summary',
    bestForKey: 'understanding_roles.sender.best_for',
    permissionsKeys: [
      'understanding_roles.sender.permission_1',
      'understanding_roles.sender.permission_2',
      'understanding_roles.sender.permission_3',
    ],
    accent: 'border-sky-500/30 bg-sky-500/[0.12] text-sky-300',
    dot: 'bg-sky-300',
  },
  {
    icon: Wallet,
    nameKey: 'understanding_roles.recipient.name',
    summaryKey: 'understanding_roles.recipient.summary',
    bestForKey: 'understanding_roles.recipient.best_for',
    permissionsKeys: [
      'understanding_roles.recipient.permission_1',
      'understanding_roles.recipient.permission_2',
      'understanding_roles.recipient.permission_3',
    ],
    accent: 'border-emerald-500/30 bg-emerald-500/[0.12] text-emerald-300',
    dot: 'bg-emerald-300',
  },
  {
    icon: Crown,
    nameKey: 'understanding_roles.admin.name',
    summaryKey: 'understanding_roles.admin.summary',
    bestForKey: 'understanding_roles.admin.best_for',
    permissionsKeys: [
      'understanding_roles.admin.permission_1',
      'understanding_roles.admin.permission_2',
      'understanding_roles.admin.permission_3',
    ],
    accent: 'border-amber-500/30 bg-amber-500/[0.12] text-amber-200',
    dot: 'bg-amber-200',
  },
]

export default function UnderstandingRolesSection() {
  const { t } = useClientTranslator()

  return (
    <section className="rounded-3xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(18,18,18,0.96),rgba(10,10,10,0.96))] p-6 sm:p-8">
      <div className="border-b border-white/[0.08] pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300">
          {t('understanding_roles.role_guide_label')}
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          {t('understanding_roles.title')}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-300">
          {t('understanding_roles.description')}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
        {roles.map(
          ({
            icon: Icon,
            nameKey,
            summaryKey,
            bestForKey,
            permissionsKeys,
            accent,
            dot,
          }: {
            icon: LucideIcon
            nameKey: string
            summaryKey: string
            bestForKey: string
            permissionsKeys: string[]
            accent: string
            dot: string
          }) => (
            <article
              key={nameKey}
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
                    <h3 className="text-lg font-semibold text-white">
                      {t(nameKey)}
                    </h3>
                    <p className="text-sm text-gray-400">{t(bestForKey)}</p>
                  </div>
                </div>
                <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-gray-500" />
              </div>

              <p className="mt-4 text-sm leading-6 text-gray-300">
                {t(summaryKey)}
              </p>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  {t('understanding_roles.core_permissions_label')}
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-300">
                  {permissionsKeys.map((permissionKey) => (
                    <li key={permissionKey} className="flex gap-3">
                      <span
                        className={`mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full ${dot}`}
                        aria-hidden
                      />
                      <span>{t(permissionKey)}</span>
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
          {t('understanding_roles.assignment_tip_label')}
        </p>
        <p className="mt-2 text-sm leading-6 text-red-50">
          {t('understanding_roles.assignment_tip_text', {
            recipient: <span className="font-semibold text-white">{t('understanding_roles.recipient.name')}</span>,
            sender: <span className="font-semibold text-white">{t('understanding_roles.sender.name')}</span>,
            admin: <span className="font-semibold text-white">{t('understanding_roles.admin.name')}</span>,
          })}
        </p>
      </div>
    </section>
  )
}