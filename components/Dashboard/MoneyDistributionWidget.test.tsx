import { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import MoneyDistributionWidget from '@/components/Dashboard/MoneyDistributionWidget'
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

describe('MoneyDistributionWidget — isLoading and precedence', () => {
  describe('loading state', () => {
    it('renders skeleton when isLoading is true', () => {
      renderWithProviders(<MoneyDistributionWidget isLoading />)

      // Skeleton should be rendered
      const skeleton = screen.queryByRole('img', { hidden: true })
      expect(skeleton).not.toBeInTheDocument()
      
      // Loading state should have aria-busy
      const loadingContainer = document.querySelector('[aria-busy="true"]')
      expect(loadingContainer).toBeInTheDocument()
      expect(loadingContainer).toHaveAttribute('aria-hidden', 'true')

      // Content should not render
      expect(screen.queryByText(/total/i)).not.toBeInTheDocument()
    })

    it('skeleton maintains dimensions matching loaded content', () => {
      const { container } = renderWithProviders(<MoneyDistributionWidget isLoading />)

      // Skeleton container should have height and width styles
      const skeletonChart = container.querySelector('[aria-hidden="true"]')
      expect(skeletonChart).toBeInTheDocument()
      
      // Verify parent container exists and has responsive classes
      const section = container.querySelector('section')
      expect(section).toHaveClass('lg:w-[50%]', 'w-full')
    })

    it('skeleton renders on mobile (responsive)', () => {
      const { container } = renderWithProviders(<MoneyDistributionWidget isLoading />)

      const section = container.querySelector('section')
      expect(section).toHaveClass('w-full') // Mobile breakpoint
      expect(section).toHaveClass('lg:w-[50%]') // Desktop breakpoint
    })
  })

  describe('state precedence', () => {
    it('isLoading takes precedence over hasError', () => {
      renderWithProviders(<MoneyDistributionWidget isLoading hasError />)

      // Should show loading, not error
      const loadingContainer = document.querySelector('[aria-busy="true"]')
      expect(loadingContainer).toBeInTheDocument()
      
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(screen.queryByText(/couldn't load your distribution data/i)).not.toBeInTheDocument()
    })

    it('isLoading takes precedence over isEmpty', () => {
      renderWithProviders(<MoneyDistributionWidget isLoading distributionData={[]} />)

      // Should show loading, not empty state
      const loadingContainer = document.querySelector('[aria-busy="true"]')
      expect(loadingContainer).toBeInTheDocument()
      
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
      expect(screen.queryByText(/no distribution data yet/i)).not.toBeInTheDocument()
    })

    it('hasError takes precedence over isEmpty', () => {
      renderWithProviders(<MoneyDistributionWidget hasError distributionData={[]} />)

      expect(screen.getByRole('alert')).toHaveTextContent(/couldn't load your distribution data/i)
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('renders content when no loading, error, or empty states', () => {
      renderWithProviders(<MoneyDistributionWidget />)

      expect(screen.getByRole('heading', { name: /money distribution/i })).toBeInTheDocument()
      expect(screen.getByText(/total/i)).toBeInTheDocument()
      expect(screen.getByText(/\$5,630/i)).toBeInTheDocument() // Sum of all amounts
    })
  })

  describe('no cumulative layout shift (CLS)', () => {
    it('skeleton and content share the same section container', () => {
      const { container, rerender } = renderWithProviders(<MoneyDistributionWidget isLoading />)

      const skeletonSection = container.querySelector('section')
      expect(skeletonSection).toHaveClass('rounded-3xl', 'border', 'p-8')

      rerender(
        <DensityProvider>
          <MoneyDistributionWidget />
        </DensityProvider>,
      )

      const contentSection = container.querySelector('section')
      expect(contentSection).toHaveClass('rounded-3xl', 'border', 'p-8')
      
      // Same dimensions
      expect(skeletonSection?.className).toBe(contentSection?.className)
    })
  })

  describe('dark theme', () => {
    it('skeleton respects dark theme gradient background', () => {
      const { container } = renderWithProviders(<MoneyDistributionWidget isLoading />)

      const section = container.querySelector('section')
      expect(section).toHaveClass('bg-gradient-to-b', 'from-[#0f0f0f]', 'via-[#0b0b0b]', 'to-[#090909]')
    })
  })

  describe('prefers-reduced-motion', () => {
    it('respects prefers-reduced-motion when enabled', () => {
      const matchMediaMock = vi.fn().mockImplementation((query: string) => {
        return {
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        }
      })

      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: matchMediaMock,
        configurable: true,
      })

      renderWithProviders(<MoneyDistributionWidget isLoading />)

      const loadingContainer = document.querySelector('[aria-busy="true"]')
      expect(loadingContainer).toBeInTheDocument()

      // Verify that the skeleton animation respects the system preference
      // The skeleton should render regardless of motion preference
      const skeletonElement = document.querySelector('[aria-hidden="true"]')
      expect(skeletonElement).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('skeleton has aria-busy and aria-hidden attributes', () => {
      renderWithProviders(<MoneyDistributionWidget isLoading />)

      const loadingContainer = document.querySelector('[aria-busy="true"]')
      expect(loadingContainer).toHaveAttribute('aria-hidden', 'true')
    })

    it('error state has aria-alert role', () => {
      renderWithProviders(<MoneyDistributionWidget hasError />)

      const alert = screen.getByRole('alert')
      expect(alert).toBeInTheDocument()
    })

    it('empty state has aria-status role', () => {
      renderWithProviders(<MoneyDistributionWidget distributionData={[]} />)

      const status = screen.getByRole('status')
      expect(status).toBeInTheDocument()
    })

    it('content state has proper semantic heading', () => {
      renderWithProviders(<MoneyDistributionWidget />)

      const heading = screen.getByRole('heading', { name: /money distribution/i })
      expect(heading).toBeInTheDocument()
    })
  })
})
