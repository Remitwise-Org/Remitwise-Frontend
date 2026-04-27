"use client";

import { useState } from "react";
import { Download, FilterIcon, Search } from "lucide-react";
import TransactionHistoryItem, { Transaction } from "@/components/Dashboard/TransactionHistoryItem";
import { useDensity } from "@/lib/context/DensityContext";

const allTransactions: Transaction[] = [
  {
    id: "TX001",
    type: "Send Money",
    amount: -500.0,
    currency: "USDC",
    counterpartyName: "Maria Santos (Philippines)",
    counterpartyLabel: "To",
    date: "2024-01-28 14:32:15",
    fee: 0.5,
    status: "Completed",
  },
  {
    id: "TX002",
    type: "Smart Split",
    amount: -1200.0,
    currency: "USDC",
    counterpartyName: "Smart Split: 4 allocations",
    counterpartyLabel: "To",
    date: "2024-01-27 09:15:42",
    fee: 0.3,
    status: "Completed",
  },
  {
    id: "TX003",
    type: "Bill Payment",
    amount: -85.5,
    currency: "USDC",
    counterpartyName: "Manila Electric Company",
    counterpartyLabel: "To",
    date: "2024-01-26 16:45:23",
    fee: 0.1,
    status: "Completed",
  },
  {
    id: "TX004",
    type: "Insurance",
    amount: -25.0,
    currency: "USDC",
    counterpartyName: "HealthGuard Insurance Premium",
    counterpartyLabel: "To",
    date: "2024-01-25 11:20:05",
    fee: 0.05,
    status: "Completed",
  },
  {
    id: "TX005",
    type: "Savings",
    amount: -200.0,
    currency: "USDC",
    counterpartyName: "Education Fund Goal",
    counterpartyLabel: "To",
    date: "2024-01-24 08:55:17",
    fee: 0.1,
    status: "Completed",
  },
  {
    id: "TX006",
    type: "Family Transfer",
    amount: -150.0,
    currency: "USDC",
    counterpartyName: "Carlos Santos (Son)",
    counterpartyLabel: "To",
    date: "2024-01-23 19:30:44",
    fee: 0.15,
    status: "Completed",
  },
  {
    id: "TX007",
    type: "Received",
    amount: 75.0,
    currency: "USDC",
    counterpartyName: "Refund from LOBSTR Anchor",
    counterpartyLabel: "From",
    date: "2024-01-22 13:15:30",
    fee: 0.0,
    status: "Completed",
  },
  {
    id: "TX008",
    type: "Send Money",
    amount: -320.0,
    currency: "USDC",
    counterpartyName: "Juan Dela Cruz (Philippines)",
    counterpartyLabel: "To",
    date: "2024-01-21 10:42:18",
    fee: 0.4,
    status: "Pending",
  },
  {
    id: "TX009",
    type: "Bill Payment",
    amount: -120.0,
    currency: "USDC",
    counterpartyName: "Water District Payment",
    counterpartyLabel: "To",
    date: "2024-01-20 15:22:55",
    fee: 0.0,
    status: "Failed",
  },
  {
    id: "TX010",
    type: "Smart Split",
    amount: -800.0,
    currency: "USDC",
    counterpartyName: "Smart Split: 4 allocations",
    counterpartyLabel: "To",
    date: "2024-01-19 12:08:33",
    fee: 0.25,
    status: "Completed",
  },
];

export default function TransactionsPage() {
  const { density } = useDensity();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTransactions = allTransactions.filter((transaction) => {
    const query = searchQuery.toLowerCase();
    return (
      transaction.id.toLowerCase().includes(query) ||
      transaction.counterpartyName.toLowerCase().includes(query) ||
      transaction.type.toLowerCase().includes(query) ||
      transaction.amount.toString().includes(query)
    );
  });

  const handleFilterClick = () => {
    alert("Filter functionality coming soon!");
  };

  const handleExportClick = () => {
    alert("Export functionality coming soon!");
  };

  return (
    <main className="min-h-screen bg-[#010101]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,rgba(18,18,18,0.98),rgba(10,10,10,0.98))] p-6 sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-red-300">Transaction history</p>
              <h1 className="mt-3 text-3xl font-semibold text-white">USDC activity</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
                View on-chain payment, split, and insurance activity. All actions are prepared as USDC transaction payloads that your wallet signs locally.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-flow-col items-center">
              <button
                type="button"
                onClick={handleFilterClick}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/10"
              >
                <FilterIcon className="h-4 w-4" />
                Filters
              </button>
              <button
                type="button"
                onClick={handleExportClick}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-[1.5fr_0.8fr] items-end">
            <label className="relative block">
              <span className="sr-only">Search transactions</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#090909] py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-red-500"
                placeholder="Search by ID, recipient, type, or amount"
              />
            </label>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-gray-300">
              Search is case-insensitive and matches transaction IDs, recipient names, types, and amounts.
            </div>
          </div>

          <div className={density === "compact" ? "mt-10 space-y-3" : "mt-10 space-y-4"}>
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction) => (
                <TransactionHistoryItem key={transaction.id} transaction={transaction} density={density} />
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center text-gray-400">
                No transactions found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
