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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Sent"
        value={totalSent}
        icon={<Send className="w-5 h-5" />}
        detail2={txCount}
      />
      <StatCard
        title="Savings"
        value={savingsTotal}
        icon={<PiggyBank className="w-5 h-5" />}
      />
      <StatCard
        title="Bills Paid"
        value={billsAmount}
        icon={<FileText className="w-5 h-5" />}
        detail2={billsCount}
      />
      <StatCard
        title="Insurance"
        value={premium}
        icon={<Shield className="w-5 h-5" />}
        detail2={policiesCount}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <SkeletonGroup
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      label="Loading dashboard"
    >
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} variant="stat" />
      ))}
    </SkeletonGroup>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-red-900/40 bg-red-950/20 p-6 text-center space-y-3">
      <p className="text-sm text-red-400">Unable to load data. Check your connection and try again.</p>
      <button
        type="button"
        aria-label="Retry loading data"
        onClick={onRetry}
        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 transition-colors"
      >
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}

function StaleBanner({ onDismiss, onRefresh }: { onDismiss: () => void; onRefresh: () => void }) {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-3 rounded-xl border border-amber-800/40 bg-amber-950/20 px-4 py-2.5 text-sm text-amber-400"
    >
      <span>Showing cached data — live fetch failed.</span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          aria-label="Refresh data"
          onClick={onRefresh}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-amber-300 hover:bg-amber-900/30 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
          Refresh
        </button>
        <button
          type="button"
          aria-label="Dismiss stale data warning"
          onClick={onDismiss}
          className="rounded-lg p-1 hover:bg-amber-900/30 transition-colors"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
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
