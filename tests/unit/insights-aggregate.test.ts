import { describe, expect, it } from 'vitest';
import type { Bill } from '@/lib/contracts/bill-payments';
import type { Policy } from '@/lib/contracts/insurance';
import type { SavingsGoal } from '@/lib/contracts/savings-goal';
import type { TransactionItem } from '@/lib/remittance/horizon';
import { aggregateInsights } from '@/lib/insights/aggregate';

const address = 'GUSER';
const now = new Date('2026-04-15T12:00:00.000Z');

function payment(overrides: Partial<TransactionItem>): TransactionItem {
  return {
    id: 'payment-1',
    hash: 'hash-1',
    amount: '1',
    currency: 'USDC',
    recipient: 'GRECIPIENT',
    sender: address,
    date: '2026-04-10T00:00:00.000Z',
    status: 'completed',
    ...overrides,
  };
}

function bill(overrides: Partial<Bill>): Bill {
  return {
    id: 'bill-1',
    owner: address,
    name: 'Internet',
    amount: 20,
    dueDate: '2026-04-10T00:00:00.000Z',
    recurring: false,
    status: 'paid',
    ...overrides,
  };
}

describe('aggregateInsights', () => {
  it('filters current-month activity and aggregates user-owned records', () => {
    const result = aggregateInsights({
      address,
      period: 'current_month',
      now,
      payments: [
        payment({ amount: '12.5', memo: 'Family support' }),
        payment({ id: 'incoming', sender: 'GOTHER', amount: '100' }),
        payment({ id: 'failed', status: 'failed', amount: '500' }),
        payment({ id: 'older', date: '2026-03-31T23:59:59.000Z', amount: '8' }),
      ],
      bills: [
        bill({ amount: 20 }),
        bill({ id: 'unpaid', amount: 10, status: 'unpaid' }),
        bill({ id: 'cancelled', amount: 100, status: 'cancelled' }),
      ],
      policies: [
        {
          id: 'active-policy',
          name: 'Health',
          coverageType: 'health',
          monthlyPremium: 15,
          coverageAmount: 1000,
          active: true,
          nextPaymentDate: '2026-05-01T00:00:00.000Z',
        },
        {
          id: 'inactive-policy',
          name: 'Life',
          coverageType: 'life',
          monthlyPremium: 50,
          coverageAmount: 2000,
          active: false,
          nextPaymentDate: '2026-05-01T00:00:00.000Z',
        },
      ],
      goals: [
        {
          id: 'goal-1',
          name: 'Emergency fund',
          targetAmount: 500,
          currentAmount: 125,
          targetDate: 1_800_000_000,
          locked: false,
        },
      ],
    });

    expect(result).toMatchObject({
      period: 'current_month',
      spendingTotal: 12.5,
      savingsTotal: 125,
      billsTotal: 20,
      unpaidBillsTotal: 10,
      insuranceTotal: 15,
      counts: {
        payments: 1,
        paidBills: 1,
        unpaidBills: 1,
        activePolicies: 1,
        savingsGoals: 1,
      },
      breakdown: {
        'Family support': 12.5,
        Internet: 20,
      },
      trend: { '2026-04': 12.5 },
      trendCounts: { '2026-04': 1 },
    });
  });

  it('uses the supported rolling month windows for trend and totals', () => {
    const payments = [
      payment({ id: 'current', amount: '1', date: '2026-04-01T00:00:00.000Z' }),
      payment({ id: 'three-month-start', amount: '2', date: '2026-02-01T00:00:00.000Z' }),
      payment({ id: 'before-three-months', amount: '3', date: '2026-01-31T23:59:59.000Z' }),
      payment({ id: 'year-start', amount: '4', date: '2025-05-01T00:00:00.000Z' }),
      payment({ id: 'before-year', amount: '5', date: '2025-04-30T23:59:59.000Z' }),
    ];

    expect(
      aggregateInsights({
        address,
        period: 'last_3_months',
        payments,
        bills: [],
        policies: [],
        goals: [],
        now,
      }).spendingTotal,
    ).toBe(3);

    expect(
      aggregateInsights({
        address,
        period: 'last_year',
        payments,
        bills: [],
        policies: [],
        goals: [],
        now,
      }).spendingTotal,
    ).toBe(10);
  });

  it('returns zero totals and empty series when all sources are empty', () => {
    expect(
      aggregateInsights({
        address,
        period: 'current_month',
        payments: [],
        bills: [],
        policies: [],
        goals: [],
        now,
      }),
    ).toEqual({
      period: 'current_month',
      spendingTotal: 0,
      savingsTotal: 0,
      billsTotal: 0,
      unpaidBillsTotal: 0,
      insuranceTotal: 0,
      counts: {
        payments: 0,
        paidBills: 0,
        unpaidBills: 0,
        activePolicies: 0,
        savingsGoals: 0,
      },
      breakdown: {},
      trend: {},
      trendCounts: {},
    });
  });

  it('preserves fractional payment precision', () => {
    const result = aggregateInsights({
      address,
      period: 'current_month',
      payments: [payment({ amount: '0.0000001' })],
      bills: [],
      policies: [],
      goals: [],
      now,
    });

    expect(result.spendingTotal).toBe(0.0000001);
  });
});
