'use client';

import { useCallback, useEffect, useState } from 'react';
import { Send, PiggyBank, FileText, Shield } from 'lucide-react';

import StatCard from '@/components/Dashboard/StatCard';
import { DashboardLoadingSkeleton } from '@/components/ui/LoadingSkeletons';
import WidgetErrorState from '@/components/ui/WidgetErrorState';
import { apiClient } from '@/lib/client/apiClient';
import { runWidgetFetchWithRetry } from '@/lib/client/widgetFetchRetry';
import { useClientTranslator } from '@/lib/i18n/client';
import { formatCurrency } from '@/lib/utils/format-currency';
import type { DashboardResponse } from '@/lib/types/dashboard';

type LoadState = 'loading' | 'error' | 'ready';

export default function DashboardPage() {
  const { t, locale } = useClientTranslator();
  const [state, setState] = useState<LoadState>('loading');
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // The /api/dashboard route derives the wallet address from the session, so we
  // never have to pass it from the client. apiClient adds the shared
  // 401 -> refresh -> retry-once behaviour on top of fetch.
  const load = useCallback((signal?: AbortSignal) => {
    return runWidgetFetchWithRetry({
      signal,
      load: async () => {
        const res = await apiClient.get('/api/dashboard', { signal });
        if (!res || !res.ok) {
          throw new Error('Unable to load dashboard summary.');
        }

        return (await res.json()) as DashboardResponse;
      },
    });
  }, []);

  const handleRetry = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    setState('loading');
    void load(controller.signal)
      .then((json) => {
        if (controller.signal.aborted) {
          return;
        }

        setData(json);
        setState('ready');
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }

        setState('error');
      });

    return () => controller.abort();
  }, [load, reloadKey]);

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
            onRetry={handleRetry}
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
