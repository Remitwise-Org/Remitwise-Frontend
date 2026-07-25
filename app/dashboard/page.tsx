'use client';

import { useClientTranslator } from '@/lib/i18n/client';

export default function DashboardPage() {
  const { t } = useClientTranslator();

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 min-w-[140px]">
          <p className="text-sm text-slate-500 font-medium truncate">{t('dashboard.totalSent')}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">$1,240.00</p>
        </div>
        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 min-w-[140px]">
          <p className="text-sm text-slate-500 font-medium truncate">{t('dashboard.savings')}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">$450.00</p>
        </div>
        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 min-w-[140px]">
          <p className="text-sm text-slate-500 font-medium truncate">{t('dashboard.billsPaid')}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">$85.00</p>
        </div>
        <div className="p-4 bg-white rounded-xl shadow-sm border border-slate-100 min-w-[140px]">
          <p className="text-sm text-slate-500 font-medium truncate">{t('dashboard.insurance')}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">Active</p>
        </div>
      </div>
    </div>
  );
}
