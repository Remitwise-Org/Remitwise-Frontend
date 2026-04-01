
"use client";

import { useState } from "react";
import { FilterIcon, Download } from "lucide-react";
import TransactionHistoryItem, { Transaction } from "@/components/Dashboard/TransactionHistoryItem";
import { useRouter } from "next/navigation";
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
    const router = useRouter();
    const { density } = useDensity();

    const [searchQuery, setSearchQuery] = useState("");

    const filteredTransactions = allTransactions.filter((transaction) => {
        const query = searchTerm.toLowerCase();
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

                        {/* Right Side Brand */}
                        <Link href="/" className="flex items-center gap-3">
                            <div className="w-8 md:w-10 h-8 md:h-10 flex items-center justify-center">
                                <Image src="/logo.svg" alt="RemitWise" width={40} height={40} className="w-8 md:w-10 h-8 md:h-10" />
                            </div>
                            <span className="text-white text-xl font-bold hidden md:block">RemitWise</span>
                        </Link>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Filter Bar Container */}
                <div className="bg-bg1 border border-border bg-gradient-to-t from-bg2 to-bg3 rounded-2xl p-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
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

            <div className="mx-4 md:mx-20 mt-10 pb-10">
                <div className="flex flex-col sm:flex-row justify-center gap-0 sm:gap-4 items-center border border-[#FFFFFF14] bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A] rounded-2xl py-6 px-4">
                    <TransactionHistorySearchInput
                        value={searchTerm}
                        onChange={setSearchTerm}
                        placeholder="Search by ID, recipient, or transaction hash..."
                    />
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-4 sm:mt-0 w-full sm:w-auto">
                        <Button icon={<FilterIcon size={17} className="text-white" />} text="Filters" onclick={handleFilterClick} />
                        <Button icon={<Download size={17} className="text-white" />} text="Export" onclick={handleExportClick} />
                    </div>
                </div>

                {/* Transactions List */}
                <div className={density === 'compact' ? "space-y-1" : "space-y-2.5"}>
                    {filteredTransactions.length > 0 ? (
                        filteredTransactions.map((transaction) => (
                            <TransactionHistoryItem 
                                key={transaction.id} 
                                transaction={transaction} 
                                density={density}
                            />
                        ))
                    ) : (
                        <div className="text-center py-12 text-gray-400">
                            No transactions found matching "{searchTerm}"
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
