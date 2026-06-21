"use client";

import React, { useEffect, useRef, useCallback, useState } from "react";
import {
  X,
  Shield,
  CreditCard,
  AlertTriangle,
  Power,
  Loader2,
  Calendar,
  DollarSign,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { type Policy } from "@/lib/contracts/insurance";
import { getPolicyPaymentPresentation } from "@/lib/ui/status-semantics";
import { usePolicyActions } from "@/lib/hooks/usePolicyActions";
import AsyncSubmissionStatus from "@/components/AsyncSubmissionStatus";

/**
 * Props for the {@link PolicyDetail} dialog.
 */
export interface PolicyDetailProps {
  /** The policy to display */
  policy: Policy | null;
  /** Controls dialog visibility */
  open: boolean;
  /** Called when the dialog should close */
  onClose: () => void;
  /** i18n translator function */
  t: (key: string, interpolations?: Record<string, string | number>) => string;
  /** Optional callback after a successful pay action (receives XDR) */
  onPaySuccess?: (xdr: string) => void;
  /** Optional callback after a successful deactivate action (receives XDR) */
  onDeactivateSuccess?: (xdr: string) => void;
}

/**
 * Accessible policy detail dialog with pay-premium and deactivate actions.
 *
 * Features:
 * - Focus trap when open
 * - ESC key closes the dialog
 * - aria-modal="true" for screen readers
 * - Confirm guards on irreversible actions (deactivate)
 * - Async submission status via {@link AsyncSubmissionStatus}
 * - Responsive layout (drawer on mobile, centered dialog on desktop)
 *
 * @example
 * ```tsx
 * <PolicyDetail
 *   policy={selectedPolicy}
 *   open={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   t={t}
 *   onPaySuccess={(xdr) => walletKit.sign(xdr)}
 * />
 * ```
 */
export default function PolicyDetail({
  policy,
  open,
  onClose,
  t,
  onPaySuccess,
  onDeactivateSuccess,
}: PolicyDetailProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const [showPayConfirm, setShowPayConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

  const {
    payState,
    deactivateState,
    payPremium,
    deactivate,
    resetPay,
    resetDeactivate,
  } = usePolicyActions();

  // ── Focus trap & ESC handling ────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      const timer = setTimeout(() => {
        dialogRef.current?.focus();
      }, 50);
      document.body.style.overflow = "hidden";
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = "";
      };
    } else {
      previousFocusRef.current?.focus();
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  // ── Reset local confirm states when dialog closes ─────────────────────────
  useEffect(() => {
    if (!open) {
      setShowPayConfirm(false);
      setShowDeactivateConfirm(false);
      resetPay();
      resetDeactivate();
    }
  }, [open, resetPay, resetDeactivate]);

  // ── Handle action success callbacks ────────────────────────────────────────
  useEffect(() => {
    if (payState.status === "success" && onPaySuccess) {
      onPaySuccess(payState.xdr);
    }
  }, [payState, onPaySuccess]);

  useEffect(() => {
    if (deactivateState.status === "success" && onDeactivateSuccess) {
      onDeactivateSuccess(deactivateState.xdr);
    }
  }, [deactivateState, onDeactivateSuccess]);

  if (!open || !policy) return null;

  const paymentStatus = getPolicyPaymentPresentation(policy.nextPaymentDate, policy.active);
  const StatusIcon = paymentStatus.icon;

  const isPayPending = payState.status === "pending";
  const isDeactivatePending = deactivateState.status === "pending";
  const isAnyPending = isPayPending || isDeactivatePending;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="presentation"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" aria-hidden="true" />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="policy-detail-title"
        aria-describedby="policy-detail-desc"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="relative w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl bg-[#0f1115] border border-white/[0.08] shadow-2xl max-h-[90vh] overflow-y-auto outline-none"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#0f1115]/95 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/[0.05]">
              <Shield className="w-5 h-5 text-red-400" aria-hidden="true" />
            </div>
            <div>
              <h2 id="policy-detail-title" className="text-lg font-semibold text-white">
                {policy.name}
              </h2>
              <p id="policy-detail-desc" className="text-sm text-gray-400">
                {t("insurance.detail_subtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/[0.08] transition-colors text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-500/40"
            aria-label={t("insurance.detail_close")}
            disabled={isAnyPending}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5">
          {/* Status badge */}
          <div
            className={`flex items-center gap-3 p-3 rounded-xl border ${paymentStatus.panelClassName}`}
          >
            <StatusIcon className="w-5 h-5 shrink-0" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">{paymentStatus.label}</p>
              <p className="text-xs opacity-80">{paymentStatus.emphasis}</p>
            </div>
          </div>

          {/* Detail grid */}
          <div className="grid grid-cols-2 gap-3">
            <DetailItem
              icon={<Activity className="w-4 h-4" />}
              label={t("insurance.card_coverage_type")}
              value={policy.coverageType}
            />
            <DetailItem
              icon={<DollarSign className="w-4 h-4" />}
              label={t("insurance.card_monthly_premium")}
              value={formatCurrency(policy.monthlyPremium)}
            />
            <DetailItem
              icon={<Shield className="w-4 h-4" />}
              label={t("insurance.card_coverage_amount")}
              value={formatCurrency(policy.coverageAmount)}
            />
            <DetailItem
              icon={<Calendar className="w-4 h-4" />}
              label={t("insurance.card_next_payment")}
              value={formatDate(policy.nextPaymentDate)}
            />
          </div>

          {/* Async submission status */}
          <AsyncSubmissionStatus
            pending={isAnyPending}
            error={payState.status === "error" ? payState.message : deactivateState.status === "error" ? deactivateState.message : undefined}
            success={payState.status === "success" ? t("insurance.pay_success_desc") : deactivateState.status === "success" ? t("insurance.deactivate_success_desc") : undefined}
            idleTitle={t("insurance.detail_status_idle_title")}
            idleDescription={t("insurance.detail_status_idle_desc")}
            pendingTitle={t("insurance.detail_status_pending_title")}
            pendingDescription={t("insurance.detail_status_pending_desc")}
            successTitle={t("insurance.detail_status_success_title")}
            errorTitle={t("insurance.detail_status_error_title")}
          />

          {/* Actions */}
          <div className="space-y-3 pt-2">
            {/* Pay premium */}
            {policy.active && (
              <div>
                {!showPayConfirm ? (
                  <button
                    onClick={() => setShowPayConfirm(true)}
                    disabled={isAnyPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:bg-red-600/40 disabled:cursor-not-allowed text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  >
                    <CreditCard className="w-4 h-4" />
                    {t("insurance.card_pay_now")}
                  </button>
                ) : (
                  <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-200">
                          {t("insurance.pay_confirm_title")}
                        </p>
                        <p className="text-xs text-amber-200/70 mt-1">
                          {t("insurance.pay_confirm_body", { amount: formatCurrency(policy.monthlyPremium) })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowPayConfirm(false);
                          resetPay();
                        }}
                        disabled={isPayPending}
                        className="flex-1 px-4 py-2 rounded-lg border border-white/[0.1] hover:bg-white/[0.05] text-sm text-gray-300 transition-colors disabled:opacity-50"
                      >
                        {t("insurance.action_cancel")}
                      </button>
                      <button
                        onClick={() => {
                          payPremium(policy.id);
                          setShowPayConfirm(false);
                        }}
                        disabled={isPayPending}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 disabled:bg-red-600/40 text-white text-sm font-medium transition-colors"
                      >
                        {isPayPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                        {isPayPending ? t("insurance.pay_submitting") : t("insurance.pay_confirm")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Deactivate */}
            {policy.active && (
              <div>
                {!showDeactivateConfirm ? (
                  <button
                    onClick={() => setShowDeactivateConfirm(true)}
                    disabled={isAnyPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-white/[0.08] hover:bg-white/[0.04] disabled:opacity-40 disabled:cursor-not-allowed text-gray-400 hover:text-gray-200 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500/30"
                  >
                    <Power className="w-4 h-4" />
                    {t("insurance.action_deactivate")}
                  </button>
                ) : (
                  <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/[0.06] space-y-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-200">
                          {t("insurance.deactivate_confirm_title")}
                        </p>
                        <p className="text-xs text-red-200/70 mt-1">
                          {t("insurance.deactivate_confirm_body")}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowDeactivateConfirm(false);
                          resetDeactivate();
                        }}
                        disabled={isDeactivatePending}
                        className="flex-1 px-4 py-2 rounded-lg border border-white/[0.1] hover:bg-white/[0.05] text-sm text-gray-300 transition-colors disabled:opacity-50"
                      >
                        {t("insurance.action_cancel")}
                      </button>
                      <button
                        onClick={() => {
                          deactivate(policy.id);
                          setShowDeactivateConfirm(false);
                        }}
                        disabled={isDeactivatePending}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 disabled:bg-red-700/40 text-white text-sm font-medium transition-colors"
                      >
                        {isDeactivatePending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                        {isDeactivatePending
                          ? t("insurance.deactivate_submitting")
                          : t("insurance.deactivate_confirm")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Already deactivated notice */}
            {!policy.active && (
              <div className="p-4 rounded-xl border border-gray-500/20 bg-gray-500/[0.06] text-center">
                <p className="text-sm text-gray-400">
                  {t("insurance.already_deactivated")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Single detail row inside the policy detail grid.
 */
function DetailItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
      <div className="mt-0.5 text-gray-500">{icon}</div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-200 mt-0.5">{value}</p>
      </div>
    </div>
  );
}