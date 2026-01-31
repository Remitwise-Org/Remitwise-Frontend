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

const recentTransactions: Transaction[] = [
  {
    id: "TX001",
    type: "Send Money",
    amount: -500.00,
    currency: "USDC",
    counterpartyName: "Maria Santos (Philippines)",
    counterpartyLabel: "To",
    date: "2024-01-28 14:32:15",
    fee: 0.50,
    status: "Completed"
  },
  {
    id: "TX002",
    type: "Smart Split",
    amount: -1200.00,
    currency: "USDC",
    counterpartyName: "Smart Split: 4 allocations",
    counterpartyLabel: "To",
    date: "2024-01-27 09:15:42",
    fee: 0.30,
    status: "Completed"
  },
  {
    id: "TX003",
    type: "Bill Payment",
    amount: -85.50,
    currency: "USDC",
    counterpartyName: "Manila Electric Company",
    counterpartyLabel: "To",
    date: "2024-01-26 16:45:23",
    fee: 0.10,
    status: "Completed"
  },
  {
    id: "TX004",
    type: "Insurance",
    amount: -25.00,
    currency: "USDC",
    counterpartyName: "HealthGuard Insurance Premium",
    counterpartyLabel: "To",
    date: "2024-01-25 11:20:05",
    fee: 0.05,
    status: "Completed"
  },
  {
    id: "TX005",
    type: "Savings",
    amount: -200.00,
    currency: "USDC",
    counterpartyName: "Education Fund Goal",
    counterpartyLabel: "To",
    date: "2024-01-24 08:55:17",
    fee: 0.10,
    status: "Completed"
  },
  {
    id: "TX006",
    type: "Family Transfer",
    amount: -150.00,
    currency: "USDC",
    counterpartyName: "Carlos Santos (Son)",
    counterpartyLabel: "To",
    date: "2024-01-23 19:30:44",
    fee: 0.15,
    status: "Completed"
  },
  {
    id: "TX007",
    type: "Received",
    amount: 75.00,
    currency: "USDC",
    counterpartyName: "Refund from LOBSTR Anchor",
    counterpartyLabel: "From",
    date: "2024-01-22 13:15:30",
    fee: 0.00,
    status: "Completed"
  },
  {
    id: "TX008",
    type: "Send Money",
    amount: -320.00,
    currency: "USDC",
    counterpartyName: "Juan Dela Cruz (Philippines)",
    counterpartyLabel: "To",
    date: "2024-01-21 10:42:18",
    fee: 0.40,
    status: "Pending"
  },
  {
    id: "TX009",
    type: "Bill Payment",
    amount: -120.00,
    currency: "USDC",
    counterpartyName: "Water District Payment",
    counterpartyLabel: "To",
    date: "2024-01-20 15:22:55",
    fee: 0.00,
    status: "Failed"
  },
  {
    id: "TX010",
    type: "Smart Split",
    amount: -800.00,
    currency: "USDC",
    counterpartyName: "Smart Split: 4 allocations",
    counterpartyLabel: "To",
    date: "2024-01-19 12:08:33",
    fee: 0.25,
    status: "Completed"
  }
];

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
            detail1="+$300"
            detail1Color="text-red-500"
            detail2="+25%"
            icon={<Send className="w-5 h-5" />}
            showTrend={true}
          />
          <StatCard
            title="Savings"
            value="$360"
            detail1="+$90"
            detail1Color="text-red-500"
            detail2="+33%"
            icon={<PiggyBank className="w-5 h-5" />}
            showTrend={true}
          />
          <StatCard
            title="Bills Paid"
            value="$180"
            detail1="3 bills"
            detail2="This month"
            icon={<FileText className="w-5 h-5" />}
          />
          <StatCard
            title="Insurance"
            value="$60"
            detail1="2 policies"
            detail2="Active"
            icon={<Shield className="w-5 h-5" />}
          />
        </div>

        {/* Money Split Visualization */}
        {/* Money Split Visualization */}
        <div className="mb-8">
          <CurrentMoneySplitWidget />
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
            {recentTransactions.map((transaction) => (
              <TransactionHistoryItem key={transaction.id} transaction={transaction} />
            ))}
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
