"use client";

import React, { useEffect, useRef, useState } from "react";
import { X, User, Send, ShieldCheck, Edit2, Save, XCircle, Users, Activity } from "lucide-react";
import { useFamilyMemberDetail } from "@/lib/hooks/useFamilyMemberDetail";
import { useToast } from "@/lib/context/ToastContext";
import { useClientTranslator } from "@/lib/i18n/client";
import { validateSpendingLimit } from "@/lib/validation/family-limits";
import WidgetErrorState from "@/components/ui/WidgetErrorState";
import WidgetEmptyState from "@/components/ui/WidgetEmptyState";
import type { FamilyMember as CardMember } from "./FamilyMemberStatCard";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function roleMeta(role: string) {
  switch (role) {
    case "recipient":
    case "Recipient":
      return {
        icon: <User className="h-3.5 w-3.5" />,
        cls: "border-emerald-500/30 bg-emerald-500/[0.12] text-emerald-200",
      };
    case "sender":
    case "Sender":
      return {
        icon: <Send className="h-3.5 w-3.5" />,
        cls: "border-sky-500/30 bg-sky-500/[0.12] text-sky-200",
      };
    case "admin":
    case "Admin":
      return {
        icon: <ShieldCheck className="h-3.5 w-3.5" />,
        cls: "border-amber-500/30 bg-amber-500/[0.12] text-amber-100",
      };
    default:
      return { icon: null, cls: "border-white/10 bg-white/[0.03] text-gray-200" };
  }
}

function usageMeta(pct: number) {
  if (pct >= 100)
    return {
      bar: "bg-status-error-fg",
      text: "text-status-error-fg",
      badge: "border-status-error-border bg-status-error-bg text-status-error-fg",
    };
  if (pct >= 75)
    return {
      bar: "bg-status-warning-fg",
      text: "text-status-warning-fg",
      badge: "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
    };
  return {
    bar: "bg-status-success-fg",
    text: "text-status-success-fg",
    badge: "border-status-success-border bg-status-success-bg text-status-success-fg",
  };
}

