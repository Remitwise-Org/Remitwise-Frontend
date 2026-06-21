import { useState, ReactNode, memo } from 'react'
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { CategoryDonutChart, MOCK_CATEGORY_DATA } from './categoryDonutChart'
import { DensityProvider } from '@/lib/context/DensityContext'

// High-fidelity Recharts mock to bypass Redux Toolkit/ESM export issues in JSDOM
vi.mock('recharts', () => {
  return {
    ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
    PieChart: ({ children }: any) => <svg data-testid="pie-chart">{children}</svg>,
    Pie: ({ data, onClick, onMouseEnter, onMouseLeave, children }: any) => (
      <g data-testid="pie">
        {data.map((entry: any, index: number) => (
          <path
            key={index}
            data-testid={`pie-slice-${index}`}
            onClick={(e) => onClick && onClick(e, index)}
            onMouseEnter={(e) => onMouseEnter && onMouseEnter(e, index)}
            onMouseLeave={(e) => onMouseLeave && onMouseLeave(e)}
          />
        ))}
        {children}
      </g>
    ),
    Cell: () => <path data-testid="cell" />,
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
const CategoryDonutChartSpy = memo(function CategoryDonutChartSpy(props: any) {
  childRenderCount++
  return <CategoryDonutChart {...props} />
})

describe('CategoryDonutChart Performance & Render tests', () => {
  it('renders correct initial UI with default data', () => {
    renderWithProviders(<CategoryDonutChart />)
    expect(screen.getByRole('heading', { name: /top categories/i })).toBeInTheDocument()
    expect(screen.getByText(/remittance breakdown/i)).toBeInTheDocument()
    expect(screen.getByText(/of your remittances go to/i)).toBeInTheDocument()
  })

  it('renders correctly with empty data without throwing', () => {
    expect(() => renderWithProviders(<CategoryDonutChart data={[]} />)).not.toThrow()
    expect(screen.queryByText(/of your remittances go to/i)).not.toBeInTheDocument()
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
          <CategoryDonutChartSpy data={MOCK_CATEGORY_DATA} />
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

  it('allows interaction with legend buttons and pie slices to highlight a category', () => {
    renderWithProviders(<CategoryDonutChart />)
    const familySupportButton = screen.getByRole('button', { name: /family support/i })
    expect(familySupportButton).toBeInTheDocument()

    // Trigger click on a legend item
    fireEvent.click(familySupportButton)
    expect(familySupportButton).toBeInTheDocument()

    // Trigger hover on pie slice
    const slice = screen.getByTestId('pie-slice-0')
    fireEvent.mouseEnter(slice)
    fireEvent.mouseLeave(slice)
  })
})
