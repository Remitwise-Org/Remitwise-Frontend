"use client";

import { useState, useCallback, useEffect } from "react";
import { Shield, Plus } from "lucide-react";
import { type Policy } from "@/lib/contracts/insurance";
import { getPolicyPaymentPresentation } from "@/lib/ui/status-semantics";
import { apiClient } from "@/lib/client/apiClient";
import { CTA_TEST_IDS } from "@/lib/cta-testids";
import { SkeletonList } from "@/components/ui/Skeleton";
import PolicyDetail from "@/components/insurance/PolicyDetail";
import NewPolicyForm from "@/components/forms/NewPolicyForm";
import PrimaryButton from "@/components/ui/PrimaryButton";
import { useClientTranslator } from "@/lib/i18n/client";
import { useToast } from "@/lib/context/ToastContext";
import { useFormAction } from "@/lib/hooks/useFormAction";
import PageHeadingLink from "@/components/PageHeadingLink";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PageState {
  policies: Policy[];
  loading: boolean;
  error: string | null;
}

// ─── Coverage-type → semantic tone helper ─────────────────────────────────────
//
// Maps a free-text coverageType string to one of the four shared status tones so
// the badge on each PolicyCard uses the same semantic colour tokens as the rest
// of the product (bills, transactions, etc.).
//
// Mapping rationale:
//   health / life / medical  → success  (green  — active protection, positive)
//   disability / accident    → warning  (amber  — critical gap risk if missed)
//   property / travel        → info     (blue   — informational / scheduled)
//   everything else          → info     (blue   — safe neutral fallback)

type CoverageTone = "success" | "warning" | "error" | "info";

function getCoverageTone(coverageType: string): CoverageTone {
  const lower = coverageType.toLowerCase();
  if (/health|life|medical/.test(lower)) return "success";
  if (/disability|accident/.test(lower)) return "warning";
  return "info";
}

const coverageToneClasses: Record<
  CoverageTone,
  { badge: string }
