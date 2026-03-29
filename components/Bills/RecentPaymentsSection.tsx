import { CheckCircle2, RefreshCcw, Clock } from "lucide-react";
import { useDensity } from "@/lib/context/DensityContext";

const payments = [
  {
    name: "Phone Bill",
    category: "Utilities",
    amount: "$35",
    date: "Jan 19, 2026",
  },
  {
    name: "Water Bill",
    category: "Utilities",
    amount: "$45",
    date: "Jan 14, 2026",
  },
  {
    name: "Insurance Premium",
    category: "Insurance",
    amount: "$200",
    date: "Jan 9, 2026",
  },
];

export default function RecentPaymentsSection() {
  const { density } = useDensity();

  return (
    <section className="w-full max-w-7xl bg-[#010101] p-3 mx-auto flex flex-col gap-6 px-4 sm:px-2 lg:px-0">
      <div>
        <h2 className="text-2xl font-semibold text-white">Recent Payments</h2>
        <p className="mt-2 text-sm text-white/50">Last 3 payments</p>
      </div>

      <div className={density === 'compact' ? "flex flex-col gap-2" : "grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"}>
        {payments.map((payment) => (
          <div
            key={payment.name}
            className={density === 'compact' 
              ? "rounded-xl border border-white/10 bg-[#121212] px-6 py-4 flex items-center justify-between"
              : "rounded-3xl border border-white/10 bg-[#121212] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.45)]"
            }
          >
            <div className={density === 'compact' ? "flex items-center gap-4 flex-1" : ""}>
              <div className={density === 'compact' ? "flex flex-col flex-1" : "flex items-start justify-between gap-3"}>
                <div>
                  <h3 className={density === 'compact' ? "text-sm font-semibold text-white" : "text-lg font-semibold text-white"}>
                    {payment.name}
                  </h3>
                  <p className={density === 'compact' ? "text-xs text-white/50" : "mt-1 text-sm text-white/50"}>{payment.category}</p>
                </div>
                {! (density === 'compact') && (
                  <div className="flex flex-col items-end gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#dc2626]/40 bg-[#dc2626]/10 px-3 py-1 text-xs font-semibold text-[#dc2626]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Paid
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60">
                      <RefreshCcw className="h-3.5 w-3.5" />
                      Recurring
                    </span>
                  </div>
                )}
              </div>

              {density === 'compact' ? (
                <div className="flex items-center gap-8">
                   <div className="text-right">
                    <p className="text-sm font-semibold text-white">{payment.amount}</p>
                    <p className="text-[10px] text-white/40">{payment.date}</p>
                  </div>
                  <div className="flex gap-1">
                    <span className="p-1 rounded bg-[#dc2626]/10 border border-[#dc2626]/40 text-[#dc2626]" title="Paid">
                      <CheckCircle2 className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-8 text-4xl font-semibold text-white">
                    {payment.amount}
                  </p>

                  <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-white/50">
                      <Clock className="h-4 w-4" />
                      <span>Payment Date</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {payment.date}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
