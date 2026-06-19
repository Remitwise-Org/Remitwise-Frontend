'use client'

import { Receipt, AlertCircle, TrendingUp, Clock3 } from 'lucide-react'

type StatsData = {
  totalUnpaid: { amount: string; pendingCount: number }
  overdueCount: number
  paidThisMonth: { amount: string; paymentCount: number }
}

const defaultStats: StatsData = {
  totalUnpaid: { amount: '1,510', pendingCount: 4 },
  overdueCount: 1,
  paidThisMonth: { amount: '280', paymentCount: 3 },
}

export default function BillPaymentsStatsCards({
  stats = defaultStats,
}: {
  stats?: StatsData
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {/* Total Unpaid */}
      <div className="relative rounded-2xl bg-[#1a1515] p-5 sm:p-6 border border-white/5">
        <div className="absolute top-4 right-4 sm:top-5 sm:right-5 text-red-500">
          <Receipt className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.5} />
        </div>
        <p className="text-sm text-gray-400 mb-1">Total Unpaid</p>
        <p className="text-2xl sm:text-3xl font-bold text-white">
          ${stats.totalUnpaid.amount}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {stats.totalUnpaid.pendingCount} bills pending
        </p>
      </div>

      {/* Overdue Bills */}
      <div className="relative rounded-2xl bg-[#0f0f0f] p-5 sm:p-6 border border-white/5">
        {stats.overdueCount > 0 ? (
          <>
            <div className="absolute top-4 right-4 sm:top-5 sm:right-5 flex items-center justify-center w-8 h-8 rounded-full bg-red-500/20 text-red-500">
              <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2} />
            </div>
            <p className="text-sm text-gray-400 mb-1">Overdue Bills</p>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              {stats.overdueCount}
            </p>
            <p className="text-sm text-red-500 font-medium mt-1">
              Requires immediate attention
            </p>
          </>
        ) : (
          <>
            <div className="absolute top-4 right-4 sm:top-5 sm:right-5 flex items-center justify-center w-8 h-8 rounded-full bg-white/5 text-gray-400">
              <Clock3 className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.5} />
            </div>
            <p className="text-sm text-gray-400 mb-1">Overdue Bills</p>
            <p className="text-2xl sm:text-3xl font-bold text-white">
              0
            </p>
            <p className="text-sm text-gray-400 mt-1">
              No overdue bills
            </p>
          </>
        )}
      </div>

      {/* Paid This Month */}
      <div className="relative rounded-2xl bg-[#0f0f0f] p-5 sm:p-6 border border-white/5">
        <div className="absolute top-4 right-4 sm:top-5 sm:right-5 text-red-500">
          <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={1.5} />
        </div>
        <p className="text-sm text-gray-400 mb-1">Paid This Month</p>
        <p className="text-2xl sm:text-3xl font-bold text-white">
          ${stats.paidThisMonth.amount}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {stats.paidThisMonth.paymentCount} payments made
        </p>
      </div>
    </div>
  )
}
