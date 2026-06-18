import SixMonthTrendsWidget from '@/components/dashboard/SixMonthTrendsWidget'
export default function InsightPage() {
    return (
        <div
            className="min-h-screen p-4 sm:p-6 lg:p-8"
            style={{ background: 'linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)' }}
        >
            <div className="max-w-[928px] mx-auto">
                <SixMonthTrendsWidget />
            </div>
        </div>
    )
}
