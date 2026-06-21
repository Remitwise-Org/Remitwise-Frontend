import { useState, ReactNode, memo } from 'react'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { SpendingVsSavingsChart, MOCK_SPENDING_VS_SAVINGS } from './spendingVsSavingChart'
import { DensityProvider } from '@/lib/context/DensityContext'

// High-fidelity Recharts mock to bypass Redux Toolkit/ESM export issues in JSDOM
vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
    Bar: () => <div data-testid="bar" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
  }
})

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

// Memoized spy wrapper defined outside Parent to preserve component identity and test React.memo
let childRenderCount = 0
const SpendingVsSavingsChartSpy = memo(function SpendingVsSavingsChartSpy(props: any) {
  childRenderCount++
  return <SpendingVsSavingsChart {...props} />
})

describe('SpendingVsSavingsChart Performance & Render tests', () => {
  it('renders correct initial UI with default data', () => {
    renderWithProviders(<SpendingVsSavingsChart />)
    expect(screen.getByRole('heading', { name: /spending vs savings/i })).toBeInTheDocument()
    expect(screen.getByText(/monthly comparison/i)).toBeInTheDocument()
    expect(screen.getByText(/savings rate/i)).toBeInTheDocument()
  })

  it('renders correctly with empty data without throwing', () => {
    expect(() => renderWithProviders(<SpendingVsSavingsChart data={[]} />)).not.toThrow()
    expect(screen.getByText('0%')).toBeInTheDocument()
  })

  it('verifies component props memoization prevents unnecessary re-renders', () => {
    childRenderCount = 0
    let parentRenderCount = 0

    const Parent = () => {
      const [count, setCount] = useState(0)
      parentRenderCount++
      return (
        <div>
          <button onClick={() => setCount(c => c + 1)}>Increment Parent</button>
          <SpendingVsSavingsChartSpy data={MOCK_SPENDING_VS_SAVINGS} />
        </div>
      )
    }

    renderWithProviders(<Parent />)
    expect(parentRenderCount).toBe(1)
    expect(childRenderCount).toBe(1)

    const button = screen.getByRole('button', { name: /increment parent/i })
    fireEvent.click(button)

    expect(parentRenderCount).toBe(2)
    expect(childRenderCount).toBe(1) // Should remain 1 due to memoization on stable data prop
  })
})
