'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { apiClient } from '@/lib/client/apiClient';
import { CategoryDonutChart, type CategoryDataPoint } from '@/components/Insights/categoryDonutChart';
import { RemittanceTrendChart, type TrendDataPoint } from '@/components/Insights/remittanceTrendChart';
import { WidgetErrorState, WidgetEmptyState } from '@/components/ui/WidgetStates';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/utils/format-currency';

type Period = 'current_month' | 'last_3_months' | 'last_year';

interface InsightsResponse {
    period: string;
    spendingTotal: number;
    savingsTotal: number;
    billsTotal: number;
    insuranceTotal: number;
    breakdown: Record<string, number>;
    trend: Record<string, number>;
}

export default function InsightPage() {
    const [period, setPeriod] = useState<Period>('current_month');
    const [data, setData] = useState<InsightsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setError(null);

        apiClient.getJson<InsightsResponse>(`/api/insights?period=${period}`, {
            signal: controller.signal
        })
            .then((res) => {
                setData(res);
                setLoading(false);
            })
            .catch((err) => {
                if (err.name === 'AbortError') return;
                setError(err);
                setLoading(false);
            });

        return () => controller.abort();
    }, [period]);

    const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPeriod(e.target.value as Period);
    };

    let content;

    if (loading) {
        content = (
            <div className="grid gap-6 md:grid-cols-2">
                <SkeletonCard variant="chart" />
                <SkeletonCard variant="chart" />
            </div>
        );
    } else if (error) {
        content = (
            <WidgetErrorState
                title="Failed to load insights"
                message={error.message || "An unexpected error occurred."}
                onRetry={() => setPeriod(period)}
            />
        );
    } else if (!data) {
        content = <WidgetEmptyState title="No data available" message="Try selecting a different period." />;
    } else {
        const totalAmount = data.spendingTotal + data.savingsTotal + data.billsTotal + data.insuranceTotal;
        
        if (totalAmount === 0) {
            content = <WidgetEmptyState title="No activity" message="You have no transactions in this period." />;
        } else {
            const breakdownData: CategoryDataPoint[] = Object.entries(data.breakdown || {})
                .map(([name, amount]) => {
                    const numAmount = Number(amount);
                    return {
                        name,
                        amount: numAmount,
                        percentage: Math.round((numAmount / totalAmount) * 100) || 0
                    };
                })
                .sort((a, b) => b.amount - a.amount);

            const trendData: TrendDataPoint[] = Object.entries(data.trend || {})
                .map(([date, amount]) => ({
                    date,
                    amount: Number(amount),
                    transactions: 1 // API does not provide transaction counts yet
                }))
                .sort((a, b) => a.date.localeCompare(b.date));

            content = (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                            { label: 'Spending', value: data.spendingTotal },
                            { label: 'Savings', value: data.savingsTotal },
                            { label: 'Bills', value: data.billsTotal },
                            { label: 'Insurance', value: data.insuranceTotal },
                        ].map(stat => (
                            <div key={stat.label} className="bg-black/40 border border-white/10 rounded-2xl p-4">
                                <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                                <p className="text-white font-semibold text-lg">{formatCurrency(stat.value, 'USD')}</p>
                            </div>
                        ))}
                    </div>
                    
                    <div className="grid gap-6 lg:grid-cols-2 items-start">
                        <CategoryDonutChart data={breakdownData} />
                        <RemittanceTrendChart data={trendData} />
                    </div>
                </div>
            );
        }
    }

    return (
        <div
            className="min-h-screen p-4 sm:p-6 lg:p-8"
            style={{ background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)' }}
        >
            <div className="max-w-[928px] mx-auto space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <h1 className="text-2xl font-bold text-white tracking-tight">Financial Insights</h1>
                    <select
                        aria-label="Select period"
                        value={period}
                        onChange={handlePeriodChange}
                        className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-brand-red/50"
                    >
                        <option value="current_month">Current Month</option>
                        <option value="last_3_months">Last 3 Months</option>
                        <option value="last_year">Last Year</option>
                    </select>
                </div>

                {content}

                <div className="flex justify-end mt-8">
                    <Link
                        href="/financial-insights"
                        className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-red/10 border border-brand-red/20 text-sm font-medium text-brand-red hover:bg-brand-red/20 transition-all"
                    >
                        View full financial insights
                        <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
