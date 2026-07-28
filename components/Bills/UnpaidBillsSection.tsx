"use client";

import React from "react";
import { AlertCircle, Clock3, CalendarClock } from "lucide-react";
import { BillCards } from "./BillsCard";
import { useDensity } from "@/lib/context/DensityContext";
import { Bill } from "@/lib/contracts/bill-payments";
import { WidgetEmptyState } from "@/components/ui/WidgetStates";
import {
  sortBillsByUrgency,
  URGENCY_TIER_META,
  BillUrgency,
} from "@/lib/bills/urgency";

// ─── Tier divider ─────────────────────────────────────────────────────────────

const TIER_ICONS: Record<Exclude<BillUrgency, "paid">, React.ElementType> = {
  overdue: AlertCircle,
  urgent: Clock3,
  upcoming: CalendarClock,
};

interface TierDividerProps {
  tier: Exclude<BillUrgency, "paid">;
  count: number;
}

function TierDivider({ tier, count }: TierDividerProps) {
  const meta = URGENCY_TIER_META[tier];
  const Icon = TIER_ICONS[tier];

  return (
    <div
      className="flex items-center gap-3 py-1"
      role="separator"
      aria-label={`${meta.label} – ${count} bill${count !== 1 ? "s" : ""}`}
    >
      {/* Coloured icon + label */}
      <span className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] ${meta.accentColor}`}>
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {meta.label}
      </span>

      {/* Count chip */}
      <span
        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${meta.badgeBg}`}
        aria-hidden="true"
      >
        {count}
      </span>

      {/* Description */}
      <span className="hidden text-xs text-white/35 sm:inline">
        {meta.description}
      </span>

      {/* Rule line */}
      <div className="h-px flex-1 bg-white/[0.06]" aria-hidden="true" />
    </div>
  );
}

// ─── Main section ─────────────────────────────────────────────────────────────

const UNPAID_STATUSES: Bill["status"][] = ["overdue", "urgent", "upcoming"];

export function UnpaidBillsSection({ bills }: { bills: Bill[] }) {
  const { density } = useDensity();

  const unpaidBills = bills.filter((bill) =>
    UNPAID_STATUSES.includes(bill.status)
  );

    return (
        <div className="w-full max-w-7xl bg-[#010101] p-3 mx-auto flex flex-col gap-6 px-4 sm:px-2 lg:px-0">
            {/* Header */}
            <div className="flex flex-row justify-between items-center">
                <div className="flex flex-col gap-1">
                    <h2 className="font-bold text-2xl leading-8 tracking-[0.0703125px] text-white">
                        Unpaid Bills
                    </h2>
                    <p className="font-normal text-sm leading-5 tracking-[-0.150391px] text-white/40">
                        {unpaidBills.length} bills pending payment{unpaidBills.filter(b => b.recurring).length > 0 ? ` — ${unpaidBills.filter(b => b.recurring).length} recurring` : ''}
                    </p>
                </div>
            </div>

  // Group into tiers preserving sort order
  const tiers: Exclude<BillUrgency, "paid">[] = ["overdue", "urgent", "upcoming"];
  const grouped = tiers.reduce<
    Record<Exclude<BillUrgency, "paid">, Bill[]>
  >(
    (acc, t) => {
      acc[t] = sorted.filter((b) => b.status === t);
      return acc;
    },
    { overdue: [], urgent: [], upcoming: [] }
  );

  const overdueCount = grouped.overdue.length;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 px-4 sm:px-2 lg:px-0">
      {/* ── Section header ───────────────────────────────────────────── */}
      <div className="flex flex-row items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 id="unpaid-bills-heading" className="font-bold text-2xl leading-8 tracking-[0.07px] text-white">
            Unpaid Bills
          </h2>
          <p className="text-sm leading-5 text-white/40">
            {unpaidBills.length === 0
              ? "All bills are paid"
              : `${unpaidBills.length} bill${unpaidBills.length !== 1 ? "s" : ""} pending payment`}
            {overdueCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-300">
                <AlertCircle className="h-3 w-3" aria-hidden="true" />
                {overdueCount} overdue
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────── */}
      {unpaidBills.length === 0 ? (
        <WidgetEmptyState
          title="You're all caught up!"
          message="No unpaid bills right now. New bills you add will appear here."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {tiers.map((tier) => {
            const tierBills = grouped[tier];
            if (tierBills.length === 0) return null;

            return (
              <div key={tier} className="flex flex-col gap-3">
                {/* Tier divider with count badge */}
                <TierDivider tier={tier} count={tierBills.length} />

                {/* Cards grid / compact list */}
                {density === "compact" ? (
                  <div className="flex flex-col gap-2" role="list">
                    {tierBills.map((bill) => (
                      <div key={bill.id} role="listitem">
                        <BillCards bill={bill} density="compact" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className={`grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-[19.67px] ${
                      // Overdue group gets a very subtle warm ambient glow behind the grid
                      tier === "overdue"
                        ? "rounded-2xl p-px ring-1 ring-red-500/10 bg-red-500/[0.03]"
                        : ""
                    }`}
                    role="list"
                  >
                    {tierBills.map((bill) => (
                      <div key={bill.id} role="listitem">
                        <BillCards bill={bill} density="comfortable" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
