import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DashboardResponse } from '@/lib/types/dashboard';

// Mock the session-aware API client so the page never touches the network.
const get = vi.fn();
vi.mock('@/lib/client/apiClient', () => ({
  apiClient: { get: (...args: unknown[]) => get(...args) },
}));

import DashboardPage from '@/app/dashboard/page';

function makeResponse(overrides: Partial<DashboardResponse> = {}): DashboardResponse {
  return {
    remittance: {
      status: 'ok',
      totalSent: 1240.5,
      split: { USD: 100 },
      recentTransactions: [
        { id: '1', amount: 100, currency: 'USD', recipient: 'a', status: 'completed', createdAt: '' },
        { id: '2', amount: 50, currency: 'USD', recipient: 'b', status: 'completed', createdAt: '' },
      ],
    },
    savings: { status: 'ok', savingsTotal: 450, recentGoals: [] },
    bills: { status: 'ok', billsPaidCount: 3, billsPaidAmount: 85, unpaidBills: [] },
    insurance: {
      status: 'ok',
      insurancePoliciesCount: 1,
      insurancePremium: 12.99,
      activePolicies: [],
    },
    meta: { cachedAt: '', ttlSeconds: 30, fromCache: false },
    ...overrides,
  };
}

function okResponse(data: DashboardResponse) {
  return { ok: true, json: async () => data } as unknown as Response;
}

beforeEach(() => {
  get.mockReset();
  // Deterministic locale for currency formatting.
  Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });
});

afterEach(cleanup);

describe('DashboardPage — StatCard summary row', () => {
  it('shows the loading skeleton while the fetch is pending', () => {
    get.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<DashboardPage />);

    expect(container.querySelector('.animate-shimmer')).toBeTruthy();
    expect(screen.queryByText('$1,240.50')).not.toBeInTheDocument();
  });

  it('renders live aggregated values from the API response', async () => {
    get.mockResolvedValue(okResponse(makeResponse()));
    render(<DashboardPage />);

    expect(await screen.findByText('$1,240.50')).toBeInTheDocument(); // Total Sent
    expect(screen.getByText('$450.00')).toBeInTheDocument(); // Savings
    expect(screen.getByText('$85.00')).toBeInTheDocument(); // Bills Paid
    expect(screen.getByText('$12.99')).toBeInTheDocument(); // Insurance premium

    // Contextual detail rows driven by real data.
    expect(screen.getByText('2 transfers')).toBeInTheDocument();
    expect(screen.getByText('3 paid')).toBeInTheDocument();
    expect(screen.getByText('1 policies')).toBeInTheDocument();
  });

  it('handles zero values and very large amounts with tabular formatting', async () => {
    get.mockResolvedValue(
      okResponse(
        makeResponse({
          remittance: { status: 'ok', totalSent: 0, split: {}, recentTransactions: [] },
          savings: { status: 'ok', savingsTotal: 1234567.89, recentGoals: [] },
        })
      )
    );
    render(<DashboardPage />);

    expect(await screen.findByText('$0.00')).toBeInTheDocument();
    expect(screen.getByText('$1,234,567.89')).toBeInTheDocument();
  });

  it('shows a placeholder for a section that failed on the server', async () => {
    get.mockResolvedValue(
      okResponse(
        makeResponse({
          insurance: { status: 'error', error: 'rpc down' },
        })
      )
    );
    render(<DashboardPage />);

    expect(await screen.findByText('$1,240.50')).toBeInTheDocument();
    // Insurance card falls back to the unavailable dash, others still render.
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('formats amounts for the es locale', async () => {
    Object.defineProperty(navigator, 'language', { value: 'es-ES', configurable: true });
    get.mockResolvedValue(
      okResponse(makeResponse({ savings: { status: 'ok', savingsTotal: 12345.5, recentGoals: [] } }))
    );
    render(<DashboardPage />);

    // es groups thousands with "." and uses "," for decimals: 12.345,50 US$
    expect(await screen.findByText(/12\.345,50/)).toBeInTheDocument();
  });

  it('shows the error fallback when the fetch fails and recovers on retry', async () => {
    vi.useFakeTimers();
    get
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: false } as Response);
    render(<DashboardPage />);

    expect(screen.queryByText(/unable to load data/i)).not.toBeInTheDocument();

    await vi.runAllTimersAsync();
    expect(await screen.findByText(/unable to load data/i)).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(4);

    // Retry succeeds the second time.
    get.mockResolvedValueOnce(okResponse(makeResponse()));
    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: /retry loading data/i }));

    await waitFor(() => {
      expect(screen.getByText('$1,240.50')).toBeInTheDocument();
    });
    expect(screen.queryByText(/unable to load data/i)).not.toBeInTheDocument();
  });

  it('shows the error fallback when the session-expiry flow returns null', async () => {
    vi.useFakeTimers();
    get.mockResolvedValue(null);
    render(<DashboardPage />);

    await vi.runAllTimersAsync();
    expect(await screen.findByText(/unable to load data/i)).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('keeps showing the loading skeleton while automatic retries are in progress', async () => {
    vi.useFakeTimers();
    get
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce(okResponse(makeResponse()));

    const { container } = render(<DashboardPage />);

    expect(container.querySelector('.animate-shimmer')).toBeTruthy();
    expect(screen.queryByText(/unable to load data/i)).not.toBeInTheDocument();

    await vi.runAllTimersAsync();
    vi.useRealTimers();

    expect(await screen.findByText('$1,240.50')).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(4);
  });
});
