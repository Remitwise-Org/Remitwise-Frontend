'use client';

import { useState, useEffect } from 'react';
import { Send, PiggyBank, FileText, Shield, RefreshCw, X } from 'lucide-react';
import StatCard from '@/components/Dashboard/StatCard';
import { SkeletonGroup, SkeletonCard } from '@/components/ui/Skeleton';
import { useStaleFetch } from '@/lib/hooks/useStaleFetch';
import type { DashboardResponse } from '@/lib/types/dashboard';

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return amount.toLocaleString(navigator.language, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function relativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Updated ${hrs}h ago`;
  return `Updated ${Math.floor(hrs / 24)}d ago`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatGrid({ data }: { data: DashboardResponse }) {
  const { remittance, savings, bills, insurance } = data;

  const totalSent =
    remittance.status === 'ok' ? formatCurrency(remittance.totalSent) : '—';
  const txCount =
    remittance.status === 'ok'
      ? `${remittance.recentTransactions.length} transfers`
      : undefined;

  const savingsTotal =
    savings.status === 'ok' ? formatCurrency(savings.savingsTotal) : '—';

  const billsAmount =
    bills.status === 'ok' ? formatCurrency(bills.billsPaidAmount) : '—';
  const billsCount =
    bills.status === 'ok' ? `${bills.billsPaidCount} paid` : undefined;

  const premium =
    insurance.status === 'ok' ? formatCurrency(insurance.insurancePremium) : '—';
  const policiesCount =
    insurance.status === 'ok'
      ? `${insurance.insurancePoliciesCount} policies`
      : undefined;

  return (
    <div className="p-6 space-y-6">
      <div className="bg-brand-red/10 border border-brand-red/20 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white mb-1">Complete your setup</h3>
          <p className="text-gray-300 text-sm">You haven&apos;t configured your smart split or first goal yet. Set them up to automate your remittances.</p>
        </div>
        <a 
          href="/onboarding" 
          className="shrink-0 bg-brand-red hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 focus:ring-offset-bg1"
        >
          Continue Onboarding
        </a>
      </div>

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

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { state, data, isStale, load } = useStaleFetch<DashboardResponse>({
    url: '/api/dashboard',
    cacheKey: 'dashboard-data',
  });

  const [staleDismissed, setStaleDismissed] = useStaleDismiss(isStale);

  return (
    <div className="p-6 space-y-4">
      {isStale && !staleDismissed && (
        <StaleBanner
          onDismiss={() => setStaleDismissed(true)}
          onRefresh={load}
        />
      )}

      {state === 'loading' && <LoadingSkeleton />}

      {state === 'error' && <ErrorState onRetry={load} />}

      {(state === 'ready' || state === 'stale') && data && (
        <>
          <StatGrid data={data} />
          {data.meta.cachedAt && (
            <p className="text-xs text-gray-500">{relativeTime(data.meta.cachedAt)}</p>
          )}
        </>
      )}
    </div>
  );
}

// ── Tiny inline hook — avoids adding a new file for a 4-line concern ─────────

function useStaleDismiss(isStale: boolean): [boolean, (v: boolean) => void] {
  const [dismissed, setDismissed] = useState(false);
  // Reset dismiss state whenever fresh stale data arrives
  useEffect(() => {
    if (!isStale) setDismissed(false);
  }, [isStale]);
  return [dismissed, setDismissed];
}
