'use client';

import { useClientTranslator } from '@/lib/i18n/client';

export default function QuickActions() {
  const { t } = useClientTranslator();

  return (
    <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="flex flex-wrap gap-3">
        <button className="relative flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 max-w-full break-words gap-2">
          <span>{t('quickActions.emergencyTransfer')}</span>
          <span className="bg-white text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
            {t('quickActions.urgentBadge')}
          </span>
        </button>
        <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 truncate max-w-[150px]">
          {t('quickActions.send')}
        </button>
        <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 truncate max-w-[150px]">
          {t('quickActions.goals')}
        </button>
        <button className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-50 rounded-lg hover:bg-slate-100 truncate max-w-[150px]">
          {t('quickActions.bills')}
        </button>
      </div>
    </div>
  );
}
