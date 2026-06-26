import { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import MoneyDistributionWidget from '@/components/Dashboard/MoneyDistributionWidget'
import QuickActions from '@/components/Dashboard/QuickActions'
import RecentTransactionsWidget from '@/components/Dashboard/RecentTransactionsWidget'
import SavingsByGoalWidget from '@/components/Dashboard/SavingsByGoalWidget'
import SixMonthTrendsWidget from '@/components/Dashboard/SixMonthTrendsWidget'
import { CategoryDonutChart } from '@/components/Insights/categoryDonutChart'
import { RemittanceTrendChart } from '@/components/Insights/remittanceTrendChart'
import { SpendingVsSavingsChart } from '@/components/Insights/spendingVsSavingChart'
import { TopCategoriesWidget } from '@/components/Insights/TopCategoriesWidget'
import { DensityProvider } from '@/lib/context/DensityContext'

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
  localStorage.clear()
})

describe('dashboard widget render smoke tests', () => {
  it('mounts MoneyDistributionWidget and renders its default content', () => {
    expect(() => renderWithProviders(<MoneyDistributionWidget />)).not.toThrow()

    expect(screen.getByRole('heading', { name: /money distribution/i })).toBeInTheDocument()
    expect(screen.getByText(/where your money goes/i)).toBeInTheDocument()
  })

  it('renders MoneyDistributionWidget empty and error fallbacks', () => {
    const { rerender } = renderWithProviders(<MoneyDistributionWidget distributionData={[]} />)

    expect(screen.getByRole('status')).toHaveTextContent(/no distribution data yet/i)
    expect(screen.getByRole('link', { name: /set up your split/i })).toBeInTheDocument()

    rerender(
      <DensityProvider>
        <MoneyDistributionWidget hasError />
      </DensityProvider>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/couldn't load your distribution data/i)
    expect(screen.getByRole('button', { name: /retry loading data/i })).toBeInTheDocument()
  })

  it('mounts SixMonthTrendsWidget and renders its summary cards', () => {
    expect(() => renderWithProviders(<SixMonthTrendsWidget />)).not.toThrow()

    expect(screen.getByRole('heading', { name: /6-month trends/i })).toBeInTheDocument()
    expect(screen.getByText(/track your financial patterns/i)).toBeInTheDocument()
    expect(screen.getByText(/highest month/i)).toBeInTheDocument()
  })

  it('mounts RecentTransactionsWidget with its density provider', () => {
    expect(() => renderWithProviders(<RecentTransactionsWidget />)).not.toThrow()

    expect(screen.getByRole('heading', { name: /recent transactions/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /view all/i })).toBeInTheDocument()
  })

  it('renders RecentTransactionsWidget empty and error fallbacks', () => {
    const { rerender } = renderWithProviders(<RecentTransactionsWidget transactions={[]} />)

    expect(screen.getByRole('status')).toHaveTextContent(/no transactions yet/i)
    expect(screen.getByRole('link', { name: /send money/i })).toBeInTheDocument()

    rerender(
      <DensityProvider>
        <RecentTransactionsWidget hasError />
      </DensityProvider>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/couldn't load your transactions/i)
    expect(screen.getByRole('button', { name: /retry loading data/i })).toBeInTheDocument()
  })

  it('mounts SavingsByGoalWidget and renders goal progress bars', () => {
    expect(() => renderWithProviders(<SavingsByGoalWidget />)).not.toThrow()

    expect(screen.getByRole('heading', { name: /savings by goal/i })).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /emergency fund progress/i })).toBeInTheDocument()
  })

  it('renders SavingsByGoalWidget empty and error fallbacks', () => {
    const { rerender } = renderWithProviders(<SavingsByGoalWidget goals={[]} />)

    expect(screen.getByRole('status')).toHaveTextContent(/no savings goals yet/i)
    expect(screen.getByRole('link', { name: /create a goal/i })).toBeInTheDocument()

    rerender(
      <DensityProvider>
        <SavingsByGoalWidget hasError />
      </DensityProvider>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent(/couldn't load your savings goals/i)
    expect(screen.getByRole('button', { name: /retry loading data/i })).toBeInTheDocument()
  })

  it('mounts QuickActions and renders its primary actions', () => {
    expect(() => renderWithProviders(<QuickActions />)).not.toThrow()

    expect(screen.getByRole('link', { name: /emergency transfer/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /send/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /goals/i })).toBeInTheDocument()
  })
})

describe('Insights chart render smoke tests', () => {
  it('mounts TopCategoriesWidget without throwing', () => {
    expect(() => renderWithProviders(<TopCategoriesWidget />)).not.toThrow()

    expect(screen.getByRole('heading', { name: /top categories/i })).toBeInTheDocument()
    expect(screen.getByText(/remittance breakdown/i)).toBeInTheDocument()
  })

  it('mounts SpendingVsSavingsChart with default and empty data', () => {
    const { rerender } = renderWithProviders(<SpendingVsSavingsChart />)

    expect(screen.getByRole('heading', { name: /spending vs savings/i })).toBeInTheDocument()
    expect(screen.getByText(/monthly comparison/i)).toBeInTheDocument()

    expect(() =>
      rerender(
        <DensityProvider>
          <SpendingVsSavingsChart data={[]} />
        </DensityProvider>,
      ),
    ).not.toThrow()
  })

  it('mounts RemittanceTrendChart with default and empty data', () => {
    const { rerender } = renderWithProviders(<RemittanceTrendChart />)

    expect(screen.getByRole('heading', { name: /remittance trend/i })).toBeInTheDocument()
    expect(screen.getByText(/volume over time/i)).toBeInTheDocument()

    expect(() =>
      rerender(
        <DensityProvider>
          <RemittanceTrendChart data={[]} />
        </DensityProvider>,
      ),
    ).not.toThrow()
  })

  it('mounts CategoryDonutChart with default and empty data', () => {
    const { rerender } = renderWithProviders(<CategoryDonutChart />)

    const widget = screen.getByText(/consider setting up automatic transfers/i).closest('div')
    expect(screen.getByRole('heading', { name: /top categories/i })).toBeInTheDocument()
    expect(widget).toBeInTheDocument()

    expect(() =>
      rerender(
        <DensityProvider>
          <CategoryDonutChart data={[]} />
        </DensityProvider>,
      ),
    ).not.toThrow()
    expect(screen.getByText(/remittance breakdown/i)).toBeInTheDocument()
  })
})
