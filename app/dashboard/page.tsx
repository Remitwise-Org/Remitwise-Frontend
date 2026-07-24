'use client';

import { useState } from 'react';
import { Send, PiggyBank, FileText, Shield } from 'lucide-react';

import StatCard from '@/components/Dashboard/StatCard';
import { DashboardLoadingSkeleton } from '@/components/ui/LoadingSkeletons';
import WidgetErrorState from '@/components/ui/WidgetErrorState';
import { StaleBanner } from '@/components/ui/StaleBanner';
import { useStaleFetch } from '@/lib/hooks/useStaleFetch';
import { useClientTranslator } from '@/lib/i18n/client';
import { formatCurrency } from '@/lib/utils/format-currency';
import type { DashboardResponse } from '@/lib/types/dashboard';

export default function DashboardPage() {
  const { t, locale } = useClientTranslator();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const { state, data, isStale, staleAt, load } = useStaleFetch<DashboardResponse>({
    url: '/api/dashboard',
    cacheKey: 'dashboard-data',
  });

  if (state === 'loading') {
    return <DashboardLoadingSkeleton />;
  }

  if (state === 'error' || !data) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-white/10 bg-black/40 p-6">
          <WidgetErrorState
            message={t(
              'dashboard.loadError',
              "We couldn't load your dashboard summary."
            )}
            onRetry={load}
          />
        </div>
      </div>
    );
  }

  const dash = t('dashboard.unavailable', '—');
  const money = (amount: number) => formatCurrency(amount, 'USD', locale);

  const { remittance, savings, bills, insurance } = data;

  const totalSentValue =
    remittance.status === 'ok' ? money(remittance.totalSent) : dash;
  const transfersDetail =
    remittance.status === 'ok'
      ? t('dashboard.transfers', {
          count: remittance.recentTransactions.length,
        })
      : undefined;

  const savingsValue =
    savings.status === 'ok' ? money(savings.savingsTotal) : dash;
  const goalsDetail =
    savings.status === 'ok'
      ? t('dashboard.goals', { count: savings.recentGoals.length })
      : undefined;

  const billsValue = bills.status === 'ok' ? money(bills.billsPaidAmount) : dash;
  const billsDetail =
    bills.status === 'ok'
      ? t('dashboard.billsCount', { count: bills.billsPaidCount })
      : undefined;

  const insuranceValue =
    insurance.status === 'ok' ? money(insurance.insurancePremium) : dash;
  const policiesDetail =
    insurance.status === 'ok'
      ? t('dashboard.policies', { count: insurance.insurancePoliciesCount })
      : undefined;

  return (
    <div className="p-6 space-y-6">
      {isStale && !bannerDismissed && (
        <StaleBanner
          staleAt={staleAt}
          onRefresh={() => {
            setBannerDismissed(false);
            load();
          }}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={t('dashboard.totalSent')}
          value={totalSentValue}
          icon={<Send className="w-5 h-5" />}
          detail2={transfersDetail}
        />
        <StatCard
          title={t('dashboard.savings')}
          value={savingsValue}
          icon={<PiggyBank className="w-5 h-5" />}
          detail2={goalsDetail}
        />
        <StatCard
          title={t('dashboard.billsPaid')}
          value={billsValue}
          icon={<FileText className="w-5 h-5" />}
          detail2={billsDetail}
        />
        <StatCard
          title={t('dashboard.insurance')}
          value={insuranceValue}
          icon={<Shield className="w-5 h-5" />}
          detail2={policiesDetail}
        />
      </div>
    </div>
  );
}
