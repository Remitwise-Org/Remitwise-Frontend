'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { TrendingUp, Target, FileText } from 'lucide-react'

// Sample data for the 6-month chart (Jul-Dec)
const chartData = [
    { month: 'Jul', remittances: 2800, savings: 1200, bills: 420, insurance: 80 },
    { month: 'Aug', remittances: 3050, savings: 1350, bills: 400, insurance: 80 },
    { month: 'Sep', remittances: 3200, savings: 1400, bills: 380, insurance: 80 },
    { month: 'Oct', remittances: 2900, savings: 1550, bills: 450, insurance: 80 },
    { month: 'Nov', remittances: 3100, savings: 1480, bills: 420, insurance: 80 },
    { month: 'Dec', remittances: 3400, savings: 1600, bills: 550, insurance: 80 },
]

// Color scheme matching Figma design
const COLORS = {
    remittances: '#DC2626',
    savings: '#B91C1C',
    bills: '#991B1B',
    insurance: '#7F1D1D',
}

interface CustomLegendProps {
    payload?: Array<{
        value: string
        color: string
    }>
}

function CustomLegend({ payload }: CustomLegendProps) {
    return (
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-4">
            {payload?.map((entry, index) => (
                <div key={index} className="flex items-center gap-2">
                    <div
                        className="w-[14px] h-[1.75px]"
                        style={{ backgroundColor: entry.color }}
                    />
                    <span
                        className="text-xs font-normal leading-[18px] capitalize"
                        style={{ color: entry.color }}
                    >
                        {entry.value}
                    </span>
                </div>
            ))}
        </div>
    )
}

interface SummaryCardProps {
    icon: React.ReactNode
    label: string
    value: string
    subtitle: string
    variant?: 'highlight' | 'default'
    valueColor?: string
}

function SummaryCard({ icon, label, value, subtitle, variant = 'default', valueColor }: SummaryCardProps) {
    const isHighlight = variant === 'highlight'

    return (
        <div
            className={`flex flex-col items-start gap-2 pt-[17px] px-[17px] pb-[1px] rounded-[14px] ${isHighlight
                ? 'bg-[rgba(220,38,38,0.1)] border border-[rgba(220,38,38,0.2)]'
                : 'bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)]'
                }`}
        >
            {/* Label row */}
            <div className="flex items-center gap-2">
                <div className={isHighlight ? 'text-[#DC2626]' : 'text-[rgba(255,255,255,0.6)]'}>
                    {icon}
                </div>
                <span
                    className={`text-xs font-semibold leading-4 ${isHighlight ? 'text-[#DC2626]' : 'text-[rgba(255,255,255,0.6)]'
                        }`}
                >
                    {label}
                </span>
            </div>

            {/* Value */}
            <div
                className="text-xl font-bold leading-7 tracking-[-0.45px]"
                style={{ color: valueColor || (isHighlight ? '#FFFFFF' : '#FFFFFF') }}
            >
                {value}
            </div>

            {/* Subtitle */}
            <div className="text-xs font-normal leading-4 text-[rgba(255,255,255,0.6)]">
                {subtitle}
            </div>
        </div>
    )
}

export default function SixMonthTrendsWidget() {
    return (
        <div
            className="flex flex-col items-start pt-[25px] px-[25px] pb-[16px] gap-6 rounded-2xl border border-[rgba(255,255,255,0.08)] w-full max-w-[928px]"
            style={{
                background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)'
            }}
        >
            {/* Header */}
            <div className="flex flex-row items-center justify-between gap-4 w-full">
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        {/* Trend Icon - matching Figma exactly */}
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path
                                d="M2 15L6 11L10 14L18 5"
                                stroke="#DC2626"
                                strokeWidth="1.67"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            <path
                                d="M14 5H18V9"
                                stroke="#DC2626"
                                strokeWidth="1.67"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        <h2 className="text-xl font-bold leading-7 tracking-[-0.45px] text-white">
                            6-Month Trends
                        </h2>
                    </div>
                    <p className="text-sm font-normal leading-5 tracking-[-0.15px] text-[rgba(255,255,255,0.5)]">
                        Track your financial patterns
                    </p>
                </div>

                {/* View Details Button */}
                <button
                    className="h-[30px] px-[13px] text-xs font-semibold leading-4 text-white bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-[10px] hover:bg-[rgba(255,255,255,0.1)] transition-colors shrink-0 whitespace-nowrap"
                >
                    View Details
                </button>
            </div>

            {/* Line Chart - 320px height */}
            <div className="w-full h-[280px] sm:h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255, 255, 255, 0.063)"
                            vertical={true}
                        />
                        <XAxis
                            dataKey="month"
                            axisLine={{ stroke: 'rgba(255, 255, 255, 0.25)' }}
                            tickLine={{ stroke: 'rgba(255, 255, 255, 0.25)' }}
                            tick={{ fill: 'rgba(255, 255, 255, 0.376)', fontSize: 12, fontWeight: 400 }}
                        />
                        <YAxis
                            axisLine={{ stroke: 'rgba(255, 255, 255, 0.25)' }}
                            tickLine={{ stroke: 'rgba(255, 255, 255, 0.25)' }}
                            tick={{ fill: 'rgba(255, 255, 255, 0.376)', fontSize: 12, fontWeight: 400 }}
                            tickFormatter={(value) => `$${value}`}
                            domain={[0, 3400]}
                            ticks={[0, 850, 1700, 2550, 3400]}
                            width={45}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1a1a1a',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                color: '#fff'
                            }}
                            labelStyle={{ color: '#fff' }}
                            formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
                        />
                        <Legend content={<CustomLegend />} />
                        <Line
                            type="monotone"
                            dataKey="remittances"
                            stroke={COLORS.remittances}
                            strokeWidth={3}
                            dot={{ fill: COLORS.remittances, stroke: COLORS.remittances, strokeWidth: 3, r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="savings"
                            stroke={COLORS.savings}
                            strokeWidth={3}
                            dot={{ fill: COLORS.savings, stroke: COLORS.savings, strokeWidth: 3, r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="bills"
                            stroke={COLORS.bills}
                            strokeWidth={3}
                            dot={{ fill: COLORS.bills, stroke: COLORS.bills, strokeWidth: 3, r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="insurance"
                            stroke={COLORS.insurance}
                            strokeWidth={3}
                            dot={{ fill: COLORS.insurance, stroke: COLORS.insurance, strokeWidth: 3, r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Summary Cards Section */}
            <div className="w-full border-t border-[rgba(255,255,255,0.08)] pt-[25px]">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <SummaryCard
                        icon={<TrendingUp className="w-4 h-4" />}
                        label="Highest Month"
                        value="Dec 2025"
                        subtitle="$5,630 total"
                        variant="highlight"
                    />
                    <SummaryCard
                        icon={<Target className="w-4 h-4" />}
                        label="Average"
                        value="$5,395"
                        subtitle="Per month"
                    />
                    <SummaryCard
                        icon={<FileText className="w-4 h-4" />}
                        label="Growth"
                        value="+15.7%"
                        subtitle="vs. Jul 2025"
                        valueColor="#DC2626"
                    />
                </div>
            </div>
        </div>
    )
}
