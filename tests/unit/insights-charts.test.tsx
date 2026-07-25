import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CategoryDonutChart, MOCK_CATEGORY_DATA } from '@/components/Insights/categoryDonutChart'
import { RemittanceTrendChart, MOCK_TREND_DATA } from '@/components/Insights/remittanceTrendChart'
import { SpendingVsSavingsChart, MOCK_SPENDING_VS_SAVINGS } from '@/components/Insights/spendingVsSavingChart'
import { TopCategoriesWidget } from '@/components/Insights/TopCategoriesWidget'

// Mock ResponsiveContainer for Recharts so it renders in JSDOM
vi.mock('recharts', async () => {
  const actual = await vi.importActual<typeof import('recharts')>('recharts')
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 800, height: 400 }}>{children}</div>
    ),
  }
})

describe('Insights Charts Smoke Tests', () => {
  // Mock window.matchMedia for usePrefersReducedMotion
  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  describe('CategoryDonutChart', () => {
    it('renders without throwing', () => {
      expect(() => render(<CategoryDonutChart data={MOCK_CATEGORY_DATA} />)).not.toThrow()
    })

    it('renders with empty data array', () => {
      expect(() => render(<CategoryDonutChart data={[]} />)).not.toThrow()
    })

    it('renders with a single data point', () => {
      const singleData = [MOCK_CATEGORY_DATA[0]]
      expect(() => render(<CategoryDonutChart data={singleData} />)).not.toThrow()
    })
  })

  describe('RemittanceTrendChart', () => {
    it('renders without throwing', () => {
      expect(() => render(<RemittanceTrendChart data={MOCK_TREND_DATA} />)).not.toThrow()
    })

    it('renders with empty data array', () => {
      expect(() => render(<RemittanceTrendChart data={[]} />)).not.toThrow()
    })

    it('renders with a single data point', () => {
      const singleData = [MOCK_TREND_DATA[0]]
      expect(() => render(<RemittanceTrendChart data={singleData} />)).not.toThrow()
    })
  })

  describe('SpendingVsSavingsChart', () => {
    it('renders without throwing', () => {
      expect(() => render(<SpendingVsSavingsChart data={MOCK_SPENDING_VS_SAVINGS} />)).not.toThrow()
    })

    it('renders with empty data array', () => {
      expect(() => render(<SpendingVsSavingsChart data={[]} />)).not.toThrow()
    })

    it('renders with a single data point', () => {
      const singleData = [MOCK_SPENDING_VS_SAVINGS[0]]
      expect(() => render(<SpendingVsSavingsChart data={singleData} />)).not.toThrow()
    })
  })

  describe('TopCategoriesWidget', () => {
    it('renders without throwing', () => {
      expect(() => render(<TopCategoriesWidget />)).not.toThrow()
    })
  })
})
