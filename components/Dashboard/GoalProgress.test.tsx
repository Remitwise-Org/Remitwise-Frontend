import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import GoalProgress from '@/components/Dashboard/GoalProgress'

const defaultProps = {
  name: 'Emergency Fund',
  current: 500,
  target: 1000,
  gradient: { from: '#DC2626', to: '#B91C1C' },
}

afterEach(() => {
  cleanup()
})

describe('GoalProgress — default (content) state', () => {
  it('renders the goal name', () => {
    render(<GoalProgress {...defaultProps} />)
    expect(screen.getByText('Emergency Fund')).toBeInTheDocument()
  })

  it('renders the target amount', () => {
    render(<GoalProgress {...defaultProps} />)
    expect(screen.getByText('$1000')).toBeInTheDocument()
  })

  it('renders the progress bar with correct aria attributes', () => {
    render(<GoalProgress {...defaultProps} />)
    const bar = screen.getByRole('progressbar', { name: /emergency fund progress/i })
    expect(bar).toBeInTheDocument()
    expect(bar).toHaveAttribute('aria-valuenow', '50')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('clamps percentage at 100% when current exceeds target', () => {
    render(<GoalProgress {...defaultProps} current={1500} target={1000} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '100')
  })

  it('shows 0% when current is 0', () => {
    render(<GoalProgress {...defaultProps} current={0} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '0')
  })
})

describe('GoalProgress — error state', () => {
  it('renders WidgetErrorState when hasError is true', () => {
    render(<GoalProgress {...defaultProps} hasError />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('shows the goal name in the error message', () => {
    render(<GoalProgress {...defaultProps} hasError />)
    expect(screen.getByText(/couldn't load data for "Emergency Fund"/i)).toBeInTheDocument()
  })

  it('calls onRetry when the retry button is clicked', async () => {
    const onRetry = vi.fn()
    render(<GoalProgress {...defaultProps} hasError onRetry={onRetry} />)
    await userEvent.click(screen.getByRole('button', { name: /retry loading data/i }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('does not render the progress bar in error state', () => {
    render(<GoalProgress {...defaultProps} hasError />)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})

describe('GoalProgress — empty state', () => {
  it('renders WidgetEmptyState when isEmpty is true', () => {
    render(<GoalProgress {...defaultProps} isEmpty />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows the goal name in the empty state title', () => {
    render(<GoalProgress {...defaultProps} isEmpty />)
    expect(screen.getByText(/no progress for "Emergency Fund" yet/i)).toBeInTheDocument()
  })

  it('renders an "Add to this goal" CTA linking to /goals', () => {
    render(<GoalProgress {...defaultProps} isEmpty />)
    const link = screen.getByRole('link', { name: /add to this goal/i })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/goals')
  })

  it('does not render the progress bar in empty state', () => {
    render(<GoalProgress {...defaultProps} isEmpty />)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
})

describe('GoalProgress — state precedence', () => {
  it('hasError takes precedence over isEmpty', () => {
    render(<GoalProgress {...defaultProps} hasError isEmpty />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('error state takes precedence over content', () => {
    render(<GoalProgress {...defaultProps} hasError />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('empty state takes precedence over content', () => {
    render(<GoalProgress {...defaultProps} isEmpty />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('renders content when both hasError and isEmpty are false', () => {
    render(<GoalProgress {...defaultProps} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
