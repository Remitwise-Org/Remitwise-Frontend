'use client';

import Link from 'next/link';
import { useClientTranslator } from '@/lib/i18n/client';

type Action = {
  key: string;
  href: string;
  variant: 'primary' | 'secondary';
  priority: 'high' | 'normal';
};

const actions: Action[] = [
  { key: 'emergencyTransfer', href: '/emergency-transfer', variant: 'primary', priority: 'high' },
  { key: 'send', href: '/send', variant: 'secondary', priority: 'normal' },
  { key: 'split', href: '/split', variant: 'secondary', priority: 'normal' },
  { key: 'family', href: '/family', variant: 'secondary', priority: 'normal' },
  { key: 'goals', href: '/dashboard/goals', variant: 'secondary', priority: 'normal' },
  { key: 'bills', href: '/bills', variant: 'secondary', priority: 'normal' },
];

export default function QuickActions() {
  const { t } = useClientTranslator();

  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="grid grid-cols-1 gap-3 375:grid-cols-2 sm:flex sm:flex-wrap">
        {actions.map((action) => (
          <Link
            key={action.key}
            href={action.href}
            className={
              action.variant === 'primary'
                ? 'relative flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-red-700 sm:w-auto'
                : 'min-h-11 min-w-0 rounded-lg bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 break-words'
            }
            aria-label={t(`quickActions.${action.key}`)}
          >
            <span className="min-w-0 break-words">{t(`quickActions.${action.key}`)}</span>
            {action.priority === 'high' && (
              <span className="bg-white text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                {t('quickActions.urgentBadge')}
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
