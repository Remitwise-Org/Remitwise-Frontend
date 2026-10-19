// @vitest-environment jsdom
/**
 * Tests for the quote-fetch behaviour in AmountCurrencySection:
 *  1. The quote API is only called after a 300 ms debounce pause.
 *  2. Any in-flight request is cancelled (AbortError) when a new query
 *     arrives before the previous fetch resolves.
 *
 * Closes #<issue>  (300 ms debounce, cancel-in-flight-on-new-query)
 */

import React, { act } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock,
} from 'vitest'

import AmountCurrencySection from '@/app/send/components/AmountCurrencySection'

// ---------------------------------------------------------------------------
// Module mocks — must be at the top level of the file
// ---------------------------------------------------------------------------

vi.mock('@/lib/context/RatesContext', () => ({
  useExchangeRates: () => ({
    rates: [],
    loading: false,
    stale: false,
    error: null,
    refresh: vi.fn(),
  }),
}))

vi.mock('@/lib/i18n/client', () => ({
  useClientTranslator: () => ({ t: (key: string) => key }),
  useClientLocale: () => 'en-US',
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A resolvable promise that lets tests control exactly when a fetch settles. */
function createControllableFetch() {
  let resolveFn!: (value: Response) => void
  let rejectFn!: (reason: unknown) => void
  const promise = new Promise<Response>((resolve, reject) => {
    resolveFn = resolve
    rejectFn = reject
  })
  return { promise, resolve: resolveFn, reject: rejectFn }
}

/** Type into the amount input using synchronous fireEvent calls (compatible with fake timers). */
function typeAmount(input: HTMLElement, value: string) {
  act(() => {
    fireEvent.change(input, { target: { value } })
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AmountCurrencySection — debounce & cancel-in-flight', () => {
  let fetchMock: Mock

  beforeEach(() => {
    vi.useFakeTimers()
    fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('does NOT call the quote API before the 300 ms debounce elapses', () => {
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }))

    render(<AmountCurrencySection />)
    const input = screen.getByPlaceholderText('0.00')

    typeAmount(input, '5')

    // Only 100 ms have passed — the debounce has not fired yet.
    act(() => { vi.advanceTimersByTime(100) })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('calls the quote API exactly once after the 300 ms debounce', () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ quote: 4.75 }), { status: 200 }),
    )

    render(<AmountCurrencySection />)
    const input = screen.getByPlaceholderText('0.00')

    typeAmount(input, '5')

    // Advance past the debounce delay.
    act(() => { vi.advanceTimersByTime(300) })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/remittance/quote'),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
  })

  it('aborts the previous in-flight request when a new query arrives', () => {
    const first = createControllableFetch()
    const second = createControllableFetch()

    fetchMock
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)

    render(<AmountCurrencySection />)
    const input = screen.getByPlaceholderText('0.00')

    // Type "5" → debounce fires → first fetch starts.
    typeAmount(input, '5')
    act(() => { vi.advanceTimersByTime(300) })
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // The signal for the first call must not yet be aborted.
    const firstSignal: AbortSignal = fetchMock.mock.calls[0][1].signal
    expect(firstSignal.aborted).toBe(false)

    // Type "50" → triggers a second debounce before the first fetch resolves.
    typeAmount(input, '50')
    act(() => { vi.advanceTimersByTime(300) })
    expect(fetchMock).toHaveBeenCalledTimes(2)

    // The first request's signal must now be aborted (cancelled by the component).
    expect(firstSignal.aborted).toBe(true)

    // The second request's signal is still live.
    const secondSignal: AbortSignal = fetchMock.mock.calls[1][1].signal
    expect(secondSignal.aborted).toBe(false)

    // Settle the second fetch to avoid dangling promise warnings.
    act(() => {
      second.resolve(
        new Response(JSON.stringify({ quote: 47.5 }), { status: 200 }),
      )
    })
  })

  it('does NOT update quote state when a fetch is intentionally aborted', () => {
    // The component should silently swallow AbortErrors and not set an error state.
    const abortError = new DOMException('The user aborted a request.', 'AbortError')
    fetchMock.mockRejectedValue(abortError)

    render(<AmountCurrencySection />)
    const input = screen.getByPlaceholderText('0.00')

    typeAmount(input, '5')
    act(() => { vi.advanceTimersByTime(300) })

    // Even though the fetch was "aborted", no error text should appear.
    expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
  })

  it('rejects amounts with more than 2 decimal places', () => {
    render(<AmountCurrencySection />)
    const input = screen.getByPlaceholderText('0.00')

    // "5.123" has 3 decimal places — should show an error.
    typeAmount(input, '5.123')
    expect(screen.getByText('Amount must have at most 2 decimal places')).toBeInTheDocument()

    // "5.12" has 2 decimal places — no error.
    typeAmount(input, '5.12')
    expect(screen.queryByText('Amount must have at most 2 decimal places')).not.toBeInTheDocument()

    // "5" (integer) has no decimal places — no error.
    typeAmount(input, '5')
    expect(screen.queryByText('Amount must have at most 2 decimal places')).not.toBeInTheDocument()
  })
})
