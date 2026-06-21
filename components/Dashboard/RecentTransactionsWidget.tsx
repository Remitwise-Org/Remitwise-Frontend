"use client";

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import { Check, Clock, X, ChevronRight, ArrowLeftRight } from 'lucide-react';
import { useDensity } from '@/lib/context/DensityContext';
import WidgetEmptyState from '@/components/ui/WidgetEmptyState';
import WidgetErrorState from '@/components/ui/WidgetErrorState';

type TransactionStatus = 'Completed' | 'Pending' | 'Failed';

interface Transaction {
    id: string;
    date: string;
    description: string;
    category: string;
    amount: string;
    status: TransactionStatus;
}

const mockTransactions: Transaction[] = [
    {
        id: '1',
        date: 'Jan 28, 2026',
        description: 'Remittance to Philippines',
        category: 'Transfer',
        amount: '$300.00',
        status: 'Completed',
    },
    {
        id: '2',
        date: 'Jan 25, 2026',
        description: 'Electricity Bill Payment',
        category: 'Bill',
        amount: '$60.00',
        status: 'Completed',
    },
    {
        id: '3',
        date: 'Jan 22, 2026',
        description: 'Insurance Premium',
        category: 'Insurance',
        amount: '$30.00',
        status: 'Pending',
    },
    {
        id: '4',
        date: 'Jan 20, 2026',
        description: 'School Fees Payment',
        category: 'Bill',
        amount: '$120.00',
        status: 'Completed',
    },
    {
        id: '5',
        date: 'Jan 18, 2026',
        description: 'Remittance to India',
        category: 'Transfer',
        amount: '$250.00',
        status: 'Failed',
    }
];

const StatusBadge = ({ status }: { status: TransactionStatus }) => {
    const configs = {
        Completed: {
            icon: Check,
            color: 'text-[#DC2626]',
            bgColor: 'bg-[#DC2626]/10',
            borderColor: 'border-[#DC2626]/20',
        },
        Pending: {
            icon: Clock,
            color: 'text-gray-400',
            bgColor: 'bg-gray-400/10',
            borderColor: 'border-gray-400/20',
        },
        Failed: {
            icon: X,
            color: 'text-[#DC2626]',
            bgColor: 'bg-[#DC2626]/10',
            borderColor: 'border-[#DC2626]/20',
        },
    };

    const { icon: Icon, color, bgColor, borderColor } = configs[status];

    return (
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border ${bgColor} ${borderColor} ${color}`}>
            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="text-xs font-medium">{status}</span>
        </div>
    );
};

interface RecentTransactionsWidgetProps {
    /** Pass an empty array to show the empty state */
    transactions?: Transaction[];
    /** Pass true to show the error state */
    hasError?: boolean;
}

const RecentTransactionsWidget = ({
    transactions = mockTransactions,
    hasError = false,
}: RecentTransactionsWidgetProps) => {
    const { density } = useDensity();
    const isCompact = density === 'compact';
    const [retryKey, setRetryKey] = useState(0);
    const handleRetry = useCallback(() => setRetryKey((k) => k + 1), []);

    const isEmpty = !hasError && transactions.length === 0;

    return (
        <div key={retryKey} className="bg-[#0A0A0A] rounded-2xl border border-white/10 p-6 w-full">
            <div className={`flex justify-between items-start ${isCompact ? 'mb-4' : 'mb-8'}`}>
                <div>
                    <h2 className="text-xl font-bold text-white mb-1">Recent Transactions</h2>
                    <p className="text-sm text-gray-400">
                        {isEmpty || hasError ? 'Your latest activity' : 'Last 5 activities'}
                    </p>
                </div>
                {!isEmpty && !hasError && (
                    <Link
                        href="/transactions"
                        className="text-[#DC2626] text-sm font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
                    >
                        View All <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                )}
            </div>

            {hasError ? (
                <WidgetErrorState
                    message="We couldn't load your transactions. Please try again."
                    onRetry={handleRetry}
                />
            ) : isEmpty ? (
                <WidgetEmptyState
                    icon={ArrowLeftRight}
                    title="No transactions yet"
                    description="Send money to a recipient and your activity will appear here."
                    ctaLabel="Send money"
                    ctaHref="/send"
                />
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-gray-500 text-sm font-medium border-b border-white/5">
                                    <th className="pb-4 font-medium">Date</th>
                                    <th className="pb-4 font-medium">Description</th>
                                    <th className="pb-4 font-medium text-center">Category</th>
                                    <th className="pb-4 font-medium text-right">Amount</th>
                                    <th className="pb-4 font-medium text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {transactions.map((tx) => (
                                    <tr key={tx.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className={`${isCompact ? 'py-2' : 'py-4'} text-sm text-gray-400`}>{tx.date}</td>
                                        <td className={`${isCompact ? 'py-2' : 'py-4'} text-sm font-bold text-white`}>{tx.description}</td>
                                        <td className={`${isCompact ? 'py-2' : 'py-4'} text-center`}>
                                            <span className="inline-block px-3 py-1 rounded-full bg-white/5 text-gray-400 text-xs">
                                                {tx.category}
                                            </span>
                                        </td>
                                        <td className={`${isCompact ? 'py-2' : 'py-4'} text-sm font-bold text-white text-right`}>{tx.amount}</td>
                                        <td className={`${isCompact ? 'py-2' : 'py-4'} text-right flex justify-end`}>
                                            <StatusBadge status={tx.status} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className={`md:hidden ${isCompact ? 'space-y-2' : 'space-y-4'}`}>
                        {transactions.map((tx) => (
                            <div key={tx.id} className={`bg-white/[0.03] rounded-xl border border-white/5 ${isCompact ? 'p-3' : 'p-5'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-base font-bold text-white leading-tight pr-4">{tx.description}</h3>
                                    <div className="flex-shrink-0">
                                        <StatusBadge status={tx.status} />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                                    <span>{tx.date}</span>
                                    <span className="w-1 h-1 rounded-full bg-gray-600" aria-hidden="true" />
                                    <span>{tx.category}</span>
                                </div>

                                <div className="text-xl font-bold text-white">
                                    {tx.amount}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default RecentTransactionsWidget;
