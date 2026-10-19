import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ShortcutTooltip, { normaliseShortcut } from './ShortcutTooltip'

describe('ShortcutTooltip', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 1 — Rendering (3 tests)
  // ──────────────────────────────────────────────────────────────────────────

  it('renders children correctly', () => {
    render(
      <ShortcutTooltip label="Command Palette" shortcut="⌘K">
        <button>Open</button>
      </ShortcutTooltip>
    )
    expect(screen.getByRole('button', { name: 'Open' })).toBeInTheDocument()
  })

  it('does not show tooltip by default', () => {
    render(
      <ShortcutTooltip label="Command Palette" shortcut="⌘K">
        <button>Open</button>
      </ShortcutTooltip>
    )
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('renders sr-only text for screen readers', () => {
    render(
      <ShortcutTooltip label="Command Palette" shortcut="⌘K">
        <button>Open</button>
      </ShortcutTooltip>
    )
    const srOnlyText = screen.getByText(/Command Palette/)
    expect(srOnlyText).toHaveClass('sr-only')
  })

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 2 — Hover behavior (3 tests)
  // ──────────────────────────────────────────────────────────────────────────

  it('shows tooltip on mouse enter', async () => {
    const user = userEvent.setup()
    render(
      <ShortcutTooltip label="Command Palette" shortcut="⌘K">
        <button>Open</button>
      </ShortcutTooltip>
    )
    const button = screen.getByRole('button', { name: 'Open' })
    await user.hover(button)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })

  it('hides tooltip on mouse leave', async () => {
    const user = userEvent.setup()
    render(
      <ShortcutTooltip label="Command Palette" shortcut="⌘K">
        <button>Open</button>
      </ShortcutTooltip>
    )
    const button = screen.getByRole('button', { name: 'Open' })
    await user.hover(button)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    await user.unhover(button)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('tooltip shows label and shortcut text', async () => {
    const user = userEvent.setup()
    render(
      <ShortcutTooltip label="Command Palette" shortcut="⌘K">
        <button>Open</button>
      </ShortcutTooltip>
    )
    await user.hover(screen.getByRole('button', { name: 'Open' }))
    expect(screen.getByText('Command Palette')).toBeInTheDocument()
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 3 — Keyboard accessibility (4 tests)
  // ──────────────────────────────────────────────────────────────────────────

  it('shows tooltip on focus', async () => {
    render(
      <ShortcutTooltip label="Command Palette" shortcut="⌘K">
        <button>Open</button>
      </ShortcutTooltip>
    )
    const button = screen.getByRole('button', { name: 'Open' })
    button.focus()
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })

  it('hides tooltip on blur', async () => {
    render(
      <ShortcutTooltip label="Command Palette" shortcut="⌘K">
        <button>Open</button>
      </ShortcutTooltip>
    )
    const button = screen.getByRole('button', { name: 'Open' })
    button.focus()
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    button.blur()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('hides tooltip when Escape pressed', async () => {
    const user = userEvent.setup()
    render(
      <ShortcutTooltip label="Command Palette" shortcut="⌘K">
        <button>Open</button>
      </ShortcutTooltip>
    )
    const button = screen.getByRole('button', { name: 'Open' })
    button.focus()
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('tooltip has role="tooltip" and id for ARIA', async () => {
    const user = userEvent.setup()
    render(
      <ShortcutTooltip label="Command Palette" shortcut="⌘K">
        <button>Open</button>
      </ShortcutTooltip>
    )
    await user.hover(screen.getByRole('button', { name: 'Open' }))
    const tooltip = screen.getByRole('tooltip')
    expect(tooltip).toHaveAttribute('id')
    expect(tooltip).toHaveAttribute('role', 'tooltip')
  })

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 4 — Platform shortcut normalisation (3 tests)
  // ──────────────────────────────────────────────────────────────────────────

  it('shows ⌘K on macOS', () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform')
    Object.defineProperty(navigator, 'platform', {
      value: 'MacIntel',
      configurable: true,
    })
    try {
      expect(normaliseShortcut('⌘K')).toBe('⌘K')
    } finally {
      if (originalPlatform) {
        Object.defineProperty(navigator, 'platform', originalPlatform)
      }
    }
  })

  it('shows Ctrl+K on non-macOS', () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform')
    Object.defineProperty(navigator, 'platform', {
      value: 'Win32',
      configurable: true,
    })
    try {
      expect(normaliseShortcut('⌘K')).toBe('Ctrl+K')
    } finally {
      if (originalPlatform) {
        Object.defineProperty(navigator, 'platform', originalPlatform)
      }
    }
  })

  it('handles Shift modifier correctly', () => {
    const originalPlatform = Object.getOwnPropertyDescriptor(navigator, 'platform')
    Object.defineProperty(navigator, 'platform', {
      value: 'Win32',
      configurable: true,
    })
    try {
      expect(normaliseShortcut('⌘⇧P')).toBe('Ctrl+Shift+P')
    } finally {
      if (originalPlatform) {
        Object.defineProperty(navigator, 'platform', originalPlatform)
      }
    }
  })

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 5 — Accessibility (2 tests)
  // ──────────────────────────────────────────────────────────────────────────

  it('kbd element has aria-label for screen readers', async () => {
    const user = userEvent.setup()
    render(
      <ShortcutTooltip label="Command Palette" shortcut="⌘K">
        <button>Open</button>
      </ShortcutTooltip>
    )
    await user.hover(screen.getByRole('button', { name: 'Open' }))
    const kbd = document.querySelector('kbd')
    expect(kbd).toHaveAttribute('aria-label')
    expect(kbd?.getAttribute('aria-label')).toContain('keyboard shortcut')
  })

  it('passes aria-describedby linking when visible', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <ShortcutTooltip label="Command Palette" shortcut="⌘K">
        <button aria-label="Command Palette">Open</button>
      </ShortcutTooltip>
    )
    await user.hover(screen.getByRole('button', { name: 'Open' }))
    
    // Check that the wrapper div now has aria-describedby pointing to tooltip
    const wrapper = container.querySelector('[aria-describedby]')
    expect(wrapper).toBeInTheDocument()
    
    const tooltipId = wrapper?.getAttribute('aria-describedby')
    const tooltip = document.getElementById(tooltipId!)
    expect(tooltip).toBeInTheDocument()
    expect(tooltip).toHaveAttribute('role', 'tooltip')
  })

  // ──────────────────────────────────────────────────────────────────────────
  // SUITE 6 — Positioning (1 test)
  // ──────────────────────────────────────────────────────────────────────────

  it('applies correct position classes based on side prop', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <ShortcutTooltip label="Command Palette" shortcut="⌘K" side="top">
        <button>Open</button>
      </ShortcutTooltip>
    )
    await user.hover(screen.getByRole('button', { name: 'Open' }))
    let tooltip = screen.getByRole('tooltip')
    expect(tooltip.className).toContain('bottom-full')

    rerender(
      <ShortcutTooltip label="Command Palette" shortcut="⌘K" side="left">
        <button>Open</button>
      </ShortcutTooltip>
    )
    tooltip = screen.getByRole('tooltip')
    expect(tooltip.className).toContain('right-full')
  })
})