> = {
  success: {
    badge:
      "border-status-success-border bg-status-success-bg text-status-success-fg",
  },
  warning: {
    badge:
      "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
  },
  error: {
    badge: "border-status-error-border bg-status-error-bg text-status-error-fg",
  },
  info: {
    badge: "border-status-info-border bg-status-info-bg text-status-info-fg",
  },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InsurancePage() {
  const { t } = useClientTranslator();
  const [state, setState] = useState<PageState>({
    policies: [],
    loading: true,
    error: null,
  });
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [showNewPolicy, setShowNewPolicy] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const { toast } = useToast();

  // Live create-policy form wired to POST /api/insurance.
  const [formState, formAction, formPending] = useFormAction("/api/insurance");

  // On a successful create, toast, reset the form, and refresh the list.
  useEffect(() => {
    if (!formState?.success) return;
    toast({ variant: "success", title: t("insurance.form_success") });
    setShowNewPolicy(false);
    setFormKey((k) => k + 1); // remount the form to clear inputs/errors
    setSelectedPolicy(null);
  }, [formState?.success, toast, t]);

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
  }, [t]);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        {/*
         * Sticky on tall viewports — matches the bills / transactions header
         * pattern. bg-[#0a0b0f] keeps the content readable while scrolling.
         * border-b border-white/[0.04] matches the family & send page divider.
         */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 tall:sticky tall:top-16 375:tall:top-20 tall:z-40 bg-[#0a0b0f] py-4 border-b border-white/[0.04]">
          <div>
            <PageHeadingLink
              headingId="insurance-page-heading"
              label={t("insurance.page_title")}
              headingClassName="text-2xl sm:text-3xl font-bold tracking-tight"
              buttonClassName="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/60 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D72323]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0b0f]"
            >
              {t("insurance.page_title")}
            </PageHeadingLink>
            <p className="text-gray-400 mt-1 text-sm sm:text-base">
              {t("insurance.page_subtitle")}
            </p>
          </div>
          <PrimaryButton
            onClick={() => setShowNewPolicy((s) => !s)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            {t("insurance.new_policy")}
          </PrimaryButton>
        </div>

        {/* ── Total premium summary card ──────────────────────────────────── */}
        {/*
         * Surface: bg-white/[0.03]  — L1 card, same as PolicyCard base.
         * Border:  border-white/[0.06] — consistent with all dark cards.
         * Icon bg: bg-[#D72323]/10 — brand accent at low opacity for depth.
         * Icon:    text-[#D72323]  — brand.red resolved via arbitrary value
         *          because Tailwind JIT does not support dot-notation tokens
         *          with opacity modifiers (bg-brand.red/10 fails to compile).
         */}
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
              {/* Shield icon — brand accent. bg-[#D72323]/10 is the correct
                  Tailwind JIT syntax for brand red at 10 % opacity. */}
              <div className="p-3 rounded-xl bg-[#D72323]/10">
                <Shield className="w-6 h-6 text-[#D72323]" aria-hidden="true" />
              </div>
            </div>
          </div>
        )}

        {/* ── New policy form ─────────────────────────────────────────────── */}
        {showNewPolicy && (
          <div className="mb-8">
            <NewPolicyForm
              key={formKey}
              pending={formPending}
              state={formState}
              formAction={formAction}
              t={t}
            />
          </div>
        )}

        {/* ── Policies list ───────────────────────────────────────────────── */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            {/* Section icon uses brand red; text-[#D72323] resolves reliably
                in Tailwind JIT (dot-notation text-brand.red does not). */}
            <Shield className="w-5 h-5 text-[#D72323]" aria-hidden="true" />
            {t("insurance.active_policies")}
          </h2>

          {state.loading && (
            <SkeletonList rows={3} variant="cards" />
          )}

          {/* ── Error state ──────────────────────────────────────────────── */}
          {/*
           * Surface:  bg-[#D72323]/[0.06] — very low opacity brand red tint,
           *           identical to PolicyDetail's deactivate confirm panel.
           * Border:   border-[#D72323]/20
           * Retry CTA: bg-[#D72323]/20 → hover:bg-[#D72323]/30, matching the
           *            bills page error panel hover pattern.
           */}
          {state.error && !state.loading && (
            <div className="p-6 rounded-2xl border border-[#D72323]/20 bg-[#D72323]/[0.06] text-center">
              <p className="text-[#D72323] text-sm">{state.error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 rounded-lg bg-[#D72323]/20 hover:bg-[#D72323]/30 text-[#D72323] text-sm transition-colors"
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
              ctaTestId={CTA_TEST_IDS.page.insuranceEmptyPrimary}
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

      {/* ── Policy Detail Dialog ─────────────────────────────────────────── */}
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
//
// Dark elevation pattern (matches family member cards and bills cards):
//   Base:   bg-white/[0.03]  border-white/[0.06]
//   Hover:  bg-white/[0.05]  border-white/[0.12]   ← group-hover on the wrapper
//
// Coverage-type badge uses getCoverageTone() → semantic status token classes
// so the colour system is consistent with bill status badges.

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

  const coverageTone = getCoverageTone(policy.coverageType);
  const coverageBadgeClass = coverageToneClasses[coverageTone].badge;

  return (
    <div className="group p-4 sm:p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all duration-200">
      {/* Card header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Icon container: slight elevation above card base */}
          <div className="p-2 rounded-lg bg-white/[0.05]">
            <Shield className="w-5 h-5 text-[#D72323]" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm sm:text-base">{policy.name}</h3>
            {/* Payment-status badge (due / overdue / active) */}
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border mt-1 ${paymentStatus.badgeClassName}`}
            >
              <StatusIcon className="w-3 h-3" aria-hidden="true" />
              {paymentStatus.label}
            </span>
          </div>
        </div>
        {/* Coverage-type badge — semantic colour token driven by policy type */}
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${coverageBadgeClass}`}
        >
          {policy.coverageType}
        </span>
      </div>

      {/* Policy details */}
      <div className="space-y-2 mb-4">
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

      {/* Payment-status panel */}
      <div
        className={`flex items-center gap-2 p-2.5 rounded-lg border mb-4 ${paymentStatus.panelClassName}`}
      >
        <StatusIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs font-medium">{paymentStatus.label}</p>
          <p className="text-[11px] opacity-80 truncate">{paymentStatus.emphasis}</p>
        </div>
      </div>

      {/* View detail CTA */}
      {/*
       * bg-white/[0.05] base → hover:bg-white/[0.08] — matches the
       * "secondary ghost" button pattern used across dark card footers.
       * focus:ring-[#D72323]/30 replaces the broken focus:ring-brand.red/30.
       */}
      <button
        onClick={onViewDetail}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.15] text-sm text-gray-300 hover:text-white font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#D72323]/30"
      >
        {t("insurance.card_view_detail")}
      </button>
    </div>
  );
}

// ─── PolicyRow ────────────────────────────────────────────────────────────────

function PolicyRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      {/* text-gray-500 for label — secondary text, meets AA against #0a0b0f */}
      <span className="text-gray-500">{label}</span>
      {/* text-gray-200 for value — primary data, well above 4.5:1 */}
      <span className="text-gray-200 font-medium">{value}</span>
    </div>
  );
}

// ─── EmptyPolicies ────────────────────────────────────────────────────────────
//
// CTA uses bg-brand-red / hover:bg-brand-redHover (kebab-case token, consistent
// with family page submit button). The dashed border + bg-white/[0.02] base
// matches the empty state pattern in bills and goals pages.

function EmptyPolicies({
  title,
  body,
  onCta,
  ctaLabel,
  ctaTestId,
}: {
  title: string;
  body: string;
  onCta: () => void;
  ctaLabel: string;
  ctaTestId?: string;
}) {
  return (
    <div className="text-center py-12 sm:py-16 px-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] border-dashed">
      <div className="inline-flex p-3 rounded-xl bg-white/[0.05] mb-4">
        <Shield className="w-8 h-8 text-gray-600" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold text-gray-300 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">{body}</p>
      <button
        onClick={onCta}
        data-testid={ctaTestId}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-red hover:bg-brand-redHover active:bg-red-800 text-white text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D72323]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0b0f]"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        {ctaLabel}
      </button>
    </div>
  );
}
