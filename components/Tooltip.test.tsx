import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Tooltip from './Tooltip'

describe('Tooltip', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('renders trigger element and does not render tooltip initially', () => {
    render(
      <Tooltip content="Tooltip text">
        <button type="button">Trigger</button>
      </Tooltip>,
    )

    const trigger = screen.getByRole('button', { name: 'Trigger' })
    expect(trigger).toBeInTheDocument()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(trigger).not.toHaveAttribute('aria-describedby')
  })

  it('shows tooltip on hover after delay and sets aria-describedby', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <Tooltip content="Helper information" delay={300}>
        <button type="button">Hover me</button>
      </Tooltip>,
    )

    const trigger = screen.getByRole('button', { name: 'Hover me' })

    await user.hover(trigger)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toBeInTheDocument()
    expect(tooltip).toHaveTextContent('Helper information')
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id)

    await user.unhover(trigger)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(trigger).not.toHaveAttribute('aria-describedby')
  })

  it('shows tooltip on focus and hides on blur', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <div>
        <Tooltip content="Focused tooltip">
          <button type="button">Focus me</button>
        </Tooltip>
        <button type="button">Other button</button>
      </div>,
    )

    const trigger = screen.getByRole('button', { name: 'Focus me' })

    await user.tab()
    expect(trigger).toHaveFocus()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toBeInTheDocument()
    expect(tooltip).toHaveTextContent('Focused tooltip')
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id)

    await user.tab()
    expect(trigger).not.toHaveFocus()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(trigger).not.toHaveAttribute('aria-describedby')
  })

  it('dismisses tooltip when Escape key is pressed', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <Tooltip content="Dismissible tooltip">
        <button type="button">Trigger</button>
      </Tooltip>,
    )

    const trigger = screen.getByRole('button', { name: 'Trigger' })

    await user.tab()
    expect(trigger).toHaveFocus()

    act(() => {
      vi.advanceTimersByTime(300)
    })

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id)

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(trigger).not.toHaveAttribute('aria-describedby')
  })

  it('respects custom delay prop', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <Tooltip content="Custom delay" delay={500}>
        <button type="button">Trigger</button>
      </Tooltip>,
    )

    const trigger = screen.getByRole('button', { name: 'Trigger' })

    await user.hover(trigger)

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })

  it('cancels scheduled show if unhovered before delay expires', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <Tooltip content="Will not show" delay={300}>
        <button type="button">Trigger</button>
      </Tooltip>,
    )

    const trigger = screen.getByRole('button', { name: 'Trigger' })

    await user.hover(trigger)
    act(() => {
      vi.advanceTimersByTime(150)
    })
    await user.unhover(trigger)

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(trigger).not.toHaveAttribute('aria-describedby')
  })

  it('applies correct side classes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { rerender } = render(
      <Tooltip content="Side test" side="bottom">
        <button type="button">Trigger</button>
      </Tooltip>,
    )

    const trigger = screen.getByRole('button', { name: 'Trigger' })
    await user.hover(trigger)
    act(() => {
      vi.advanceTimersByTime(300)
    })

    let tooltip = screen.getByRole('tooltip')
    expect(tooltip.className).toContain('top-full')

    rerender(
      <Tooltip content="Side test" side="left">
        <button type="button">Trigger</button>
      </Tooltip>,
    )
    tooltip = screen.getByRole('tooltip')
    expect(tooltip.className).toContain('right-full')

    rerender(
      <Tooltip content="Side test" side="right">
        <button type="button">Trigger</button>
      </Tooltip>,
    )
    tooltip = screen.getByRole('tooltip')
    expect(tooltip.className).toContain('left-full')
  })

  it('displays disabledReason immediately when trigger button is disabled', () => {
    render(
      <Tooltip content="Regular content" disabledReason="This feature is disabled">
        <button type="button" disabled>
          Disabled Button
        </button>
      </Tooltip>,
    )

    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toBeInTheDocument()
    expect(tooltip).toHaveTextContent('This feature is disabled')

    const trigger = screen.getByRole('button', { name: 'Disabled Button' })
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id)
  })
})
