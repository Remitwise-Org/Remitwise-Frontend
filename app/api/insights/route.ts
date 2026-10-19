import { NextRequest, NextResponse } from "next/server";

/**
 * Financial Insights Aggregation API
 *
 * Supported query params:
 * ?period=current_month
 * ?period=last_3_months
 * ?period=last_year
 *
 * NOTE:
 * Currently uses mock transaction data.
 * Historical persistence not implemented yet.
 */

type Transaction = {
  id: string;
  amount: number;
  type: "spending" | "savings" | "bill" | "insurance";
  category: string;
  date: Date;
};

// Mock Data (Replace with DB later)
const transactions: Transaction[] = [
  {
    id: "1",
    amount: 500,
    type: "spending",
    category: "Food",
    date: new Date("2026-02-01"),
  },
  {
    id: "2",
    amount: 200,
    type: "savings",
    category: "Emergency Fund",
    date: new Date("2026-02-05"),
  },
  {
    id: "3",
    amount: 300,
    type: "bill",
    category: "Electricity",
    date: new Date("2026-01-15"),
  },
  {
    id: "4",
    amount: 150,
    type: "insurance",
    category: "Health Insurance",
    date: new Date("2025-12-10"),
  },
];

function filterByPeriod(period: string, txs: Transaction[]) {
  const now = new Date();

  if (period === "current_month") {
    return txs.filter(
      (t) =>
        t.date.getMonth() === now.getMonth() &&
        t.date.getFullYear() === now.getFullYear()
    );
  }

  if (period === "last_3_months") {
    const past = new Date();
    past.setMonth(now.getMonth() - 3);
    return txs.filter((t) => t.date >= past);
  }

  if (period === "last_year") {
    const past = new Date();
    past.setFullYear(now.getFullYear() - 1);
    return txs.filter((t) => t.date >= past);
  }

  return txs;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "current_month";

  const filtered = filterByPeriod(period, transactions);

  const spendingTotal = filtered
    .filter((t) => t.type === "spending")
    .reduce((sum, t) => sum + t.amount, 0);

  const savingsTotal = filtered
    .filter((t) => t.type === "savings")
    .reduce((sum, t) => sum + t.amount, 0);

  const billsTotal = filtered
    .filter((t) => t.type === "bill")
    .reduce((sum, t) => sum + t.amount, 0);

  const insuranceTotal = filtered
    .filter((t) => t.type === "insurance")
    .reduce((sum, t) => sum + t.amount, 0);

  // Category Breakdown
  const breakdown = filtered.reduce((acc: any, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});

  // Trend Data (Monthly grouping)
  const trend = filtered.reduce((acc: any, t) => {
    const month = `${t.date.getFullYear()}-${t.date.getMonth() + 1}`;
    acc[month] = (acc[month] || 0) + t.amount;
    return acc;
  }, {});

  return NextResponse.json({
    period,
    spendingTotal,
    savingsTotal,
    billsTotal,
    insuranceTotal,
    breakdown,
    trend,
    note:
      "Data currently generated from mock transactions. Historical DB integration pending.",
  });
}