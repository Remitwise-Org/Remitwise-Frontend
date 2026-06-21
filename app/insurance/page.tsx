"use client";

import { useState, useCallback, useEffect } from "react";
import { Shield, Plus } from "lucide-react";
import { type Policy } from "@/lib/contracts/insurance";
import { getPolicyPaymentPresentation } from "@/lib/ui/status-semantics";
import { apiClient } from "@/lib/client/apiClient";
import { SkeletonList } from "@/components/ui/Skeleton";
import PolicyDetail from "@/components/insurance/PolicyDetail";
import NewPolicyForm from "@/components/forms/NewPolicyForm";

// ─── i18n stubs (replace with your real i18n hook) ───────────────────────────

const en = {
  insurance: {
    page_title: "Micro-Insurance",
    page_subtitle: "Manage your active coverage policies",
    new_policy: "New Policy",
    active_policies: "Active Policies",
    no_policies_title: "No active policies yet",
    no_policies_body: "Create your first policy to start protecting what matters most.",
    total_premium: "Total Monthly Premium",
    total_premium_sub: "Auto-paid from remittance allocation",
    card_coverage_type: "Coverage Type",
    card_monthly_premium: "Monthly Premium",
    card_coverage_amount: "Coverage Amount",
    card_next_payment: "Next Payment",
    card_pay_now: "Pay Premium Now",
    card_view_detail: "View Details",
    detail_subtitle: "Policy details and actions",
    detail_close: "Close policy details",
    detail_status_idle_title: "Ready",
    detail_status_idle_desc: "Select an action above to interact with this policy.",
    detail_status_pending_title: "Processing request",
    detail_status_pending_desc: "Building the on-chain payload — this takes a moment.",
    detail_status_success_title: "Request ready",
    detail_status_error_title: "Request failed",
    pay_success_desc: "Premium payment payload is ready for signing.",
    deactivate_success_desc: "Deactivation payload is ready for signing.",
    pay_confirm_title: "Confirm premium payment",
    pay_confirm_body: "You are about to pay {{amount}} for this policy. This action cannot be undone after signing.",
    pay_submitting: "Preparing payment…",
    pay_confirm: "Confirm Payment",
    deactivate_confirm_title: "Deactivate policy permanently",
    deactivate_confirm_body: "This will permanently deactivate your policy. You will lose coverage immediately and cannot reactivate it. Are you sure?",
    deactivate_submitting: "Deactivating…",
    deactivate_confirm: "Yes, Deactivate",
    action_deactivate: "Deactivate Policy",
    action_cancel: "Cancel",
    already_deactivated: "This policy has been deactivated and can no longer be modified.",
    error_fetch_policies: "Failed to load policies. Please try again.",
    error_fetch_detail: "Failed to load policy details.",
  },
};

