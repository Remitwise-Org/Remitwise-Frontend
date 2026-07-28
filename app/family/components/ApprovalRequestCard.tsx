"use client";

import {
  CheckCircle2,
  Clock3,
  GitMerge,
  Loader2,
  Timer,
  UserPlus,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { ApprovalItem, ApprovalStatus } from "@/lib/hooks/useApprovalsQueue";

// ---------------------------------------------------------------------------
// Status presentation — uses existing status design tokens throughout.
// Status is always conveyed by both icon and text, never colour alone.
// ---------------------------------------------------------------------------

interface StatusPresentation {
  icon: LucideIcon;
  /** Tailwind classes for the status badge (border + bg + text using status tokens) */
  badgeClass: string;
  /** Tailwind classes for the card border + bg */
  cardClass: string;
  /** Icon classes including colour */
  iconClass: string;
  /** Accessible text label */
  label: string;
  /** Whether the icon should spin */
  spin?: boolean;
}

function getStatusPresentation(status: ApprovalStatus): StatusPresentation {
  switch (status) {
    case "building":
      return {
        icon: Loader2,
        label: "Building",
        badgeClass: "border-white/10 bg-white/[0.03] text-gray-400",
        cardClass: "border-white/10 bg-white/[0.02]",
        iconClass: "text-gray-400",
        spin: true,
      };
    case "requested":
      return {
        icon: Clock3,
        label: "Awaiting approval",
        badgeClass:
          "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
        cardClass: "border-amber-500/20 bg-amber-500/[0.05]",
        iconClass: "text-status-warning-fg",
      };
    case "partially_approved":
      return {
        icon: GitMerge,
        label: "Partially approved",
        badgeClass:
          "border-status-info-border bg-status-info-bg text-status-info-fg",
        cardClass: "border-status-info-border bg-status-info-bg/30",
        iconClass: "text-status-info-fg",
      };
    case "pending":
      // Legacy alias — treated like requested
      return {
        icon: Clock3,
        label: "Awaiting approval",
        badgeClass:
          "border-status-warning-border bg-status-warning-bg text-status-warning-fg",
        cardClass: "border-amber-500/20 bg-amber-500/[0.05]",
        iconClass: "text-status-warning-fg",
      };
    case "signing":
      return {
        icon: Loader2,
        label: "Signing…",
        badgeClass: "border-red-500/30 bg-red-500/[0.08] text-red-200",
        cardClass: "border-red-500/20 bg-red-500/[0.06]",
        iconClass: "text-red-300",
        spin: true,
      };
    case "approved":
      return {
        icon: CheckCircle2,
        label: "Approved",
        badgeClass:
          "border-status-success-border bg-status-success-bg text-status-success-fg",
        cardClass: "border-emerald-500/20 bg-emerald-500/[0.07]",
        iconClass: "text-status-success-fg",
      };
    case "rejected":
      return {
        icon: XCircle,
        label: "Rejected",
        badgeClass:
          "border-status-error-border bg-status-error-bg text-status-error-fg",
        cardClass: "border-status-error-border bg-status-error-bg/20",
        iconClass: "text-status-error-fg",
      };
    case "expired":
      return {
        icon: Timer,
        label: "Expired",
        badgeClass: "border-white/[0.06] bg-white/[0.02] text-gray-500",
        cardClass: "border-white/[0.06] bg-white/[0.01] opacity-60",
        iconClass: "text-gray-500",
      };
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function shortenAddress(addr: string) {
  if (!addr || addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function getInitial(addrOrName: string) {
  return (addrOrName?.[0] ?? "?").toUpperCase();
}

// ---------------------------------------------------------------------------
// Approver avatar strip
// ---------------------------------------------------------------------------

interface ApproverAvatarsProps {
  signers: string[];
  required: number;
}

function ApproverAvatars({ signers, required }: ApproverAvatarsProps) {
  // Show up to `required` slots — filled or empty
  const slots = Array.from({ length: required }, (_, i) => signers[i] ?? null);

  return (
    <div
      className="flex items-center gap-1"
      aria-label={`${signers.length} of ${required} approvers signed`}
    >
      {slots.map((signer, i) => (
        <span
          key={i}
          title={signer ? signer : "Awaiting approver"}
          aria-label={signer ? `Approved by ${shortenAddress(signer)}` : "Awaiting approver"}
          className={`grid h-7 w-7 place-items-center rounded-full border text-[10px] font-bold transition-colors ${
            signer
              ? "border-status-success-border bg-status-success-bg text-status-success-fg"
              : "border-white/10 bg-white/[0.03] text-gray-500"
          }`}
        >
          {signer ? getInitial(signer) : "·"}
        </span>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ApprovalRequestCardProps {
  item: ApprovalItem;
  /** Whether the current viewer can act on this item */
  canAct: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ApprovalRequestCard
 *
 * Displays a single multisig approval request with:
 * - Requester identity (address + avatar)
 * - Action type and optional amount
 * - Approver progress (avatars/initials for each required slot, filled when signed)
 * - Progress text: "{n} of {m} approvals"
 * - Status badge — always text + icon, never colour alone (WCAG 2.1 AA)
 * - Approve / Reject buttons when the item is actionable
 *
 * Terminal states (approved, rejected, expired) are rendered read-only.
 */
export default function ApprovalRequestCard({
  item,
  canAct,
  onApprove,
  onReject,
}: ApprovalRequestCardProps) {
  const pres = getStatusPresentation(item.status);
  const StatusIcon = pres.icon;

  const isActionable =
    canAct &&
    (item.status === "requested" ||
      item.status === "partially_approved" ||
      item.status === "pending");
  const isSigning = item.status === "signing";

  const actionLabel =
    item.action === "add_member" ? "Add member" : "Update spending limit";

  const progressText = `${item.collectedSignatures.length} of ${item.requiredSignatures} approval${item.requiredSignatures !== 1 ? "s" : ""}`;

  return (
    <article
      className={`rounded-2xl border p-4 transition-colors ${pres.cardClass}`}
      aria-label={`${actionLabel} request from ${shortenAddress(item.requester)}: ${pres.label}`}
    >
      {/* ── Top row: requester identity + status badge ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Requester */}
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border border-red-500/20 bg-red-500/10 text-xs font-bold text-white"
          >
            {getInitial(item.requester)}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white">
              {shortenAddress(item.requester)}
            </p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-gray-500">
              Requester
            </p>
          </div>
        </div>

        {/* Status badge — text + icon, never colour alone */}
        <span
          role="status"
          aria-label={`Status: ${pres.label}`}
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${pres.badgeClass}`}
        >
          <StatusIcon
            className={`h-3 w-3 flex-shrink-0 ${pres.iconClass} ${pres.spin ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
          <span>{pres.label}</span>
        </span>
      </div>

      {/* ── Action description ── */}
      <div className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-white">
            <UserPlus className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" aria-hidden="true" />
            {item.label}
          </span>
          <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-gray-400">
            {actionLabel}
          </span>
        </div>
        {item.amount !== undefined && (
          <p className="mt-1 text-xs text-gray-400">
            Amount:{" "}
            <span className="font-semibold text-white">{fmt.format(item.amount)}</span>
          </p>
        )}
      </div>

      {/* ── Approver progress ── */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <ApproverAvatars
            signers={item.collectedSignatures}
            required={item.requiredSignatures}
          />
          <p className="text-xs text-gray-400">
            <span className="font-semibold text-white">
              {item.collectedSignatures.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-white">{item.requiredSignatures}</span>{" "}
            approval{item.requiredSignatures !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* ── Error message ── */}
      {item.error && (
        <p className="mt-2 text-xs text-status-error-fg" role="alert">
          {item.error}
        </p>
      )}

      {/* ── Approve / Reject actions ── */}
      {(isActionable || isSigning) && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={isSigning || !item.xdr}
            onClick={() => onApprove(item.id)}
            aria-label={`Approve ${item.label}`}
            aria-describedby={`approval-progress-${item.id}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-status-success-border bg-status-success-bg px-3 py-2 text-xs font-semibold text-status-success-fg transition-colors hover:bg-emerald-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            {isSigning ? "Signing…" : "Approve"}
          </button>
          <button
            type="button"
            disabled={isSigning}
            onClick={() => onReject(item.id)}
            aria-label={`Reject ${item.label}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-status-error-border bg-status-error-bg px-3 py-2 text-xs font-semibold text-status-error-fg transition-colors hover:bg-red-500/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <XCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            Reject
          </button>
        </div>
      )}

      {/* Screen-reader progress announcement */}
      <span id={`approval-progress-${item.id}`} className="sr-only">
        {progressText}
      </span>
    </article>
  );
}
