import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  File,
  FileTextIcon,
} from "lucide-react";
import GoalProgress from "@/components/Dashboard/GoalProgress";
import SplitBar from "@/components/Dashboard/SplitBar";
import StatCard from "@/components/Dashboard/StatCard";
import TransactionItem from "@/components/Dashboard/TransactionItem";

export default function Dashboard() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-(--background) shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-(--foreground) hover:text-(--foreground)"
            >
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-2xl font-bold text-(--foreground)">
              Dashboard
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Sent"
            value="$1,200"
            change="+$300 this month"
            icon={<DollarSign className="w-6 h-6" />}
            trend="up"
          />
          <StatCard
            title="Savings"
            value="$360"
            change="+$90 this month"
            icon={<PiggyBank className="w-6 h-6" />}
            trend="up"
          />
          <StatCard
            title="Bills Paid"
            value="$180"
            change="3 bills this month"
            icon={<TrendingUp className="w-6 h-6" />}
            trend="neutral"
          />
          <StatCard
            title="Insurance"
            value="$60"
            change="2 active policies"
            icon={<TrendingDown className="w-6 h-6" />}
            trend="neutral"
          />
        </div>

        {/* Money Split Visualization */}
        <div
          className="rounded-xl shadow-md p-6 mb-8"
          style={{ backgroundImage: "var(--card)" }}
        >
          <h2 className="text-xl font-bold text-(--foreground) mb-4">
            Current Money Split
          </h2>
          <div className="space-y-4">
            <SplitBar
              label="Daily Spending"
              amount={150}
              percentage={50}
              color="bg-blue-500"
            />
            <SplitBar
              label="Savings"
              amount={90}
              percentage={30}
              color="bg-green-500"
            />
            <SplitBar
              label="Bills"
              amount={45}
              percentage={15}
              color="bg-yellow-500"
            />
            <SplitBar
              label="Insurance"
              amount={15}
              percentage={5}
              color="bg-purple-500"
            />
          </div>
          <div className="mt-6">
            <Link
              href="/split"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              Configure Split Settings →
            </Link>
          </div>
        </div>

        {/* Recent Transactions */}
        <div
          className="rounded-xl shadow-md p-6 mb-8"
          style={{ backgroundImage: "var(--card)" }}
        >
          <h2 className="text-xl font-bold text-(--foreground) mb-4">
            Recent Transactions
          </h2>
          <div className="space-y-4">
            <TransactionItem
              date="2024-01-15"
              description="Remittance to Family"
              amount="$300"
              status="completed"
            />
            <TransactionItem
              date="2024-01-10"
              description="Bill Payment - Electricity"
              amount="$50"
              status="completed"
            />
            <TransactionItem
              date="2024-01-08"
              description="Savings Goal - Education"
              amount="$100"
              status="completed"
            />
          </div>
          <div className="mt-6">
            <Link
              href="/transactions"
              className="text-blue-600 hover:text-blue-700 font-semibold"
            >
              View All Transactions →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Savings Goals Progress */}
          <div
            className="rounded-2xl shadow-md p-6 border border-[#FFFFFF14] hover:border-white/30 transition-colors duration-300"
            style={{ backgroundImage: "var(--card)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span>
                <PiggyBank className="w-6 h-6 text-[var(--accent)]" />
              </span>
              <h2 className="text-xl font-bold text-(--foreground)">
                Savings by Goals
              </h2>
            </div>
            <div className="space-y-4">
              <GoalProgress
                name="Emergency Fund"
                current={331.2}
                target={720}
                gradient={{ from: "#B91C1C", to: "#991B1B" }}
              />
              <GoalProgress
                name="Education Fund"
                current={194}
                target={550}
                gradient={{ from: "#991B1B", to: "#7F1D1D" }}
              />
              <GoalProgress
                name="Medical Fund"
                current={58.9}
                target={310}
                gradient={{ from: "#7F1D1D", to: "#5F1515" }}
              />
            </div>
          </div>

          {/* Bills by Type */}
          <div
            className="rounded-2xl shadow-md p-6 border border-[#FFFFFF14] hover:border-white/30 transition-colors duration-300"
            style={{ backgroundImage: "var(--card)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span>
                <FileTextIcon className="w-6 h-6 text-[var(--accent)]" />
              </span>
              <h2 className="text-xl font-bold text-(--foreground)">
                Bills by Type
              </h2>
            </div>
            <div className="space-y-4">
              <GoalProgress
                name="Electricity"
                current={133}
                target={285}
                gradient={{ from: "#991B1B", to: "#7F1D1D" }}
              />
              <GoalProgress
                name="Water"
                current={48}
                target={180}
                gradient={{ from: "#7F1D1D", to: "#5F1515" }}
              />
              <GoalProgress
                name="Internet"
                current={22}
                target={120}
                gradient={{ from: "#5F1515", to: "#4F1111" }}
              />
              <GoalProgress
                name="Phone"
                current={14}
                target={100}
                gradient={{ from: "#5F1515", to: "#4F1111" }}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