function t(key: string, interpolations?: Record<string, string | number>): string {
  const parts = key.split(".");
  let value: unknown = en;
  for (const part of parts) {
    if (value && typeof value === "object" && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  let result = typeof value === "string" ? value : key;
  if (interpolations) {
    Object.entries(interpolations).forEach(([k, v]) => {
      result = result.replace(new RegExp(`{{${k}}}`, "g"), String(v));
    });
  }
  return result;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageState {
  policies: Policy[];
  loading: boolean;
  error: string | null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InsurancePage() {
  const [state, setState] = useState<PageState>({
    policies: [],
    loading: true,
    error: null,
  });
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showNewPolicy, setShowNewPolicy] = useState(false);

  // Fetch policies on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchPolicies() {
      try {
        const response = await apiClient.get("/api/v1/insurance");
        if (!cancelled) {
          if (!response) {
            setState({ policies: [], loading: false, error: null });
            return;
          }
          if (!response.ok) {
            setState({
              policies: [],
              loading: false,
              error: t("insurance.error_fetch_policies"),
            });
            return;
          }
          const data = await response.json();
          setState({ policies: data.policies || [], loading: false, error: null });
        }
      } catch {
        if (!cancelled) {
          setState({ policies: [], loading: false, error: t("insurance.error_fetch_policies") });
        }
      }
    }

    fetchPolicies();
    return () => { cancelled = true; };
  }, []);

  const handleOpenDetail = useCallback((policy: Policy) => {
    setSelectedPolicy(policy);
    setDetailOpen(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailOpen(false);
    setTimeout(() => setSelectedPolicy(null), 300);
  }, []);

  const totalPremium = state.policies
    .filter((p) => p.active)
    .reduce((sum, p) => sum + p.monthlyPremium, 0);

  return (
    <div className="min-h-screen bg-[#0a0b0f] text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {t("insurance.page_title")}
            </h1>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">
              {t("insurance.page_subtitle")}
            </p>
          </div>
          <button
            onClick={() => setShowNewPolicy((s) => !s)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
          >
            <Plus className="w-4 h-4" />
            {t("insurance.new_policy")}
          </button>
        </div>

        {/* Total premium stat */}
        {state.policies.length > 0 && !state.loading && (
          <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  {t("insurance.total_premium")}
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-white mt-1">
                  {new Intl.NumberFormat(undefined, {
                    style: "currency",
                    currency: "USD",
                  }).format(totalPremium)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {t("insurance.total_premium_sub")}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-red-500/10">
                <Shield className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </div>
        )}

        {/* New policy form */}
        {showNewPolicy && (
          <div className="mb-8">
            <NewPolicyForm
              pending={false}
              state={{}}
              formAction={() => {}}
            />
          </div>
        )}

        {/* Policies list */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-400" />
            {t("insurance.active_policies")}
          </h2>

          {state.loading && (
            <SkeletonList rows={3} variant="cards" />
          )}

          {state.error && !state.loading && (
            <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/[0.06] text-center">
              <p className="text-red-300 text-sm">{state.error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 text-sm transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {!state.loading && !state.error && state.policies.length === 0 && (
            <EmptyPolicies
              title={t("insurance.no_policies_title")}
              body={t("insurance.no_policies_body")}
              onCta={() => setShowNewPolicy(true)}
              ctaLabel={t("insurance.new_policy")}
            />
          )}

          {!state.loading && !state.error && state.policies.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {state.policies.map((policy) => (
                <PolicyCard
                  key={policy.id}
                  policy={policy}
                  t={t}
                  onViewDetail={() => handleOpenDetail(policy)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Policy Detail Dialog */}
      <PolicyDetail
        policy={selectedPolicy}
        open={detailOpen}
        onClose={handleCloseDetail}
        t={t}
      />
    </div>
  );
}

// ─── PolicyCard ───────────────────────────────────────────────────────────────

function PolicyCard({
  policy,
  t,
  onViewDetail,
}: {
  policy: Policy;
  t: (key: string, interpolations?: Record<string, string | number>) => string;
  onViewDetail: () => void;
}) {
  const paymentStatus = getPolicyPaymentPresentation(policy.nextPaymentDate, policy.active);
  const StatusIcon = paymentStatus.icon;

  return (
    <div className="group p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-200">
      {/* Card header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/[0.05]">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm sm:text-base">{policy.name}</h3>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${paymentStatus.badgeClassName}`}
            >
              <StatusIcon className="w-3 h-3" />
              {paymentStatus.label}
            </span>
          </div>
        </div>
      </div>

      {/* Policy details */}
      <div className="space-y-2 mb-4">
        <PolicyRow
          label={t("insurance.card_coverage_type")}
          value={policy.coverageType}
        />
        <PolicyRow
          label={t("insurance.card_monthly_premium")}
          value={new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: "USD",
          }).format(policy.monthlyPremium)}
        />
        <PolicyRow
          label={t("insurance.card_coverage_amount")}
          value={new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: "USD",
          }).format(policy.coverageAmount)}
        />
        <PolicyRow
          label={t("insurance.card_next_payment")}
          value={new Date(policy.nextPaymentDate).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        />
      </div>

      {/* Status panel */}
      <div
        className={`flex items-center gap-2 p-2.5 rounded-lg border mb-4 ${paymentStatus.panelClassName}`}
      >
        <StatusIcon className="w-4 h-4 shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-medium">{paymentStatus.label}</p>
          <p className="text-[11px] opacity-80 truncate">{paymentStatus.emphasis}</p>
        </div>
      </div>

      {/* View detail button */}
      <button
        onClick={onViewDetail}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-sm text-gray-300 hover:text-white font-medium transition-all focus:outline-none focus:ring-2 focus:ring-red-500/30"
      >
        {t("insurance.card_view_detail")}
      </button>
    </div>
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
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200 font-medium">{value}</span>
    </div>
  );
}

// ─── EmptyPolicies ────────────────────────────────────────────────────────────

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
    <div className="text-center py-12 sm:py-16 px-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] border-dashed">
      <div className="inline-flex p-3 rounded-xl bg-white/[0.05] mb-4">
        <Shield className="w-8 h-8 text-gray-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">{body}</p>
      <button
        onClick={onCta}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors"
      >
        <Plus className="w-4 h-4" />
        {ctaLabel}
      </button>
    </div>
  );
}