// Focus-trap: cycle focusable elements inside a container
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;
    const prev = document.activeElement as HTMLElement | null;
    // Focus first focusable inside
    const first = el.querySelectorAll<HTMLElement>(FOCUSABLE)[0];
    first?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const idx = items.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey) {
        if (idx <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      } else {
        if (idx === items.length - 1) { e.preventDefault(); items[0].focus(); }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [active, ref]);
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------

function DrawerSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-hidden="true">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-white/[0.06]" />
        <div className="space-y-2">
          <div className="h-4 w-32 rounded bg-white/[0.06]" />
          <div className="h-3 w-20 rounded bg-white/[0.06]" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 rounded-2xl bg-white/[0.06]" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface FamilyMemberDetailDrawerProps {
  /** The card-level member (has name/initial/used/usedPercentage) */
  member: CardMember | null;
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * FamilyMemberDetailDrawer
 *
 * Accessible slide-in drawer that shows full member detail fetched from the
 * three /api/family/members/[id]/* endpoints.  Includes spending-limit
 * inline editing with optimistic update, toast feedback, and full a11y
 * (focus trap, ESC close, aria-modal, role=dialog).
 *
 * @param member  - Static card-level member used as seed data while the API loads
 * @param open    - Whether the drawer is visible
 * @param onClose - Callback to close the drawer
 */
export default function FamilyMemberDetailDrawer({
  member,
  open,
  onClose,
}: FamilyMemberDetailDrawerProps) {
  const { t } = useClientTranslator();
  const { toast } = useToast();
  const drawerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(drawerRef, open);

  const { state, fetch, updateLimit } = useFamilyMemberDetail(open ? (member?.id ?? null) : null);
  const [editing, setEditing] = useState(false);
  const [limitInput, setLimitInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);

  // Fetch when drawer opens
  useEffect(() => {
    if (open && member?.id) {
      fetch();
    }
  }, [open, member?.id, fetch]);

  // Reset edit state when drawer closes / different member opens
  useEffect(() => {
    setEditing(false);
    setLimitInput("");
    setInputError(null);
  }, [open, member?.id]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const handleSave = async () => {
    const num = parseFloat(limitInput);
    const v = validateSpendingLimit(num);
    if (!v.isValid) {
      setInputError(v.error ?? t("familyDrawer.invalidLimit", "Invalid limit"));
      return;
    }
    setInputError(null);
    const ok = await updateLimit(num);
    if (ok) {
      toast({ variant: "success", title: t("familyDrawer.limitSaved", "Limit updated") });
      setEditing(false);
    } else {
      toast({
        variant: "error",
        title: t("familyDrawer.limitSaveError", "Failed to save limit"),
        description: state.saveError ?? undefined,
      });
    }
  };

  // Derive display values: prefer live API data, fall back to card seed data
  const apiMember = state.member;
  const spendingLimit =
    state.pendingLimit ??
    state.limit?.spendingLimit ??
    apiMember?.spendingLimit ??
    member?.spendingLimit ??
    0;
  const currentSpending =
    state.limit?.currentSpending ??
    apiMember?.currentSpending ??
    state.checkResult?.currentSpending ??
    member?.used ??
    0;
  const remainingLimit =
    state.limit?.remainingLimit ?? state.checkResult?.remainingLimit ?? (spendingLimit - currentSpending);
  const usedPct =
    spendingLimit > 0 ? Math.min(Math.round((currentSpending / spendingLimit) * 100), 100) : 0;
  const role = apiMember?.role ?? member?.role ?? "";
  const address = apiMember?.address ?? member?.stellarId ?? "";
  const rm = roleMeta(role || member?.role || "");
  const um = usageMeta(usedPct);
  const drawerTitleId = "family-member-detail-title";

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={drawerTitleId}
        className="fixed inset-0 z-50 flex w-full flex-col overflow-y-auto bg-[#0d0d0d] shadow-2xl ring-1 ring-white/10 sm:inset-y-0 sm:left-auto sm:max-w-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-red-500/20 bg-red-500/10">
              <span className="text-sm font-bold text-white">
                {member?.initial ?? "?"}
              </span>
            </div>
            <div>
              <p id={drawerTitleId} className="text-sm font-semibold text-white">
                {member?.name ?? t("familyDrawer.ariaLabel", "Member detail")}
              </p>
              {role && (
                <span
                  className={`mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${rm.cls}`}
                >
                  {rm.icon}
                  <span className="capitalize">{role}</span>
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("familyDrawer.close", "Close member detail")}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-gray-400 transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-4 px-6 py-6">
          {/* Loading */}
          {state.loading && <DrawerSkeleton />}

          {/* Error */}
          {!state.loading && state.error && (
            <WidgetErrorState
              message={
                state.error === "member_not_found"
                  ? t("familyDrawer.notFound", "Member not found")
                  : t("familyDrawer.fetchError", "Failed to load member data")
              }
              onRetry={fetch}
            />
          )}

          {!state.loading && !state.error && state.unavailable && (
            <div className="rounded-2xl border border-status-warning-border bg-status-warning-bg p-4">
              <p className="text-sm font-semibold text-status-warning-fg">
                {t("familyDrawer.contractUnavailableTitle", "Live member data unavailable")}
              </p>
              <p className="mt-1 text-xs leading-5 text-gray-300">
                {t(
                  "familyDrawer.contractUnavailableDescription",
                  "The wallet contract endpoint is not deployed yet, so the drawer is showing the latest available card values."
                )}
              </p>
            </div>
          )}

          {/* No member after load (404 or no ID) */}
          {!state.loading && !state.error && !apiMember && !member && (
            <WidgetEmptyState
              icon={Users}
              title={t("familyDrawer.emptyTitle", "No member selected")}
              description={t("familyDrawer.emptyDescription", "Select a member from the list to view details.")}
              ctaLabel={t("familyDrawer.emptyCtaLabel", "View family")}
              ctaHref="/family"
            />
          )}

          {/* Content – show when we have seed data (member prop) even while loading */}
          {(member || apiMember) && (
            <>
              {/* Stellar address */}
              {address && (
                <div className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    {t("familyDrawer.stellarAddress", "Stellar address")}
                  </p>
                  <p className="mt-2 break-all font-mono text-sm text-gray-200">{address}</p>
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3">
                {/* Spending limit (editable) */}
                <div className="col-span-3 rounded-2xl border border-white/[0.08] bg-black/25 p-4 sm:col-span-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                      {t("familyDrawer.spendingLimit", "Spending limit")}
                    </p>
                    {!editing ? (
                      <button
                        type="button"
                        onClick={() => { setLimitInput(String(spendingLimit)); setEditing(true); }}
                        aria-label={t("familyDrawer.editLimit", "Edit spending limit")}
                        className="grid h-6 w-6 place-items-center rounded text-gray-500 hover:text-gray-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setEditing(false); setInputError(null); }}
                        aria-label={t("familyDrawer.cancelEdit", "Cancel edit")}
                        className="grid h-6 w-6 place-items-center rounded text-gray-500 hover:text-gray-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {editing ? (
                    <div className="mt-2 space-y-1">
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={limitInput}
                        onChange={(e) => { setLimitInput(e.target.value); setInputError(null); }}
                        aria-label={t("familyDrawer.newLimitInput", "New spending limit")}
                        aria-describedby={inputError ? "limit-error" : undefined}
                        aria-invalid={!!inputError}
                        className="w-full rounded-lg border border-white/10 bg-[#1a1a1a] px-2 py-1 text-sm text-white focus:border-red-500 focus:outline-none"
                      />
                      {inputError && (
                        <p id="limit-error" role="alert" className="text-xs text-status-error-fg">
                          {inputError}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={state.saving}
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 py-1.5 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-500/20 disabled:opacity-60"
                      >
                        <Save className="h-3 w-3" />
                        {state.saving
                          ? t("familyDrawer.saving", "Saving…")
                          : t("familyDrawer.save", "Save")}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-3 text-lg font-semibold text-white">{fmt.format(spendingLimit)}</p>
                  )}
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    {t("familyDrawer.spent", "Spent")}
                  </p>
                  <p className="mt-3 text-lg font-semibold text-white">{fmt.format(currentSpending)}</p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    {t("familyDrawer.remaining", "Remaining")}
                  </p>
                  <p className={`mt-3 text-lg font-semibold ${remainingLimit < 0 ? "text-status-error-fg" : "text-white"}`}>
                    {fmt.format(remainingLimit)}
                  </p>
                </div>
              </div>

              {/* Utilization bar */}
              <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white">
                    {t("familyDrawer.utilization", "Utilization")}
                  </p>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${um.badge}`}>
                    {usedPct}%
                  </span>
                </div>
                <div
                  className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
                  role="progressbar"
                  aria-valuenow={usedPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t("familyDrawer.utilizationLabel", "Spending utilization")}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${um.bar}`}
                    style={{ width: `${usedPct}%` }}
                  />
                </div>
              </div>

              {/* Check result */}
              {state.checkResult && (
                <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    {t("familyDrawer.spendCheck", "Spend eligibility")}
                  </p>
                  <p className={`mt-2 text-sm font-medium ${state.checkResult.allowed ? "text-status-success-fg" : "text-status-error-fg"}`}>
                    {state.checkResult.allowed
                      ? t("familyDrawer.checkAllowed", "Member can make additional purchases")
                      : t("familyDrawer.checkBlocked", "Member has reached their spending limit")}
                  </p>
                </div>
              )}

              <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-red-300" aria-hidden="true" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    {t("familyDrawer.recentActivity", "Recent activity")}
                  </p>
                </div>
                {currentSpending > 0 ? (
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2">
                      <div>
                        <p className="text-sm font-medium text-white">
                          {t("familyDrawer.monthlySpendActivity", "Monthly spending")}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {t("familyDrawer.currentCycle", "Current wallet cycle")}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-white">{fmt.format(currentSpending)}</p>
                    </div>
                  </div>
                ) : (
                  <WidgetEmptyState
                    icon={Activity}
                    title={t("familyDrawer.noActivityTitle", "No recent activity")}
                    description={t("familyDrawer.noActivityDescription", "This member has no spending recorded for the current cycle.")}
                    ctaLabel={t("familyDrawer.emptyCtaLabel", "View family")}
                    ctaHref="/family"
                  />
                )}
              </div>

              {/* Metadata */}
              {apiMember?.addedAt && (
                <div className="rounded-2xl border border-white/[0.08] bg-black/25 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                    {t("familyDrawer.addedAt", "Member since")}
                  </p>
                  <p className="mt-2 text-sm text-gray-300">
                    {new Date(apiMember.addedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
