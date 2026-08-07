/**
 * Regression test: Chart must NOT flicker (skeleton → chart → skeleton → chart)
 * when the period selector triggers a refetch.
 *
 * Before the fix, InsightPage would set loading=true on every period change,
 * replacing the chart with a skeleton and causing a visible flash.
 * After the fix, the old chart data stays visible while refetching.
 */
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InsightPage from '@/app/dashboard/insight/page'
import { renderWithProviders } from '@/tests/react/renderWithProviders'

// ── Mocks ─────────────────────────────────────────────────────────────────────

const MOCK_DATA = {
  period: 'current_month',
  spendingTotal: 3200,
  savingsTotal: 1400,
  billsTotal: 420,
  insuranceTotal: 80,
  breakdown: { spending: 3200, savings: 1400, bills: 420, insurance: 80 },
  trend: { '2026-01-01': 520, '2026-01-08': 780 },
}

// Shared mutable state accessible from BOTH the vi.mock factory and the tests.
const mockState = vi.hoisted(() => ({
  resolveApi: null as ((data: typeof MOCK_DATA) => void) | null,
  rejectApi: null as ((err: Error) => void) | null,
  apiCallCount: 0,
  shouldReject: false,
}))

vi.mock('@/lib/client/widgetFetchRetry', () => ({
  runWidgetFetchWithRetry: vi.fn(() => {
    mockState.apiCallCount++
    if (mockState.shouldReject) {
      return Promise.reject(new Error('Network error'))
    }
    // Return a deferred promise so tests can resolve/reject at their pace
    return new Promise((resolve, reject) => {
      mockState.resolveApi = resolve as (data: typeof MOCK_DATA) => void
      mockState.rejectApi = reject
    })
  }),
}))

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  mockState.apiCallCount = 0
  mockState.resolveApi = null
  mockState.rejectApi = null
  mockState.shouldReject = false
})

describe('InsightPage chart flicker regression', () => {
  it('shows skeleton on initial load, then chart after data arrives', async () => {
    renderWithProviders(<InsightPage />)

    // Resolve the API call
    await act(async () => {
      mockState.resolveApi!(MOCK_DATA)
    })

    // After data arrives, stats appear
    await waitFor(() => {
      expect(screen.getByText('$3,200')).toBeInTheDocument()
    })
  })

  it('keeps the chart visible when period changes (no skeleton flash)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<InsightPage />)

    // Resolve initial load
    await act(async () => {
      mockState.resolveApi!(MOCK_DATA)
    })

    await waitFor(() => {
      expect(screen.getByText('$3,200')).toBeInTheDocument()
    })

    // Change period to "last_3_months" — this triggers a refetch
    // Before the fix, the chart would disappear and show a skeleton.
    const select = screen.getByRole('combobox', { name: /select period/i })
    await act(async () => {
      await user.selectOptions(select, 'last_3_months')
    })

    // The old data must STILL be visible while the API call is in-flight
    // (no skeleton flash). The stats should remain visible.
    expect(screen.getByText('$3,200')).toBeInTheDocument()
    expect(screen.getByText('$1,400')).toBeInTheDocument()

    // Resolve the second API call
    const secondData = { ...MOCK_DATA, period: 'last_3_months', spendingTotal: 9000 }
    await act(async () => {
      mockState.resolveApi!(secondData)
    })

    // Now the new data appears
    await waitFor(() => {
      expect(screen.getByText('$9,000.00')).toBeInTheDocument()
    })
  })

  it('shows error state on initial load failure', async () => {
    mockState.shouldReject = true
    renderWithProviders(<InsightPage />)

    await waitFor(() => {
      expect(screen.getByText(/failed to load insights/i)).toBeInTheDocument()
    }, { timeout: 5000 })
  })

  it('keeps previous data visible when refetch fails after initial success', async () => {
    const user = userEvent.setup()
    renderWithProviders(<InsightPage />)

    // Resolve initial load
    await act(async () => {
      mockState.resolveApi!(MOCK_DATA)
    })

    await waitFor(() => {
      expect(screen.getByText('$3,200')).toBeInTheDocument()
    })

    // Change period — triggers refetch
    const select = screen.getByRole('combobox', { name: /select period/i })
    await act(async () => {
      await user.selectOptions(select, 'last_year')
    })

    // Still shows old data
    expect(screen.getByText('$3,200')).toBeInTheDocument()

    // Reject the refetch
    await act(async () => {
      mockState.rejectApi!(new Error('Network error'))
    })

    // Old data stays visible; no error state shown because we already have data
    await waitFor(() => {
      expect(screen.getByText('$3,200')).toBeInTheDocument()
    })

    // Error state is NOT shown
    expect(screen.queryByText(/failed to load insights/i)).not.toBeInTheDocument()
  })
})