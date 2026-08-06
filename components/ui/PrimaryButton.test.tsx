import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PrimaryButton from './PrimaryButton'

describe('PrimaryButton', () => {
  // ──────────────────────────────────────────────────────────────────────────
  // Rendering
  // ──────────────────────────────────────────────────────────────────────────

  it('renders with children', () => {
    render(<PrimaryButton>Submit</PrimaryButton>)
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
  })

  it('renders with complex children', () => {
    render(
      <PrimaryButton>
        <span data-testid="icon" />
        Pay Now
      </PrimaryButton>,
    )
    expect(screen.getByRole('button')).toBeInTheDocument()
    expect(screen.getByTestId('icon')).toBeInTheDocument()
    expect(screen.getByText('Pay Now')).toBeInTheDocument()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Default styling
  // ──────────────────────────────────────────────────────────────────────────

  it('applies base visual classes', () => {
    render(<PrimaryButton>Send</PrimaryButton>)
    const button = screen.getByRole('button')
    // Base layout classes
    expect(button.className).toContain('inline-flex')
    expect(button.className).toContain('items-center')
    expect(button.className).toContain('justify-center')
    // Brand colour
    expect(button.className).toContain('bg-brand.red')
    expect(button.className).toContain('text-white')
    // Sizing
    expect(button.className).toContain('px-6')
    expect(button.className).toContain('py-3')
    expect(button.className).toContain('rounded-lg')
    expect(button.className).toContain('font-semibold')
    // Transition
    expect(button.className).toContain('transition-colors')
    expect(button.className).toContain('duration-150')
  })

  it('applies hover classes', () => {
    render(<PrimaryButton>Send</PrimaryButton>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('hover:bg-brand.redHover')
  })

  it('applies focus classes', () => {
    render(<PrimaryButton>Send</PrimaryButton>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('focus:outline-none')
    expect(button.className).toContain('focus:ring-2')
    expect(button.className).toContain('focus:ring-brand.red')
    expect(button.className).toContain('focus:ring-offset-2')
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Disabled state
  // ──────────────────────────────────────────────────────────────────────────

  it('renders disabled when disabled prop is true', () => {
    render(<PrimaryButton disabled>Send</PrimaryButton>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('sets aria-disabled when disabled', () => {
    render(<PrimaryButton disabled>Send</PrimaryButton>)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('aria-disabled', 'true')
  })

  it('does not set aria-disabled when enabled', () => {
    render(<PrimaryButton>Send</PrimaryButton>)
    const button = screen.getByRole('button')
    expect(button).not.toHaveAttribute('aria-disabled')
  })

  it('applies disabled visual classes', () => {
    render(<PrimaryButton disabled>Send</PrimaryButton>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('disabled:opacity-50')
    expect(button.className).toContain('disabled:cursor-not-allowed')
    expect(button.className).toContain('disabled:hover:bg-brand.red')
  })

  it('does not trigger onClick when disabled', async () => {
    const user = userEvent.setup()
    let clicked = false
    render(
      <PrimaryButton disabled onClick={() => { clicked = true }}>
        Send
      </PrimaryButton>,
    )
    await user.click(screen.getByRole('button'))
    expect(clicked).toBe(false)
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Custom className merging
  // ──────────────────────────────────────────────────────────────────────────

  it('merges custom className with default classes', () => {
    render(<PrimaryButton className="extra-class">Send</PrimaryButton>)
    const button = screen.getByRole('button')
    expect(button.className).toContain('extra-class')
    // Default classes should still be present
    expect(button.className).toContain('bg-brand.red')
    expect(button.className).toContain('inline-flex')
  })

  // ──────────────────────────────────────────────────────────────────────────
  // forwardRef support
  // ──────────────────────────────────────────────────────────────────────────

  it('forwards ref to the button element', () => {
    const ref = { current: null as HTMLButtonElement | null }
    render(<PrimaryButton ref={ref}>Send</PrimaryButton>)
    expect(ref.current).toBeInstanceOf(HTMLButtonElement)
    expect(ref.current?.tagName).toBe('BUTTON')
  })

  it('has correct displayName', () => {
    expect(PrimaryButton.displayName).toBe('PrimaryButton')
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Additional HTML button attributes
  // ──────────────────────────────────────────────────────────────────────────

  it('supports type attribute', () => {
    render(<PrimaryButton type="submit">Submit</PrimaryButton>)
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('supports aria-label', () => {
    render(<PrimaryButton aria-label="Close dialog">X</PrimaryButton>)
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeInTheDocument()
  })

  it('supports data-* attributes', () => {
    render(<PrimaryButton data-testid="submit-btn">Send</PrimaryButton>)
    expect(screen.getByTestId('submit-btn')).toBeInTheDocument()
  })

  // ──────────────────────────────────────────────────────────────────────────
  // Interaction parity: hover then focus
  // ──────────────────────────────────────────────────────────────────────────

  it('maintains hover class when focused', async () => {
    const user = userEvent.setup()
    render(<PrimaryButton>Send</PrimaryButton>)
    const button = screen.getByRole('button')

    await user.hover(button)
    // Hover classes are present
    expect(button.className).toContain('hover:bg-brand.redHover')

    // Focus does not remove hover
    button.focus()
    expect(button.className).toContain('hover:bg-brand.redHover')
    // Focus classes are also present
    expect(button.className).toContain('focus:ring-2')
  })
})