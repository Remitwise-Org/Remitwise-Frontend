"use client";

import { AlertCircle, CheckCircle, CheckCircle2, Clock4, RefreshCw, Zap } from "lucide-react";

// ─── Status style map ────────────────────────────────────────────────────────

const STATUS_STYLES: Record<
  Bill["status"],
  {
    cardBorder: string;
    badgeBg: string;
    badgeBorder: string;
    badgeText: string;
    dueBg: string;
    dueBorder: string;
    dueIcon: string;
    dueText: string;
  }
> = {
  overdue: {
    cardBorder: "border-red-600/40",
    badgeBg: "bg-red-600/20",
    badgeBorder: "border-red-600/40",
    badgeText: "text-red-400",
    dueBg: "bg-red-600/10",
    dueBorder: "border-red-600/30",
    dueIcon: "text-red-400",
    dueText: "text-red-400",
  },
  urgent: {
    cardBorder: "border-amber-500/40",
    badgeBg: "bg-amber-500/15",
    badgeBorder: "border-amber-500/40",
    badgeText: "text-amber-400",
    dueBg: "bg-amber-500/10",
    dueBorder: "border-amber-500/30",
    dueIcon: "text-amber-400",
    dueText: "text-amber-400",
  },
  upcoming: {
    cardBorder: "border-white/[0.08]",
    badgeBg: "bg-white/5",
    badgeBorder: "border-white/10",
    badgeText: "text-white/50",
    dueBg: "bg-white/5",
    dueBorder: "border-white/[0.08]",
    dueIcon: "text-white/40",
    dueText: "text-white/60",
  },
  paid: {
    cardBorder: "border-white/[0.06]",
    badgeBg: "bg-emerald-600/10",
    badgeBorder: "border-emerald-600/30",
    badgeText: "text-emerald-400",
    dueBg: "bg-white/5",
    dueBorder: "border-white/[0.08]",
    dueIcon: "text-white/30",
    dueText: "text-white/40",
  },
};

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: Bill["status"] }) {
  const s = STATUS_STYLES[status];
  const label: Record<Bill["status"], string> = {
    overdue: "Overdue",
    urgent: "Due Soon",
    upcoming: "Upcoming",
    paid: "Paid",
  };
  const Icon =
    status === "paid"
      ? CheckCircle2
      : status === "overdue" || status === "urgent"
      ? AlertCircle
      : Clock4;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[10px] border px-2 py-0.5 text-xs font-semibold ${s.badgeBg} ${s.badgeBorder} ${s.badgeText}`}
      aria-label={`Status: ${label[status]}`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label[status]}
    </span>
  );
}

// ─── Recurring chain badge ────────────────────────────────────────────────────

function RecurringBadge({
  recurrenceLabel,
  nextOccurrence,
}: {
  recurrenceLabel?: string;
  nextOccurrence?: string;
}) {
  const label = recurrenceLabel ?? "Recurring";
  const nextLabel = nextOccurrence
    ? `Next: ${new Date(nextOccurrence).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })}`
    : null;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-[10px] border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400"
      title={nextLabel ?? label}
      aria-label={nextLabel ? `${label} — ${nextLabel}` : label}
    >
      <RefreshCw className="h-3 w-3" aria-hidden="true" />
      {label}
      {nextLabel && (
        <span className="ml-0.5 text-indigo-400/60">· {nextLabel}</span>
      )}
    </span>
  );
}

// ─── Compact row ──────────────────────────────────────────────────────────────

function CompactBillCard({ bill }: { bill: Bill }) {
  const s = STATUS_STYLES[bill.status];
  return (
    <div
      className={`relative flex items-center gap-4 rounded-xl border ${s.cardBorder} bg-[#0F0F0F] px-4 py-3`}
      role="listitem"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-bold text-white">
          {bill.title}
        </span>
        <span className="truncate text-xs text-white/40">
          {bill.category}
          {bill.isRecurring && bill.recurrenceLabel
            ? ` · ${bill.recurrenceLabel}`
            : ""}
          {" · Due "}
          {new Date(bill.dueDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>

      <div className="flex flex-col items-end gap-1">
        <span className="text-lg font-bold text-white">
          ${bill.amount.toLocaleString()}
        </span>
        <StatusBadge status={bill.status} />
      </div>

      {bill.status !== "paid" && (
        <button
          className="rounded-lg bg-red-600 p-2 text-white transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F0F]"
          aria-label={`Pay ${bill.title} now`}
        >
          <Zap className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// ─── Comfortable card ─────────────────────────────────────────────────────────

function ComfortableBillCard({ bill }: { bill: Bill }) {
  const s = STATUS_STYLES[bill.status];
  const isPaid = bill.status === "paid";

  return (
    <article
      className={`relative flex flex-col gap-4 overflow-hidden rounded-2xl border ${s.cardBorder} bg-[linear-gradient(180deg,#0F0F0F_0%,#0A0A0A_100%)] p-6`}
      aria-label={`${bill.title} — ${bill.status}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h3 className="truncate text-lg font-bold leading-7 text-white">
            {bill.title}
          </h3>
          <span className="text-xs text-white/40">{bill.category}</span>
        </div>

        {/* Badges */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <StatusBadge status={bill.status} />
          {bill.isRecurring && (
            <RecurringBadge
              recurrenceLabel={bill.recurrenceLabel}
              nextOccurrence={bill.nextOccurrence}
            />
          )}
        </div>
      </div>

      {/* Amount */}
      <span
        className={`text-4xl font-bold tracking-tight ${isPaid ? "text-white/40" : "text-white"}`}
      >
        ${bill.amount.toLocaleString()}
      </span>

      {/* Due date row */}
      <div
        className={`flex items-center gap-2 rounded-[10px] border ${s.dueBorder} ${s.dueBg} px-3 py-3`}
      >
        <Clock4 className={`h-3.5 w-3.5 shrink-0 ${s.dueIcon}`} aria-hidden="true" />
        <div className="flex flex-1 flex-col">
          <span className="text-xs text-white/50">Due Date</span>
          <span className="text-sm font-semibold text-white">
            {new Date(bill.dueDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        <span className={`text-xs font-semibold ${s.dueText} whitespace-nowrap`}>
          {bill.daysInfo}
        </span>
      </div>

      {/* Pay Now */}
      {!isPaid && (
        <button
          className="flex h-10 w-full items-center justify-center gap-2 rounded-[14px] bg-gradient-to-b from-red-600 to-red-700 text-sm font-semibold text-white shadow-[0_10px_15px_-3px_rgba(220,38,38,0.2)] transition hover:from-red-500 hover:to-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]"
          aria-label={`Pay ${bill.title}`}
        >
          <Zap className="h-4 w-4" aria-hidden="true" />
          Pay Now
        </button>
      )}

      {isPaid && (
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-400">
          <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Payment complete
        </div>
      )}
    </article>
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
  return density === "compact" ? (
    <CompactBillCard bill={bill} />
  ) : (
    <ComfortableBillCard bill={bill} />
  );
}
