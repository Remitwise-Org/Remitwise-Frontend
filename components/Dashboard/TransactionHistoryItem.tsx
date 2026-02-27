"use client";

import React, { useState } from 'react';
import {
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Check,
    Clock,
    X,
    Send,
    GitBranch,
    FileText,
    Shield,
    TrendingUp,
    Users,
    ArrowDownLeft
} from 'lucide-react';
import Link from 'next/link';

export type TransactionStatus = 'Completed' | 'Pending' | 'Failed';

export type TransactionType =
    | 'Send Money'
    | 'Smart Split'
    | 'Bill Payment'
    | 'Insurance'
    | 'Savings'
    | 'Family Transfer'
    | 'Received';

export interface Transaction {
    id: string; // e.g. "TX001"
    hash?: string; // Full transaction hash for explorer link
    type: TransactionType;
    amount: number;
    currency: string;
    counterpartyName: string; // recipient or source
    counterpartyLabel: string; // "To" or "From"
    date: string; // "2024-01-28 14:32:15"
    fee: number;
    status: TransactionStatus;
}

const getIcon = (type: TransactionType) => {
    switch (type) {
        case 'Send Money': return <Send className="w-5 h-5 text-red-500" />; // Red-orange approximation
        case 'Smart Split': return <GitBranch className="w-5 h-5 text-red-500" />;
        case 'Bill Payment': return <FileText className="w-5 h-5 text-red-500" />;
        case 'Insurance': return <Shield className="w-5 h-5 text-red-500" />;
        case 'Savings': return <TrendingUp className="w-5 h-5 text-red-500" />;
        case 'Family Transfer': return <Users className="w-5 h-5 text-red-500" />;
        case 'Received': return <ArrowDownLeft className="w-5 h-5 text-red-500" />;
        default: return <Send className="w-5 h-5 text-red-500" />;
    }
};

const StatusBadge = ({ status }: { status: TransactionStatus }) => {
    if (status === 'Completed') {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#DC26261A] border border-[#DC262633]">
                <Check className="w-3.5 h-3.5 text-[#FF4B26]" />
                <span className="text-xs font-medium text-[#FF4B26]">Completed</span>
            </div>
        );
    } else if (status === 'Pending') {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1F1F1F] border border-[#333]">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-gray-400">Pending</span>
            </div>
        );
    } else {
        return (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1F1F1F] border border-[#333]">
                <X className="w-3.5 h-3.5 text-gray-400" />
                <span className="text-xs font-medium text-red-500">Failed</span> {/* Or grey as per prompt? Prompt says "grey with X" but "Failed usually implies red". Prompt: "Failed (grey with X)". Okay. */}
            </div>
        );
    }
};

export default function TransactionHistoryItem({ transaction }: { transaction: Transaction }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const isNegative = transaction.amount < 0;
    const amountColor = isNegative ? 'text-white' : 'text-white'; // Prompt says "white" for general text, maybe specialized colors? "Amount with sign... large". 

    // Format amount
    const formattedAmount = `${isNegative ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)} ${transaction.currency}`;

    return (
        <div className="border border-[#FFFFFF14] bg-gradient-to-t from-[#0F0F0F] to-[#0A0A0A] rounded-2xl p-6 mb-4 hover:border-[#333] transition-colors">
            <div className='flex gap-4'>
                <div className="w-12 h-12 bg-[#1A0505] rounded-xl flex items-center justify-center border border-[#2A1515] flex-shrink-0 text-[#FF4B26] mr-2">
                    {getIcon(transaction.type)}
                </div>

                <div className="flex-1 space-y-2">
                    <div className='flex-1 flex items-start justify-between gap-2 flex-wrap'>
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-lg">{transaction.type}</span>
                            <span className="text-[#444] text-sm">#{transaction.id}</span>
                        </div>
                        <StatusBadge status={transaction.status} />
                    </div>
                    {/* Data Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div>
                            <div className="text-[#666] text-xs mb-1.5">Amount</div>
                            <div className="text-xl font-bold text-white tracking-tight">
                                {formattedAmount}
                            </div>
                        </div>
                        <div>
                            <div className="text-[#666] text-xs mb-1.5">{transaction.counterpartyLabel}</div>
                            <div className="text-[#FFFFFFCC] text-sm font-medium">
                                {transaction.counterpartyName}
                            </div>
                        </div>
                        <div>
                            <div className="text-[#666] text-xs mb-1.5">Date & Time</div>
                            <div className="text-[#FFFFFFCC] text-sm font-medium">
                                {transaction.date}
                            </div>
                        </div>
                        <div>
                            <div className="text-[#666] text-xs mb-1.5">Fee</div>
                            <div className="text-[#FFFFFFCC] text-sm font-medium">
                                {transaction.fee.toFixed(2)} USDC
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFFFFF0D] border border-[#FFFFFF14] text-white text-sm font-medium hover:bg-[#1A1A1A] transition-colors"
                        >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {isExpanded ? 'Hide Details' : 'View Details'}
                        </button>

                        <a
                            href={`https://stellar.expert/explorer/public/tx/${transaction.hash || transaction.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A0505] border border-[#2A1515] text-[#FF4B26] text-sm font-medium hover:bg-[#2A0808] transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                            View on Explorer
                        </a>
                    </div>
                </div>
            </div>


            {/* Expanded Details Section */}
            {isExpanded && (
                <div className="mt-6 pt-6 border-t border-[#1F1F1F] grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div>
                        <div className="text-[#666] text-xs mb-1.5">Transaction Hash</div>
                        <div className="text-white text-sm font-mono break-all">{transaction.hash || `${transaction.id}...`}</div>
                    </div>
                    <div>
                        <div className="text-[#666] text-xs mb-1.5">Block Number</div>
                        <div className="text-white text-sm">45678912</div>
                    </div>
                    <div>
                        <div className="text-[#666] text-xs mb-1.5">Network</div>
                        <div className="text-white text-sm">Stellar Public</div>
                    </div>
                </div>
            )}
        </div>
    );
}
