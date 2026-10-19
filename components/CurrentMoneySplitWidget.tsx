"use client";

import Link from 'next/link';
import { Settings } from 'lucide-react';
import { useClientLocale } from '@/lib/i18n/client';
import { formatCurrency } from '@/lib/utils/format-currency';

export default function CurrentMoneySplitWidget() {
    const locale = useClientLocale();
    const allocations = [
        { label: 'Daily Spending', amount: 600, percentage: 50 },
        { label: 'Savings', amount: 360, percentage: 30 },
        { label: 'Bills', amount: 180, percentage: 15 },
        { label: 'Insurance', amount: 60, percentage: 5 },
    ];

    return (
        <div className="text-white p-8 rounded-3xl w-full shadow-2xl font-sans relative overflow-hidden border border-[#FFFFFF14] bg-gradient-to-r to-[#1A0505] from-[#0A0A0A] min-h-64">
            {/* Header */}
            <div className="flex justify-between items-end flex-wrap mb-8 relative z-10">
                <div>
                    <h2 className="text-2xl font-bold mb-1 tracking-tight">Current Money Split</h2>
                    <p className="text-gray-500 text-sm font-medium">Automated allocation rules</p>
                </div>
                <Link
                    href="/split"
                    className="group flex items-center gap-2 text-[#DC2626] text-sm font-semibold hover:text-red-400 transition-colors"
                >
                    Configure
                    <Settings className="w-4 h-4 transition-transform group-hover:rotate-90" />
                </Link>
            </div>

            {/* Allocation Rows */}
            <div className="space-y-7 relative z-10">
                {allocations.map((item, index) => (
                    <div key={index} className="group">
                        <div className="flex justify-between items-end mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-[#DC2626] shadow-[0_0_8px_rgba(220,38,38,0.5)]"></div>
                                <span className="font-medium text-sm text-gray-100">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-lg text-white">{formatCurrency(item.amount, 'USD', locale)}</span>
                                <span className="text-gray-600 text-sm font-medium w-8 text-right">{item.percentage}%</span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-[#1F1F1F] rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-[#DC2626] h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(220,38,38,0.3)] relative"
                                style={{ width: `${item.percentage}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between text-sm gap-2 relative z-10">
                <p className="text-gray-500 font-medium">Your remittances are automatically split according to these rules. <Link href="#" className="text-[#DC2626] hover:text-red-400 transition-colors inline-flex items-center gap-1 ml-1 group-hover:underline">
                    Learn more <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
                </Link></p>
            </div>

            {/* Subtle Glow Effect (Optional for that 'premium' feel) */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        </div>
    );
}
