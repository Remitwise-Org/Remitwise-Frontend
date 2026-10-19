"use client";

import { useState } from "react";
import { History, ChevronDown, ChevronUp } from "lucide-react";
import { BillCards } from "@/components/Bills/BillsCard";
import { useDensity } from "@/lib/context/DensityContext";
import { Bill } from "@/lib/contracts/bill-payments";
import { WidgetEmptyState } from "@/components/ui/WidgetStates";

/** How many paid cards to show before the "show more" toggle. */
const DEFAULT_VISIBLE = 3;

export default function RecentPaymentsSection({ bills }: { bills: Bill[] }) {
  const { density } = useDensity();
  const paidBills = bills.filter((bill) => bill.status === "paid");
  const [expanded, setExpanded] = useState(false);

  const visible = expanded ? paidBills : paidBills.slice(0, DEFAULT_VISIBLE);
  const hasMore = paidBills.length > DEFAULT_VISIBLE;

  return (
    <section
      aria-labelledby="recent-payments-heading"
      className="w-full max-w-7xl mx-auto px-4 sm:px-2 lg:px-0"
    >
      {/* ── Zone divider: separates "needs action" from "history" ─────── */}
      <div className="mb-6 flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-white/[0.06]" />
        <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30">
          <History className="h-3 w-3" />
          Payment History
        </span>
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>

      {/* ── Section header — intentionally low-weight ─────────────────── */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2
            id="recent-payments-heading"
            className="text-base font-medium text-white/50"
          >
            Recent Payments
          </h2>
          <p className="mt-0.5 text-xs text-white/25">
            {paidBills.length === 0
              ? "No payments recorded yet"
              : `${paidBills.length} payment${paidBills.length !== 1 ? "s" : ""} on record`}
          </p>
        </div>
      </div>

      {/* ── Card list ─────────────────────────────────────────────────── */}
      {paidBills.length === 0 ? (
        <WidgetEmptyState
          title="No payments recorded yet."
          message="Bills you pay will appear here for your records."
        />
      ) : (
        <>
          {/*
            Paid cards are rendered at 70 % opacity and with a grayscale filter
            to visually push them into the "history" zone. This is applied via an
            outer wrapper so BillsCard itself stays agnostic.
          */}
          <div
            role="list"
            className={
              density === "compact"
                ? "flex flex-col gap-2"
                : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            }
          >
            {visible.map((bill) => (
              <div
                key={bill.id}
                role="listitem"
                className="opacity-70 grayscale-[30%] transition-[opacity,filter] hover:opacity-100 hover:grayscale-0"
              >
                <BillCards bill={bill} density={density} />
              </div>
            ))}
          </div>

          {/* Show more / collapse toggle */}
          {hasMore && (
            <button
              onClick={() => setExpanded((prev) => !prev)}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/[0.07] bg-white/[0.03] py-2.5 text-xs font-medium text-white/40 transition hover:bg-white/[0.06] hover:text-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              aria-expanded={expanded}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                  Show {paidBills.length - DEFAULT_VISIBLE} more payment
                  {paidBills.length - DEFAULT_VISIBLE !== 1 ? "s" : ""}
                </>
              )}
            </button>
          )}
        </>
      )}
    </section>
  );
}
