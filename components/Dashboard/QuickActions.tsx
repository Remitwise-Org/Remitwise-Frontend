'use client';

import { useClientTranslator } from '@/lib/i18n/client';

export default function QuickActions() {
  const { t } = useClientTranslator();

  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="grid grid-cols-1 gap-3 375:grid-cols-2 sm:flex sm:flex-wrap">
        <button className="relative flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-red-700 sm:w-auto">
          <span className="min-w-0 break-words">{t('quickActions.emergencyTransfer')}</span>
          <span className="bg-white text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
            {t('quickActions.urgentBadge')}
          </span>
        </button>
        <button className="min-h-11 min-w-0 rounded-lg bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 break-words">
          {t('quickActions.send')}
        </button>
        <button className="min-h-11 min-w-0 rounded-lg bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 break-words">
          {t('quickActions.goals')}
        </button>
        <button className="min-h-11 min-w-0 rounded-lg bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 break-words">
          {t('quickActions.bills')}
        </button>
      </div>
    </div>
  );
}
