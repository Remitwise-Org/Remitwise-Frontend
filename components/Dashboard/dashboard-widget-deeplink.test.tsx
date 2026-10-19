/**
 * Integration tests for ?widget= deep-link behaviour on the dashboard.
 *
 * These tests verify that:
 *  1. Each widget renders an element with the correct `id` attribute so
 *     the URL fragment and the hook ref can find it.
 *  2. The WIDGET_IDS constants are stable — renaming them is a breaking change
 *     because support teams share URLs containing these values.
 */

import { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import MoneyDistributionWidget  from '@/components/Dashboard/MoneyDistributionWidget'
import RecentTransactionsWidget from '@/components/Dashboard/RecentTransactionsWidget'
import SavingsByGoalWidget      from '@/components/Dashboard/SavingsByGoalWidget'
import SixMonthTrendsWidget     from '@/components/Dashboard/SixMonthTrendsWidget'
import { WIDGET_IDS }           from '@/lib/config/widgets'
import { DensityProvider }      from '@/lib/context/DensityContext'

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: () => null }),
}))

function renderWithProviders(ui: ReactNode) {
  return render(<DensityProvider>{ui}</DensityProvider>)
}

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )

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
})

// ── WIDGET_IDS contract ───────────────────────────────────────────────────────

describe('WIDGET_IDS constants', () => {
  it('SIX_MONTH_TRENDS is "six-month-trends"', () => {
    expect(WIDGET_IDS.SIX_MONTH_TRENDS).toBe('six-month-trends')
  })

  it('MONEY_DISTRIBUTION is "money-distribution"', () => {
    expect(WIDGET_IDS.MONEY_DISTRIBUTION).toBe('money-distribution')
  })

  it('RECENT_TRANSACTIONS is "recent-transactions"', () => {
    expect(WIDGET_IDS.RECENT_TRANSACTIONS).toBe('recent-transactions')
  })

  it('SAVINGS_BY_GOAL is "savings-by-goal"', () => {
    expect(WIDGET_IDS.SAVINGS_BY_GOAL).toBe('savings-by-goal')
  })
})

// ── id attribute presence ────────────────────────────────────────────────────

describe('deep-link id attributes', () => {
  it('SixMonthTrendsWidget root element has id="six-month-trends"', () => {
    renderWithProviders(<SixMonthTrendsWidget />)
    expect(document.getElementById(WIDGET_IDS.SIX_MONTH_TRENDS)).toBeInTheDocument()
  })

  it('MoneyDistributionWidget root element has id="money-distribution"', () => {
    renderWithProviders(<MoneyDistributionWidget />)
    expect(document.getElementById(WIDGET_IDS.MONEY_DISTRIBUTION)).toBeInTheDocument()
  })

  it('RecentTransactionsWidget root element has id="recent-transactions"', () => {
    renderWithProviders(<RecentTransactionsWidget />)
    expect(document.getElementById(WIDGET_IDS.RECENT_TRANSACTIONS)).toBeInTheDocument()
  })

  it('SavingsByGoalWidget root element has id="savings-by-goal"', () => {
    renderWithProviders(<SavingsByGoalWidget />)
    expect(document.getElementById(WIDGET_IDS.SAVINGS_BY_GOAL)).toBeInTheDocument()
  })

  it('id attributes are present in loading state too', () => {
    renderWithProviders(<SixMonthTrendsWidget isLoading />)
    expect(document.getElementById(WIDGET_IDS.SIX_MONTH_TRENDS)).toBeInTheDocument()
  })

  it('id attributes are present in error state too', () => {
    renderWithProviders(<SixMonthTrendsWidget hasError />)
    expect(document.getElementById(WIDGET_IDS.SIX_MONTH_TRENDS)).toBeInTheDocument()
  })

  it('id attributes are present in empty state too', () => {
    renderWithProviders(<SavingsByGoalWidget goals={[]} />)
    expect(document.getElementById(WIDGET_IDS.SAVINGS_BY_GOAL)).toBeInTheDocument()
  })
})