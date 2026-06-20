"use client"
import Link from 'next/link'
import { ArrowLeft, Plus, Shield, Loader2, CalendarClock } from 'lucide-react'
import { ActionState } from '@/lib/auth/middleware';
import { useFormAction } from '@/lib/hooks/useFormAction';
import { getPolicyPaymentPresentation } from '@/lib/ui/status-semantics';
import NewPolicyForm from '@/components/forms/NewPolicyForm';

export default function Insurance() {
  type AddInsuranceResponse = ActionState & { 
    policyName?: string; 
    coverageAmount?: number; 
    monthlyPremium?: number; 
    coverageType?: string 
  };
  
  const [state, formAction, pending] = useFormAction<AddInsuranceResponse>("/api/insurance");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Micro-Insurance</h1>
            </div>
            <div className="flex flex-col items-end">
              <button
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 bg-gradient-to-b from-red-600 to-red-700 text-white font-medium transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled
              >
                <Plus className="w-5 h-5" />
                <span>New Policy</span>
              </button>
              <p className="mt-1 text-sm text-gray-500">Policy creation will be available once contract integration is live.</p>
            </div>
          </div>
        </div>
      </header>

      {/* New Policy Form */}
      <NewPolicyForm pending={pending} state={state} formAction={formAction} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Policies */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Active Policies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PolicyCard
              name="Health Insurance"
              coverageType="health"
              monthlyPremium={20}
              coverageAmount={1000}
              nextPayment="2024-02-01"
              active={true}
            />
            <PolicyCard
              name="Emergency Coverage"
              coverageType="emergency"
              monthlyPremium={15}
              coverageAmount={500}
              nextPayment="2024-02-05"
              active={true}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function PolicyCard({ 
  name, 
  coverageType, 
  monthlyPremium, 
  coverageAmount, 
  nextPayment, 
  active 
}: { 
  name: string; 
  coverageType: string; 
  monthlyPremium: number; 
  coverageAmount: number; 
  nextPayment: string;
  active: boolean; 
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-6"
    >
      <div className="flex items-center gap-3 mb-4">
        <ShieldCheck className="h-6 w-6 text-emerald-400" aria-hidden />
        <h3 className="font-semibold text-white">{t("insurance.status_success_title")}</h3>
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SuccessBadge label={t("insurance.success_badge_name")} value={state.policyName} />
        <SuccessBadge label={t("insurance.success_badge_type")} value={state.coverageType} />
        <SuccessBadge
          label={t("insurance.success_badge_premium")}
          value={state.monthlyPremium !== undefined ? `$${state.monthlyPremium}/mo` : undefined}
        />
        <SuccessBadge
          label={t("insurance.success_badge_coverage")}
          value={state.coverageAmount !== undefined ? `$${state.coverageAmount}` : undefined}
        />
      </dl>
    </div>
  );
}

function SuccessBadge({
  label,
  value,
}: {
  label: string;
  value?: string | number;
}) {
  if (value === undefined || value === null) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <dt className="text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="mt-1 font-semibold text-white">{value}</dd>
    </div>
  );
}

// ─── PolicyCard ────────────────────────────────────────────────────────────────

function PolicyCard({
  policy,
  t,
}: {
  policy: Policy;
  t: (key: string) => string;
}) {
  const paymentStatus = getPolicyPaymentPresentation(
    policy.nextPaymentDate,
    policy.active
  );
  const StatusIcon = paymentStatus.icon;

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#111] p-6">
      {/* Card header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-400" aria-hidden />
          <h3 className="text-lg font-semibold text-white">{policy.name}</h3>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${paymentStatus.badgeClassName}`}
        >
          <StatusIcon className="h-3.5 w-3.5" aria-hidden />
          <span>{paymentStatus.label}</span>
        </span>
      </div>

      {/* Policy details */}
      <dl className="space-y-3">
        <PolicyRow
          label={t("insurance.card_coverage_type")}
          value={<span className="capitalize">{policy.coverageType}</span>}
        />
        <PolicyRow
          label={t("insurance.card_monthly_premium")}
          value={`$${policy.monthlyPremium}`}
        />
        <PolicyRow
          label={t("insurance.card_coverage_amount")}
          value={`$${policy.coverageAmount}`}
        />
        <PolicyRow
          label={t("insurance.card_next_payment")}
          value={policy.nextPaymentDate}
        />
      </dl>

      {/* Status panel */}
      <div
        className={`mt-4 rounded-xl border px-3 py-3 ${paymentStatus.panelClassName}`}
      >
        <div className="flex items-start gap-2">
          <StatusIcon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{paymentStatus.label}</p>
            <p className="text-sm">{paymentStatus.emphasis}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-gray-400">
              <CalendarClock className="h-3.5 w-3.5" aria-hidden />
              <span>
                {t("insurance.card_next_payment")}: {policy.nextPaymentDate}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Pay now — kept disabled per current scope; wired payment flow is a separate task */}
      {policy.active && (
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="mt-4 w-full cursor-not-allowed rounded-xl border border-white/10 bg-[#1a1a1a] px-4 py-2 text-sm font-semibold text-gray-500 transition"
        >
          {t("insurance.card_pay_now")}
        </button>
      )}
    </article>
  );
}

function PolicyRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between text-sm">
      <dt className="text-gray-400">{label}</dt>
      <dd className="font-semibold text-white">{value}</dd>
    </div>
  );
}

// ─── EmptyPolicies ─────────────────────────────────────────────────────────────

function EmptyPolicies({
  title,
  body,
  onCta,
  ctaLabel,
}: {
  title: string;
  body: string;
  onCta: () => void;
  ctaLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/[0.12] bg-white/[0.02] py-16 text-center">
      <Shield className="mb-4 h-10 w-10 text-gray-600" aria-hidden />
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-gray-400">{body}</p>
      <button
        type="button"
        onClick={onCta}
        className="mt-6 flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 font-medium text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#010101]"
      >
        <Plus className="h-4 w-4" aria-hidden />
        {ctaLabel}
      </button>
    </div>
  );
}
