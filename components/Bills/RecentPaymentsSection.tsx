"use client";

import { BillCards } from "@/components/Bills/BillsCard";
import { useDensity } from "@/lib/context/DensityContext";
import { Bill } from '@/lib/contracts/bill-payments';
import { WidgetEmptyState } from '@/components/ui/WidgetStates';

export default function RecentPaymentsSection({ bills }: { bills: Bill[] }) {
  const { density } = useDensity();
  const paidBills = bills.filter((bill) => bill.status === 'paid');

  return (
    <section
      className="w-full max-w-7xl bg-[#010101] mx-auto flex flex-col gap-6 px-4 sm:px-2 lg:px-0 opacity-80"
      aria-label="Recent Payments"
    >
      <div>
        <h2 className="text-2xl font-semibold text-white/60">Recent Payments</h2>
        <p className="mt-2 text-sm text-white/40">
          Last {mockPaidBills.length} payments
        </p>
      </div>

      {paidBills.length > 0 ? (
        <div
          role="list"
          className={
            density === "compact"
              ? "flex flex-col gap-2"
              : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
          }
        >
          {paidBills.map((bill) => (
            <BillCards key={bill.id} bill={bill} density={density} />
          ))}
        </div>
      ) : (
        <WidgetEmptyState title="No recent payments" message="Paid bills will appear here once processed." />
      )}
    </section>
  );
}
