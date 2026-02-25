import Link from "next/link";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  PiggyBank,
  Send,
  File,
  FileText,
  Shield,
} from "lucide-react";
import CurrentMoneySplitWidget from '@/components/CurrentMoneySplitWidget'
import GoalProgress from "@/components/Dashboard/GoalProgress";
import SplitBar from "@/components/Dashboard/SplitBar";
import StatCard from "@/components/Dashboard/StatCard";

import SavingsByGoalWidget from "@/components/Dashboard/SavingsByGoalWidget";
import TransactionHistoryItem, { Transaction } from "@/components/Dashboard/TransactionHistoryItem";
import MoneyDistributionWidget from "@/components/Dashboard/MoneyDistributionWidget";
import RecentTransactionsWidget from "@/components/Dashboard/RecentTransactionsWidget";
import QuickActions from "@/components/Dashboard/QuickActions";


import DashboardHeader from "@/components/Dashboard/DashboardHeader";

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#141414]">
      {/* Header */}
      <DashboardHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Sent"
            value="$1,200"
            percentage="+25%"
            icon={<Send className="w-5 h-5" />}
          />
          <StatCard
            title="Savings"
            value="$360"
            percentage="+33%"
            icon={<PiggyBank className="w-5 h-5" />}
          />
          <StatCard
            title="Bills Paid"
            value="$180"
            percentage="0%"
            icon={<FileText className="w-5 h-5" />}
            trend="none"
          />
          <StatCard
            title="Insurance"
            value="$60"
            percentage="0%"
            icon={<Shield className="w-5 h-5" />}
            trend="none"
          />
        </div>

        {/* Quick Actions Panel */}
        <div className="mb-8">
          <QuickActions />
        </div>

        {/* Money Split Visualization */}
        <div className="mb-8">
          <CurrentMoneySplitWidget />
        </div>
        <div className="mb-8">
          <MoneyDistributionWidget />
        </div>

        {/* Recent Transactions */}
        <div className="mb-8">
          <RecentTransactionsWidget />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Savings Goals Progress */}
          <SavingsByGoalWidget />

          {/* Bills by Type */}
          <div
            className="rounded-2xl shadow-md p-6 border border-[#FFFFFF14] hover:border-white/30 transition-colors duration-300"
            style={{ backgroundImage: "var(--card)" }}
          >
            <div className="flex items-center gap-2 mb-4">
              <span>
                <FileText className="w-6 h-6 text-[var(--accent)]" />
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
