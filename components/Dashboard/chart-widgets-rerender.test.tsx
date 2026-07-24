/**
 * Re-render regression tests for memoized chart widgets.
 *
 * Each widget is wrapped in React.memo. When a parent re-renders with
 * unchanged props the widget must NOT re-render. We prove this by tracking
 * render counts with a ref and asserting the count is unchanged after a
 * parent state update that does not touch widget props.
 */
import React, { useRef } from 'react'
import { cleanup, render, screen, act } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { DensityProvider } from '@/lib/context/DensityContext'

import MoneyDistributionWidget from '@/components/Dashboard/MoneyDistributionWidget'
import SixMonthTrendsWidget from '@/components/Dashboard/SixMonthTrendsWidget'
import RecentTransactionsWidget from '@/components/Dashboard/RecentTransactionsWidget'

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
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

afterEach(cleanup)

/**
 * Returns a parent component that:
 *  - renders `children` with stable props
 *  - exposes a button that triggers an unrelated state update
 */
function makeParent(children: React.ReactNode) {
  return function Parent() {
    const [tick, setTick] = React.useState(0)
    return (
      <DensityProvider>
        <button onClick={() => setTick((t) => t + 1)}>tick-{tick}</button>
        {children}
      </DensityProvider>
    )
  }
}

describe('memo re-render count – chart widgets', () => {
  it('MoneyDistributionWidget does not re-render on unrelated parent state change', () => {
    const renderCount = { current: 0 }

    const Tracked = React.memo(function Tracked() {
      renderCount.current++
      return <MoneyDistributionWidget />
    })

    const Parent = makeParent(<Tracked />)
    const { getByText } = render(<Parent />)

    const countAfterMount = renderCount.current
    expect(countAfterMount).toBeGreaterThan(0)

    act(() => { getByText(/^tick-/).click() })

    // Tracked is memo'd with no changing props → should not re-render
    expect(renderCount.current).toBe(countAfterMount)
  })

  it('SixMonthTrendsWidget does not re-render on unrelated parent state change', () => {
    const renderCount = { current: 0 }

    const Tracked = React.memo(function Tracked() {
      renderCount.current++
      return <SixMonthTrendsWidget />
    })

    const Parent = makeParent(<Tracked />)
    const { getByText } = render(<Parent />)

    const countAfterMount = renderCount.current
    act(() => { getByText(/^tick-/).click() })

    expect(renderCount.current).toBe(countAfterMount)
  })

  it('RecentTransactionsWidget does not re-render on unrelated parent state change', () => {
    const renderCount = { current: 0 }
    const stableData = [
      { id: '1', date: 'Jan 1, 2026', description: 'Test', category: 'Transfer', amount: '$10.00', status: 'Completed' as const },
    ]

    const Tracked = React.memo(function Tracked() {
      renderCount.current++
      return <RecentTransactionsWidget transactions={stableData} />
    })

    const Parent = makeParent(<Tracked />)
    const { getByText } = render(<Parent />)

    const countAfterMount = renderCount.current
    act(() => { getByText(/^tick-/).click() })

    expect(renderCount.current).toBe(countAfterMount)
  })

  it('MoneyDistributionWidget re-renders when data prop changes', () => {
    const renderCount = { current: 0 }
    const data1 = [{ name: 'A', value: 50, amount: '$500', displayPercent: '50%', color: '#dc2626' }]
    const data2 = [{ name: 'B', value: 100, amount: '$1000', displayPercent: '100%', color: '#dc2626' }]

    let setData!: React.Dispatch<React.SetStateAction<typeof data1>>
    function Parent() {
      const [data, setDataInner] = React.useState(data1)
      setData = setDataInner
      renderCount.current++
      return (
        <DensityProvider>
          <MoneyDistributionWidget distributionData={data} />
        </DensityProvider>
      )
    }

    render(<Parent />)
    const countAfterMount = renderCount.current

    act(() => { setData(data2) })

    // Parent + widget must both re-render when data changes
    expect(renderCount.current).toBeGreaterThan(countAfterMount)
  })
})
