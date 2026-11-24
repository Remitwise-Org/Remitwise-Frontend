import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
  fetchTransactionHistory: vi.fn(),
  getAllBills: vi.fn(),
  getActivePolicies: vi.fn(),
  getAllGoals: vi.fn(),
}));

vi.mock('@/lib/session', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('@/lib/remittance/horizon', () => ({
  fetchTransactionHistory: mocks.fetchTransactionHistory,
}));
vi.mock('@/lib/contracts/bill-payments', () => ({
  getAllBills: mocks.getAllBills,
}));
vi.mock('@/lib/contracts/insurance-cached', () => ({
  getActivePolicies: mocks.getActivePolicies,
}));
vi.mock('@/lib/contracts/savings-goal', () => ({
  getAllGoals: mocks.getAllGoals,
}));

import { GET } from '@/app/api/insights/route';

const address = 'GINSIGHTSUSER';

describe('GET /api/insights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({ address });
    mocks.fetchTransactionHistory.mockResolvedValue({
      transactions: [
        {
          id: 'payment-1',
          hash: 'hash-1',
          amount: '25',
          currency: 'USDC',
          recipient: 'GRECIPIENT',
          sender: address,
          date: new Date().toISOString(),
          status: 'completed',
          memo: 'Rent',
        },
      ],
    });
    mocks.getAllBills.mockResolvedValue([
      {
        id: 'bill-1',
        owner: address,
        name: 'Internet',
        amount: 10,
        dueDate: new Date().toISOString(),
        recurring: false,
        status: 'paid',
      },
    ]);
    mocks.getActivePolicies.mockResolvedValue([]);
    mocks.getAllGoals.mockResolvedValue([]);
  });

  it('aggregates authenticated source records for the selected period', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/insights?period=current_month'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      period: 'current_month',
      spendingTotal: 25,
      billsTotal: 10,
      breakdown: { Rent: 25, Internet: 10 },
      partial: false,
      failedSources: [],
    });
    expect(body.trendCounts).toEqual({
      [new Date().toISOString().slice(0, 7)]: 1,
    });
    expect(mocks.fetchTransactionHistory).toHaveBeenCalledWith(address, {
      limit: 200,
    });
    expect(mocks.getAllBills).toHaveBeenCalledWith(address);
    expect(mocks.getActivePolicies).toHaveBeenCalledWith(address);
    expect(mocks.getAllGoals).toHaveBeenCalledWith(address);
  });

  it('rejects unsupported period values before fetching sources', async () => {
    const response = await GET(
      new NextRequest('http://localhost/api/insights?period=all_time'),
    );

    expect(response.status).toBe(400);
    expect(mocks.fetchTransactionHistory).not.toHaveBeenCalled();
    expect(mocks.getAllBills).not.toHaveBeenCalled();
  });

  it('returns the authentication response without fetching financial data', async () => {
    mocks.requireAuth.mockRejectedValue(
      new Response('Unauthorized', { status: 401 }),
    );

    const response = await GET(
      new NextRequest('http://localhost/api/insights'),
    );

    expect(response.status).toBe(401);
    expect(mocks.fetchTransactionHistory).not.toHaveBeenCalled();
  });

  it('returns available data and identifies a failed source as partial', async () => {
    const logError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.getAllBills.mockRejectedValue(new Error('Bills unavailable'));

    const response = await GET(
      new NextRequest('http://localhost/api/insights?period=current_month'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.spendingTotal).toBe(25);
    expect(body.billsTotal).toBe(0);
    expect(body.partial).toBe(true);
    expect(body.failedSources).toEqual(['bills']);
    expect(logError).toHaveBeenCalled();
    logError.mockRestore();
  });
});
