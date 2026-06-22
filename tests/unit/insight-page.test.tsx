import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// ── Mock dependencies ─────────────────────────────────────────────────────────
vi.mock('@/lib/client/apiClient', () => ({
  apiClient: {
    getJson: vi.fn(),
  },
  ApiClientError: class ApiClientError extends Error {
    status?: number
    constructor(message: string, status?: number) {
      super(message)
      this.name = 'ApiClientError'
      this.status = status
    }
  },
}))

vi.mock('@/components/ui/LoadingSkeletons', () => ({
  InsightsLoadingSkeleton: () => <div data-testid="loading-skeleton" />,
}))

vi.mock('@/components/ui/WidgetErrorState', () => ({
  default: ({ message, onRetry }: { message: string; onRetry: () => void }) => (
    <div data-testid="error-state">
      <p>{message}</p>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}))

vi.mock('@/components/ui/WidgetEmptyState', () => ({
  default: ({ title }: { title: string }) => (
    <div data-testid="empty-state">{title}</div>
  ),
}))

vi.mock('@/components/Insights/spendingVsSavingChart', () => ({
  SpendingVsSavingsChart: ({ data }: { data: unknown[] }) => (
    <div data-testid="spending-chart" data-points={data.length} />
  ),
}))

import { apiClient } from '@/lib/client/apiClient'
import InsightPage from '../app/dashboard/insight/page'

// ── Fixtures ──────────────────────────────────────────────────────────────────
const mockData = {
  period: 'current_month',
  spendingTotal: 500,
  savingsTotal: 200,
  billsTotal: 300,
  insuranceTotal: 150,
  breakdown: { Food: 500, Electricity: 300 },
  trend: { '2026-2': 700 },
  note: 'Mock data',
}

const emptyData = {
  ...mockData,
  spendingTotal: 0,
  savingsTotal: 0,
  billsTotal: 0,
  insuranceTotal: 0,
  breakdown: {},
  trend: {},
}

describe('InsightPage', () => {
  beforeEach(() => {
    vi.mocked(apiClient.getJson).mockResolvedValue(mockData)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading skeleton while fetching', () => {
    vi.mocked(apiClient.getJson).mockImplementation(
      () => new Promise(() => {}), // never resolves
    )
    render(<InsightPage />)
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('renders KPI cards after successful fetch', async () => {
    render(<InsightPage />)
    await waitFor(() => {
      expect(screen.getByText('Spending')).toBeInTheDocument()
      expect(screen.getByText('Savings')).toBeInTheDocument()
      expect(screen.getByText('Bills')).toBeInTheDocument()
      expect(screen.getByText('Insurance')).toBeInTheDocument()
    })
  })

  it('formats currency correctly in KPI cards', async () => {
    render(<InsightPage />)
    await waitFor(() => {
      expect(screen.getByText('$500')).toBeInTheDocument()
      expect(screen.getByText('$200')).toBeInTheDocument()
    })
  })

  it('renders spending vs savings chart when trend data is present', async () => {
    render(<InsightPage />)
    await waitFor(() => {
      expect(screen.getByTestId('spending-chart')).toBeInTheDocument()
    })
  })

  it('renders category breakdown section', async () => {
    render(<InsightPage />)
    await waitFor(() => {
      expect(screen.getByText('Category Breakdown')).toBeInTheDocument()
      expect(screen.getByText('Food')).toBeInTheDocument()
      expect(screen.getByText('Electricity')).toBeInTheDocument()
    })
  })

  it('shows error state when fetch fails', async () => {
    vi.mocked(apiClient.getJson).mockRejectedValue(new Error('Network error'))
    render(<InsightPage />)
    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument()
    })
  })

  it('shows ApiClientError status in error message', async () => {
    const { ApiClientError } = await import('@/lib/client/apiClient')
    vi.mocked(apiClient.getJson).mockRejectedValue(
      new ApiClientError('Not found', 404),
    )
    render(<InsightPage />)
    await waitFor(() => {
      expect(screen.getByText(/Failed to load insights \(404\)/)).toBeInTheDocument()
    })
  })

  it('retries fetch when Retry button is clicked', async () => {
    vi.mocked(apiClient.getJson).mockRejectedValueOnce(new Error('fail'))
    vi.mocked(apiClient.getJson).mockResolvedValueOnce(mockData)

    render(<InsightPage />)
    await waitFor(() => screen.getByTestId('error-state'))

    fireEvent.click(screen.getByText('Retry'))
    await waitFor(() => {
      expect(screen.getByText('Spending')).toBeInTheDocument()
    })
    expect(vi.mocked(apiClient.getJson)).toHaveBeenCalledTimes(2)
  })

  it('shows empty state when all totals are zero', async () => {
    vi.mocked(apiClient.getJson).mockResolvedValue(emptyData)
    render(<InsightPage />)
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
      expect(screen.getByText('No transactions yet')).toBeInTheDocument()
    })
  })

  it('renders period selector with 3 options', async () => {
    render(<InsightPage />)
    const group = screen.getByRole('group', { name: /period/i })
    expect(group.querySelectorAll('button')).toHaveLength(3)
  })

  it('period selector buttons are keyboard accessible', async () => {
    render(<InsightPage />)
    const buttons = screen.getAllByRole('button', { name: /month|months|year/i })
    // Default: "This Month" is pressed
    expect(buttons[0]).toHaveAttribute('aria-pressed', 'true')
    expect(buttons[1]).toHaveAttribute('aria-pressed', 'false')
  })

  it('re-fetches with new period when period selector is clicked', async () => {
    const user = userEvent.setup()
    render(<InsightPage />)
    await waitFor(() => screen.getByText('Spending'))

    const last3Btn = screen.getByRole('button', { name: 'Last 3 Months' })
    await user.click(last3Btn)

    await waitFor(() => {
      expect(vi.mocked(apiClient.getJson)).toHaveBeenCalledWith(
        '/api/insights?period=last_3_months',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      )
    })
  })

  it('aborts stale request when period changes quickly', async () => {
    const user = userEvent.setup()
    let firstAborted = false

    vi.mocked(apiClient.getJson).mockImplementation((_url, options) => {
      if (_url?.includes('last_3_months')) {
        options?.signal?.addEventListener('abort', () => { firstAborted = true })
        return new Promise(() => {}) // stale request hangs
      }
      return Promise.resolve(mockData)
    })

    render(<InsightPage />)
    await waitFor(() => screen.getByText('Spending'))

    const last3Btn = screen.getByRole('button', { name: 'Last 3 Months' })
    await user.click(last3Btn)
    // Immediately switch to last_year — should abort the last_3_months request
    const lastYearBtn = screen.getByRole('button', { name: 'Last Year' })
    await user.click(lastYearBtn)

    await waitFor(() => expect(firstAborted).toBe(true))
  })

  it('does not set error state when request is aborted', async () => {
    vi.mocked(apiClient.getJson).mockImplementation(() =>
      Promise.reject(new DOMException('Aborted', 'AbortError')),
    )
    render(<InsightPage />)
    // Give time for potential state update
    await new Promise((r) => setTimeout(r, 50))
    expect(screen.queryByTestId('error-state')).not.toBeInTheDocument()
  })
})
