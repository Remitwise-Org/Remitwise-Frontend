import { vi, describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import FeatureFlagIndicator from './FeatureFlagIndicator'

const ORIGINAL_ENV = { ...process.env }

const mockPathname = vi.fn()

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}))

beforeEach(() => {
  vi.restoreAllMocks()
  process.env = { ...ORIGINAL_ENV }
  mockPathname.mockReturnValue('/dashboard')
})

describe('FeatureFlagIndicator', () => {
  it('renders nothing in non-development environments', () => {
    process.env.NODE_ENV = 'production'
    mockPathname.mockReturnValue('/dashboard')
    process.env.NEXT_PUBLIC_SESSION_REFRESH_ENABLED = 'true'

    const { container } = render(<FeatureFlagIndicator />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when on an un-flagged route', () => {
    process.env.NODE_ENV = 'development'
    mockPathname.mockReturnValue('/settings')

    const { container } = render(<FeatureFlagIndicator />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when the flag env var is not set', () => {
    process.env.NODE_ENV = 'development'
    mockPathname.mockReturnValue('/dashboard')
    delete process.env.NEXT_PUBLIC_SESSION_REFRESH_ENABLED

    const { container } = render(<FeatureFlagIndicator />)
    expect(container.innerHTML).toBe('')
  })

  it('renders the flag label when on a flagged route with the flag enabled', () => {
    process.env.NODE_ENV = 'development'
    mockPathname.mockReturnValue('/dashboard')
    process.env.NEXT_PUBLIC_SESSION_REFRESH_ENABLED = 'true'

    render(<FeatureFlagIndicator />)
    expect(screen.getByText(/Session Refresh/)).toBeInTheDocument()
  })

  it('renders nothing when flag env var is "false" even on a matching route', () => {
    process.env.NODE_ENV = 'development'
    mockPathname.mockReturnValue('/dashboard')
    process.env.NEXT_PUBLIC_SESSION_REFRESH_ENABLED = 'false'

    const { container } = render(<FeatureFlagIndicator />)
    expect(container.innerHTML).toBe('')
  })

  it('renders the indicator container with the test id', () => {
    process.env.NODE_ENV = 'development'
    mockPathname.mockReturnValue('/dashboard')
    process.env.NEXT_PUBLIC_SESSION_REFRESH_ENABLED = 'true'

    render(<FeatureFlagIndicator />)
    expect(document.getElementById('feature-flag-indicator')).not.toBeNull()
  })
})