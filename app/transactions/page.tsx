
"use client";

import { useState } from "react";

import Link from "next/link";
import {
    ArrowLeft,
    Search,
    Filter,
    Download
} from "lucide-react";
import TransactionHistoryItem, { Transaction } from "@/components/Dashboard/TransactionHistoryItem";
import { useRouter } from "next/navigation";

// Sample Data (Same as dashboard for now, but pretending to be the full dataset)
const allTransactions: Transaction[] = [
    {
        id: "TX001",
        type: "Send Money",
        amount: -500.00,
        currency: "USDC",
        counterpartyName: "Maria Santos (Philippines)",
        counterpartyLabel: "To",
        date: "2024-01-28 14:32:15",
        fee: 0.50,
        status: "Completed"
    },
    {
        id: "TX002",
        type: "Smart Split",
        amount: -1200.00,
        currency: "USDC",
        counterpartyName: "Smart Split: 4 allocations",
        counterpartyLabel: "To",
        date: "2024-01-27 09:15:42",
        fee: 0.30,
        status: "Completed"
    },
    {
        id: "TX003",
        type: "Bill Payment",
        amount: -85.50,
        currency: "USDC",
        counterpartyName: "Manila Electric Company",
        counterpartyLabel: "To",
        date: "2024-01-26 16:45:23",
        fee: 0.10,
        status: "Completed"
    },
    {
        id: "TX004",
        type: "Insurance",
        amount: -25.00,
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
        amount: -200.00,
        currency: "USDC",
        counterpartyName: "Education Fund Goal",
        counterpartyLabel: "To",
        date: "2024-01-24 08:55:17",
        fee: 0.10,
        status: "Completed"
    },
    {
        id: "TX006",
        type: "Family Transfer",
        amount: -150.00,
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
        amount: 75.00,
        currency: "USDC",
        counterpartyName: "Refund from LOBSTR Anchor",
        counterpartyLabel: "From",
        date: "2024-01-22 13:15:30",
        fee: 0.00,
        status: "Completed"
    },
    {
        id: "TX008",
        type: "Send Money",
        amount: -320.00,
        currency: "USDC",
        counterpartyName: "Juan Dela Cruz (Philippines)",
        counterpartyLabel: "To",
        date: "2024-01-21 10:42:18",
        fee: 0.40,
        status: "Pending"
    },
    {
        id: "TX009",
        type: "Bill Payment",
        amount: -120.00,
        currency: "USDC",
        counterpartyName: "Water District Payment",
        counterpartyLabel: "To",
        date: "2024-01-20 15:22:55",
        fee: 0.00,
        status: "Failed"
    },
    {
        id: "TX010",
        type: "Smart Split",
        amount: -800.00,
        currency: "USDC",
        counterpartyName: "Smart Split: 4 allocations",
        counterpartyLabel: "To",
        date: "2024-01-19 12:08:33",
        fee: 0.25,
        status: "Completed"
    }
];

export default function TransactionsPage() {
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState("");

    const filteredTransactions = allTransactions.filter(transaction => {
        const query = searchQuery.toLowerCase();
        return (
            transaction.id.toLowerCase().includes(query) ||
            transaction.counterpartyName.toLowerCase().includes(query) ||
            transaction.type.toLowerCase().includes(query) ||
            transaction.amount.toString().includes(query)
        );
    });

    function handleBack() {
        if (typeof window !== "undefined" && window.history.length > 1) {
            // Prefer native history to ensure it works in all environments
            window.history.back();
            return;
        }
        router.push("/dashboard");
    }

    return (
        <main className="min-h-screen bg-[#0A0A0A] text-white font-sans">
            {/* Top Header */}
            <header className="border-b border-[#232323] bg-[#0A0A0A] sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleBack}
                                aria-label="Go back"
                                className="flex items-center justify-center bg-white/10 border border-gray-700 hover:bg-white/20 text-white rounded-xl px-3 py-2"
                                style={{ minWidth: 40, minHeight: 40 }}
                            >
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Transaction History</h1>
                                <p className="text-sm text-gray-500">{filteredTransactions.length} transactions found</p>
                            </div>
                        </div>

                        {/* Right Side Brand */}
                        <Link href="/" className="flex items-center gap-3">
                            <div className="w-8 md:w-10 h-8 md:h-10 flex items-center justify-center">
                                <img src="/logo.svg" alt="RemitWise" className="w-8 md:w-10 h-8 md:h-10" />
                            </div>
                            <span className="text-white text-xl font-bold hidden md:block">RemitWise</span>
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filter Bar Container */}
                <div className="bg-[#141414] border border-[#FFFFFF14] bg-gradient-to-t from-[#0F0F0F] to-[#0A0A0A] rounded-2xl p-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
                    {/* Search Input */}
                    <div className="relative w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-500" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-[#FFFFFF14] rounded-xl leading-5 bg-[#FFFFFF0D] text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-[#1A1A1A] focus:border-[#FF4B26] focus:ring-1 focus:ring-[#FF4B26] sm:text-sm transition-colors"
                            placeholder="Search by ID, recipient, or transaction hash..."
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FFFFFF0D] border border-[#FFFFFF14] rounded-xl transition-colors text-white text-sm font-medium">
                            <Filter className="w-4 h-4" />
                            Filters
                        </button>
                        <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-[#FFFFFF0D] border border-[#FFFFFF14] rounded-xl transition-colors text-white text-sm font-medium">
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                    </div>
                </div>

                {/* Transactions List */}
                <div className="space-y-2.5">
                    {filteredTransactions.length > 0 ? (
                        filteredTransactions.map((transaction) => (
                            <TransactionHistoryItem key={transaction.id} transaction={transaction} />
                        ))
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            No transactions found matching &quot;{searchQuery}&quot;
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
