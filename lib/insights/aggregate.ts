import { format, isAfter, isBefore, isValid, parseISO, startOfMonth, subMonths } from 'date-fns';
import type { Bill } from '@/lib/contracts/bill-payments';
import type { SavingsGoal } from '@/lib/contracts/savings-goal';
import type { Policy } from '@/lib/contracts/insurance';
import type { TransactionItem } from '@/lib/remittance/horizon';

export type InsightsPeriod = 'current_month' | 'last_3_months' | 'last_year';

export const INSIGHTS_PERIODS: readonly InsightsPeriod[] = [
  'current_month',
  'last_3_months',
  'last_year',
];

export function isInsightsPeriod(value: string): value is InsightsPeriod {
  return INSIGHTS_PERIODS.some((period) => period === value);
}

export interface InsightsAggregateInput {
  address: string;
  period: InsightsPeriod;
  payments: readonly TransactionItem[];
  bills: readonly Bill[];
  policies: readonly Policy[];
  goals: readonly SavingsGoal[];
  now?: Date;
}

export interface InsightsAggregate {
  period: InsightsPeriod;
  spendingTotal: number;
  savingsTotal: number;
  billsTotal: number;
  unpaidBillsTotal: number;
  insuranceTotal: number;
  counts: {
    payments: number;
    paidBills: number;
    unpaidBills: number;
    activePolicies: number;
    savingsGoals: number;
  };
  breakdown: Record<string, number>;
  trend: Record<string, number>;
  trendCounts: Record<string, number>;
}

function periodStart(period: InsightsPeriod, now: Date): Date {
  switch (period) {
    case 'current_month':
      return startOfMonth(now);
    case 'last_3_months':
      return startOfMonth(subMonths(now, 2));
    case 'last_year':
      return startOfMonth(subMonths(now, 11));
  }
}

function parsedDate(value: string): Date | null {
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

function amountOrZero(value: number | string): number {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function roundAmount(value: number): number {
  return Math.round((value + Number.EPSILON) * 10_000_000) / 10_000_000;
}

export function aggregateInsights({
  address,
  period,
  payments,
  bills,
  policies,
  goals,
  now = new Date(),
}: InsightsAggregateInput): InsightsAggregate {
  const start = periodStart(period, now);
  const inPeriod = (value: string): Date | null => {
    const date = parsedDate(value);
    if (!date || isBefore(date, start) || isAfter(date, now)) return null;
    return date;
  };

  const breakdown: Record<string, number> = {};
  const trend: Record<string, number> = {};
  const trendCounts: Record<string, number> = {};
  let spendingTotal = 0;
  let billsTotal = 0;
  let paidBillCount = 0;
  let paymentCount = 0;

  for (const payment of payments) {
    if (
      payment.sender !== address ||
      payment.status !== 'completed' ||
      !inPeriod(payment.date)
    ) {
      continue;
    }

    const amount = amountOrZero(payment.amount);
    if (!amount) continue;

    spendingTotal += amount;
    paymentCount += 1;
    const category = payment.memo?.trim() || 'Remittance';
    breakdown[category] = (breakdown[category] ?? 0) + amount;

    const month = format(parseISO(payment.date), 'yyyy-MM');
    trend[month] = (trend[month] ?? 0) + amount;
    trendCounts[month] = (trendCounts[month] ?? 0) + 1;
  }

  for (const bill of bills) {
    if (bill.status !== 'paid' || !inPeriod(bill.dueDate)) continue;

    const amount = amountOrZero(bill.amount);
    if (!amount) continue;

    billsTotal += amount;
    paidBillCount += 1;
    const category = bill.category?.trim() || bill.name.trim() || 'Bill';
    breakdown[category] = (breakdown[category] ?? 0) + amount;
  }

  const unpaidBills = bills.filter(
    (bill) => bill.status !== 'paid' && bill.status !== 'cancelled',
  );
  const activePolicies = policies.filter((policy) => policy.active);

  return {
    period,
    spendingTotal: roundAmount(spendingTotal),
    savingsTotal: roundAmount(
      goals.reduce((sum, goal) => sum + amountOrZero(goal.currentAmount), 0),
    ),
    billsTotal: roundAmount(billsTotal),
    unpaidBillsTotal: roundAmount(
      unpaidBills.reduce((sum, bill) => sum + amountOrZero(bill.amount), 0),
    ),
    insuranceTotal: roundAmount(
      activePolicies.reduce(
        (sum, policy) => sum + amountOrZero(policy.monthlyPremium),
        0,
      ),
    ),
    counts: {
      payments: paymentCount,
      paidBills: paidBillCount,
      unpaidBills: unpaidBills.length,
      activePolicies: activePolicies.length,
      savingsGoals: goals.length,
    },
    breakdown: Object.fromEntries(
      Object.entries(breakdown).map(([category, amount]) => [
        category,
        roundAmount(amount),
      ]),
    ),
    trend: Object.fromEntries(
      Object.entries(trend).map(([month, amount]) => [
        month,
        roundAmount(amount),
      ]),
    ),
    trendCounts,
  };
}
