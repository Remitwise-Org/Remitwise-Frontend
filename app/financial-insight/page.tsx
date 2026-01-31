import Link from "next/link";
import {
    ArrowLeft,
    Send,
    PiggyBank,
    FileText,
    Shield,
} from "lucide-react";
import StatCard from "@/components/Dashboard/StatCard";

export default function FinancialInsight() {
    return (
        <div className="min-h-screen bg-[#0A0A0A]">
            {/* Header */}
            <header className="bg-[#0A0A0A] border-b border-[#FFFFFF14]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center space-x-4">
                        <Link
                            href="/dashboard"
                            className="text-white hover:text-gray-300 transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </Link>
                        <h1 className="text-2xl font-bold text-white">
                            Financial Insights
                        </h1>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <h2 className="text-xl font-semibold text-gray-400 mb-8">Summary Overview</h2>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Total Remittances"
                        value="$3,240"
                        percentage="+18%"
                        icon={<Send className="w-5 h-5" />}
                    />
                    <StatCard
                        title="Total Saved"
                        value="$1,580"
                        percentage="+24%"
                        icon={<PiggyBank className="w-5 h-5" />}
                    />
                    <StatCard
                        title="Bills Paid"
                        value="$685"
                        percentage="+5%"
                        icon={<FileText className="w-5 h-5" />}
                    />
                    <StatCard
                        title="Insurance Premiums"
                        value="$125"
                        percentage="0%"
                        icon={<Shield className="w-5 h-5" />}
                        trend="none"
                    />
                </div>
            </main>
        </div>
    );
}
