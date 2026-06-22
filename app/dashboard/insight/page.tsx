import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import SixMonthTrendsWidget from '@/components/Dashboard/SixMonthTrendsWidget'

export default function InsightPage() {
    return (
        <div
            className="min-h-screen p-4 sm:p-6 lg:p-8"
            style={{ background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)' }}
        >
            <div className="max-w-[928px] mx-auto space-y-6">
                <SixMonthTrendsWidget />

                {/* Link out to the full insights experience instead of duplicating it here */}
                <div className="flex justify-end">
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
    )
}
