"use client";

import { BillCards } from "@/components/Bills/BillsCard";
import { mockPaidBills } from "@/lib/mockdata/bills";
import { useDensity } from "@/lib/context/DensityContext";

export default function RecentPaymentsSection() {
  const { density } = useDensity();

  return (
    <section
      className="w-full max-w-7xl bg-[#010101] mx-auto flex flex-col gap-6 px-4 sm:px-2 lg:px-0"
      aria-label="Recent Payments"
    >
      <div>
        <h2 className="text-2xl font-semibold text-white">Recent Payments</h2>
        <p className="mt-2 text-sm text-white/50">
          Last {mockPaidBills.length} payments
        </p>
      </div>

      <div
        role="list"
        className={
          density === "compact"
            ? "flex flex-col gap-2"
            : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        }
      >
        {mockPaidBills.map((bill) => (
          <BillCards key={bill.id} bill={bill} density={density} />
        ))}
      </div>
    </section>
  );
}
