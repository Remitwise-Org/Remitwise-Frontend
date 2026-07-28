"use client";

import { CalendarClock, Repeat, Zap } from "lucide-react";
import { getBillStatusPresentation } from "@/lib/ui/status-semantics";
import { Bill } from "@/lib/contracts/bill-payments";
import { URGENCY_TIER_META } from "@/lib/bills/urgency";

// ─── Per-status card styles ───────────────────────────────────────────────────

const getStatusStyles = (status: Bill["status"]) => {
  switch (status) {
    case "overdue":
      return {
        border: "border-status-error-border",
        dueBg: "bg-status-error-soft",
        dueBorder: "border-status-error-border",
      };
    case "urgent":
      return {
        border: "border-status-warning-border",
        dueBg: "bg-status-warning-soft",
        dueBorder: "border-status-warning-border",
      };
    case "upcoming":
      return {
        border: "border-status-info-border",
        dueBg: "bg-status-info-soft",
        dueBorder: "border-status-info-border",
      };
    case "paid":
      return {
        border: "border-status-success-border",
        dueBg: "bg-status-success-soft",
        dueBorder: "border-status-success-border",
      };
    default:
      return {
        border: "border-white/10",
        dueBg: "bg-white/5",
        dueBorder: "border-white/10",
      };
  }
};

// Normalise statuses that status-semantics doesn't handle to a presentable fallback
function normalisedStatus(
  status: Bill["status"]
): "paid" | "overdue" | "urgent" | "upcoming" {
  if (status === "unpaid" || status === "cancelled") return "upcoming";
  return status;
}

// ─── Compact row ─────────────────────────────────────────────────────────────

function CompactCard({ bill }: { bill: Bill }) {
  const styles = getStatusStyles(bill.status);
  const statusPresentation = getBillStatusPresentation(normalisedStatus(bill.status));
  const StatusIcon = statusPresentation.icon;

  // Left-border accent colour from URGENCY_TIER_META (paid has no tier entry)
  const tierKey = bill.status as keyof typeof URGENCY_TIER_META;
  const leftBorderClass =
    tierKey in URGENCY_TIER_META
      ? URGENCY_TIER_META[tierKey].borderAccent
      : "border-l-white/10";

  return (
    <div
      className={`relative flex items-center justify-between gap-4 overflow-hidden rounded-xl border ${styles.border} border-l-2 ${leftBorderClass} px-4 py-3`}
      style={{ background: "linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)" }}
    >
      {/* Bill info */}
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="truncate text-sm font-bold text-white" title={bill.name}>
          {bill.name}
        </h3>
        <span className="truncate text-xs text-white/40">
          Bill · Due {bill.dueDate}
        </span>
      </div>

      {/* Amount + status */}
      <div className="flex flex-col items-end">
        <span className="text-lg font-bold text-white">${bill.amount}</span>
        <div
          className={`mt-0.5 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusPresentation.badgeClassName}`}
          aria-label={`Status: ${statusPresentation.label}`}
        >
          <StatusIcon className="h-3 w-3" aria-hidden="true" />
          <span>{statusPresentation.label}</span>
        </div>
        <span className={`mt-0.5 text-[11px] font-medium ${statusPresentation.metaClassName}`}>
          {statusPresentation.emphasis}
        </span>
      </div>

      {/* Pay Now — icon only in compact mode */}
      {bill.status !== "paid" && (
        <button
          className="rounded-lg bg-red-600 p-2 text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          aria-label="Pay Now"
          title="Pay Now"
        >
          <Zap className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// ─── Comfortable card ─────────────────────────────────────────────────────────

function ComfortableCard({ bill }: { bill: Bill }) {
  const styles = getStatusStyles(bill.status);
  const statusPresentation = getBillStatusPresentation(normalisedStatus(bill.status));
  const StatusIcon = statusPresentation.icon;

  // Overdue cards get a subtle animated pulse ring
  const isOverdue = bill.status === "overdue";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${styles.border} ${
        isOverdue ? URGENCY_TIER_META.overdue.glowClass : ""
      }`}
      style={{ background: "linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)" }}
    >
      {/* Overdue pulse ring — absolutely-positioned ring that animates */}
      {isOverdue && (
        <span
          className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-red-500/50 animate-[pulse_2s_ease-in-out_infinite]"
          aria-hidden="true"
        />
      )}

      {/* Card content */}
      <div className="relative flex flex-col gap-4 p-6">
        {/* Header: title + badge */}
        <div className="flex flex-row items-start justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h3
              className="truncate text-lg font-bold leading-7 tracking-[-0.44px] text-white"
              title={bill.name}
            >
              {bill.name}
            </h3>
            <span className="text-xs leading-4 text-white/40">Bill</span>
          </div>

          <div className="flex flex-col items-end">
            <div
              className={`inline-flex h-[26px] items-center gap-1 rounded-[10px] border px-2 ${statusPresentation.badgeClassName}`}
              aria-label={`Status: ${statusPresentation.label}`}
            >
              <StatusIcon className="h-3 w-3" />
              <span className="whitespace-nowrap text-xs font-semibold leading-4">
                {statusPresentation.label}
              </span>
            </div>
          </div>
        </div>

        {/* Amount */}
        <div className="w-full">
          <span className="text-4xl font-bold leading-10 tracking-[0.37px] text-white">
            ${bill.amount}
          </span>
        </div>

        {/* Due date row */}
        <div
          className={`mt-auto flex h-[62px] flex-row items-center gap-2 rounded-[10px] border px-3 ${styles.dueBorder} ${styles.dueBg}`}
        >
          <StatusIcon className={`h-4 w-4 ${statusPresentation.metaClassName}`} />

          <div className="flex flex-col flex-1">
            <span className="font-normal text-xs leading-4 text-white/50">
              Due Date
            </span>
            <span className="font-semibold text-sm leading-5 tracking-[-0.150391px] text-white">
              {bill.dueDate}
            </span>
          </div>

          <div className="text-right">
            <div className={`font-semibold text-xs leading-4 whitespace-nowrap ${statusPresentation.metaClassName}`}>
              {statusPresentation.emphasis}
            </div>
          </div>
        </div>

        {/* Pay Now button */}
        {bill.status !== "paid" && (
          <button
            className="flex h-10 w-full items-center justify-center gap-2 rounded-[14px] font-semibold text-sm leading-5 tracking-[-0.15px] text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            style={{
              background: "linear-gradient(180deg, #DC2626 0%, #B91C1C 100%)",
              boxShadow:
                "0px 10px 15px -3px rgba(220,38,38,0.2), 0px 4px 6px -4px rgba(220,38,38,0.2)",
            }}
          >
            <Zap className="h-4 w-4" aria-hidden="true" />
            Pay Now
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function BillCards({
  bill,
  density = "comfortable",
}: {
  bill: Bill;
  density?: "comfortable" | "compact";
}) {
  if (density === "compact") return <CompactCard bill={bill} />;
  return <ComfortableCard bill={bill} />;
}
