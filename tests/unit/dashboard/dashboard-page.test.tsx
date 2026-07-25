import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

/** Write a fake sessionStorage cache entry as useStaleFetch would. */
function primeCache(data: DashboardResponse, cachedAt = Date.now()) {
  sessionStorage.setItem(
    'dashboard-data',
    JSON.stringify({ data, cachedAt })
  );
}

beforeEach(() => {
  get.mockReset();
  sessionStorage.clear();
  // Deterministic locale for currency formatting.
  Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });
});

afterEach(cleanup);

describe('DashboardPage — StatCard summary row', () => {
  it('shows the loading skeleton while the fetch is pending', () => {
    get.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<DashboardPage />);

    expect(container.querySelector('.rw-skeleton--shimmer')).toBeTruthy();
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

  it('shows the last synced indicator with a relative timestamp', async () => {
    get.mockResolvedValue(
      okResponse(
        makeResponse({
          meta: { cachedAt: '2026-07-24T11:55:00Z', ttlSeconds: 30, fromCache: false },
        })
      )
    );
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-24T12:00:00Z'));
    render(<DashboardPage />);

    expect(await screen.findByText('Updated 5 min ago')).toBeInTheDocument();
    vi.useRealTimers();
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

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    vi.useRealTimers();
    expect(await screen.findByText(/unable to load data/i)).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(4);

    // Retry succeeds the second time.
    get.mockResolvedValueOnce(okResponse(makeResponse()));
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

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    vi.useRealTimers();
    expect(await screen.findByText(/unable to load data/i)).toBeInTheDocument();
    // No stale banner for session expiry.
    expect(screen.queryByText(/showing cached data/i)).not.toBeInTheDocument();
  });
});

describe('DashboardPage — stale-data banner', () => {
  it('shows the stale banner and cached data when the fetch fails after a prior load', async () => {
    const cachedData = makeResponse();
    primeCache(cachedData);

    // Live fetch fails.
    get.mockRejectedValue(new Error('Network failure'));
    render(<DashboardPage />);

    // The stale banner should appear.
    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/showing cached data/i)).toBeInTheDocument();

    // Cached data values are still rendered.
    expect(screen.getByText('$1,240.50')).toBeInTheDocument();
  });

  it('shows the stale banner when the response is not ok but cache exists', async () => {
    const cachedData = makeResponse();
    primeCache(cachedData);

    get.mockResolvedValue({ ok: false, status: 503 } as unknown as Response);
    render(<DashboardPage />);

    expect(await screen.findByText(/showing cached data/i)).toBeInTheDocument();
    expect(screen.getByText('$1,240.50')).toBeInTheDocument();
    // No full-page error state.
    expect(screen.queryByText(/unable to load data/i)).not.toBeInTheDocument();
  });

  it('hides the stale banner after the user dismisses it', async () => {
    primeCache(makeResponse());
    get.mockRejectedValue(new Error('Network failure'));
    render(<DashboardPage />);

    expect(await screen.findByText(/showing cached data/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /dismiss stale data warning/i }));

    expect(screen.queryByText(/showing cached data/i)).not.toBeInTheDocument();
    // Data is still shown.
    expect(screen.getByText('$1,240.50')).toBeInTheDocument();
  });

  it('clears the stale banner and shows live data after a successful refresh', async () => {
    const cachedData = makeResponse();
    primeCache(cachedData);

    // First call fails.
    get.mockRejectedValueOnce(new Error('Network failure'));
    render(<DashboardPage />);

    expect(await screen.findByText(/showing cached data/i)).toBeInTheDocument();

    // Second call (via Refresh button) succeeds with updated data.
    const freshData = makeResponse({
      savings: { status: 'ok', savingsTotal: 999, recentGoals: [] },
    });
    get.mockResolvedValueOnce(okResponse(freshData));
    fireEvent.click(screen.getByRole('button', { name: /refresh data/i }));

    await waitFor(() =>
      expect(screen.queryByText(/showing cached data/i)).not.toBeInTheDocument()
    );
    expect(screen.getByText('$999.00')).toBeInTheDocument();
  });

  it('does NOT show the stale banner when the session-expiry flow returns null even with a cache entry', async () => {
    primeCache(makeResponse());
    get.mockResolvedValue(null); // session-expiry flow

    render(<DashboardPage />);

    // Should show error state, not stale banner.
    expect(await screen.findByText(/unable to load data/i)).toBeInTheDocument();
    expect(screen.queryByText(/showing cached data/i)).not.toBeInTheDocument();
  });

  it('keeps showing the loading skeleton while automatic retries are in progress', async () => {
    vi.useFakeTimers();
    get
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce({ ok: false } as Response)
      .mockResolvedValueOnce(okResponse(makeResponse()));

    const { container } = render(<DashboardPage />);

    expect(container.querySelector('.rw-skeleton--shimmer')).toBeTruthy();
    expect(screen.queryByText(/unable to load data/i)).not.toBeInTheDocument();

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    vi.useRealTimers();

    expect(await screen.findByText('$1,240.50')).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(4);
  });
});
