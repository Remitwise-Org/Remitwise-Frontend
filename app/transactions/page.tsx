
"use client";

import { useState } from "react";
import { Download, FilterIcon } from "lucide-react";
import TransactionHistoryItem, {
  Transaction,
} from "@/components/Dashboard/TransactionHistoryItem";
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
        status: "Completed"
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
        status: "Completed"
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
        status: "Completed"
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
        status: "Completed"
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
        status: "Completed"
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
        status: "Completed"
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
        status: "Completed"
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
        status: "Pending"
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
        status: "Failed"
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
        status: "Completed"
    }
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
        // Placeholder for future filter work
        alert("Filter functionality coming soon!");
    };

    const handleExportClick = () => {
        // Placeholder for future export work
        alert("Export functionality coming soon!");
    };

    return (
        <main className="min-h-screen bg-[#010101] px-4 py-8 text-white sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
                <div className="mb-8 flex flex-col gap-3">
                    <h1 className="text-3xl font-semibold tracking-tight">
                        Transactions
                    </h1>
                    <p className="max-w-2xl text-sm leading-6 text-gray-400">
                        Review remittance history, search recent activity, and export a record when needed.
                    </p>
                </div>

                <div className="mb-8 rounded-2xl border border-[#FFFFFF14] bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A] p-4 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="min-h-[48px] w-full rounded-xl border border-[#FFFFFF14] bg-[#FFFFFF0D] px-4 py-3 text-sm text-gray-200 placeholder:text-gray-500 focus:border-[#FF4B26] focus:outline-none focus:ring-1 focus:ring-[#FF4B26]"
                            placeholder="Search by ID, recipient, or transaction type..."
                        />
                        <div className="flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={handleFilterClick}
                                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-[#FFFFFF14] bg-[#151515] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#1E1E1E]"
                            >
                                <FilterIcon size={17} />
                                Filters
                            </button>
                            <button
                                type="button"
                                onClick={handleExportClick}
                                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#FF4B26] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#ff623f]"
                            >
                                <Download size={17} />
                                Export
                            </button>
                        </div>
                    </div>
                </div>

                <div className={density === "compact" ? "space-y-1" : "space-y-2.5"}>
                    {filteredTransactions.length > 0 ? (
                        filteredTransactions.map((transaction) => (
                            <TransactionHistoryItem
                                key={transaction.id}
                                transaction={transaction}
                                density={density}
                            />
                        ))
                    ) : (
                        <div className="rounded-2xl border border-[#FFFFFF14] bg-[#0F0F0F] px-6 py-12 text-center text-gray-400">
                            No transactions found matching &quot;{searchQuery}&quot;
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
