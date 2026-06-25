import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
const toast = vi.fn();

vi.mock('@/lib/client/apiClient', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
  },
}));

vi.mock('@/components/PageHeader', () => ({
  default: () => <div>Page Header</div>,
}));

vi.mock('@/components/Bills/UnpaidBillsSection', () => ({
  UnpaidBillsSection: () => <div>Unpaid Bills Section</div>,
}));

vi.mock('@/components/Bills/RecentPaymentsSection', () => ({
  RecentPaymentsSection: () => <div>Recent Payments Section</div>,
}));

vi.mock('@/app/bills/components/BillPaymentsStatsCards', () => ({
  default: () => <div>Bill Payment Stats</div>,
}));

vi.mock('@/components/Toggle', () => ({
  default: () => <div>Toggle</div>,
}));

vi.mock('@/lib/hooks/useFormAction', () => ({
  useFormAction: () => [{}, vi.fn(), false],
}));

vi.mock('@/components/AsyncOperationsPanel', () => ({
  default: () => <div>Async Operations Panel</div>,
}));

vi.mock('@/components/AsyncSubmissionStatus', () => ({
  default: () => <div>Async Submission Status</div>,
}));

vi.mock('@/lib/context/ToastContext', () => ({
  useToast: () => ({ toast }),
}));

import BillsPage from '@/app/bills/page';

function okResponse(data: unknown) {
  return {
    ok: true,
    json: async () => data,
  } as unknown as Response;
}

describe('Bills page retry behavior', () => {
  beforeEach(() => {
    get.mockReset();
    toast.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('keeps the loading skeleton visible while automatic retries are still running', async () => {
    vi.useFakeTimers();
    get.mockResolvedValue({ ok: false } as Response);

    const { container } = render(<BillsPage />);

    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.queryByText(/failed to load bills/i)).not.toBeInTheDocument();

    await vi.runAllTimersAsync();

    expect(await screen.findByText(/failed to load bills/i)).toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(8);
  });

  it('retries manually after exhaustion and recovers on success', async () => {
    vi.useFakeTimers();
    get.mockResolvedValue({ ok: false } as Response);

    render(<BillsPage />);

    await vi.runAllTimersAsync();
    expect(await screen.findByText(/failed to load bills/i)).toBeInTheDocument();

    get
      .mockResolvedValueOnce(okResponse({ data: { bills: [] } }))
      .mockResolvedValueOnce(okResponse({ data: { totalUnpaid: 0, count: 0 } }));

    vi.useRealTimers();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(screen.getByText('Bill Payment Stats')).toBeInTheDocument();
    });
    expect(screen.queryByText(/failed to load bills/i)).not.toBeInTheDocument();
  });
});
