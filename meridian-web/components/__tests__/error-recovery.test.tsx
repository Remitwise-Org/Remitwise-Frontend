import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorRecovery } from '@/components/error-recovery'

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }))

vi.mock('sonner', () => ({
  toast: { error: toastError },
}))

describe('ErrorRecovery', () => {
  beforeEach(() => {
    toastError.mockClear()
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: true })
  })

  it('renders a safe recovery state and invokes the boundary reset', () => {
    const reset = vi.fn()
    render(<ErrorRecovery error={new Error('database password=secret')} reset={reset} boundary="test" />)

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument()
    expect(screen.queryByText(/database password/i)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(reset).toHaveBeenCalledTimes(1)
  })

  it('updates its guidance when the browser goes offline and cleans up listeners', () => {
    const removeEventListener = vi.spyOn(window, 'removeEventListener')
    const { unmount } = render(<ErrorRecovery error={new Error('failed')} reset={vi.fn()} boundary="test" />)

    Object.defineProperty(window.navigator, 'onLine', { configurable: true, value: false })
    fireEvent(window, new Event('offline'))
    expect(screen.getByRole('heading', { name: 'You are offline' })).toBeInTheDocument()

    unmount()
    expect(removeEventListener).toHaveBeenCalledWith('online', expect.any(Function))
    expect(removeEventListener).toHaveBeenCalledWith('offline', expect.any(Function))
  })
})
