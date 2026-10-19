import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useSafeReload } from './useSafeReload'

describe('useSafeReload', () => {
  const originalAddEventListener = window.addEventListener
  const originalRemoveEventListener = window.removeEventListener

  let addEventListenerSpy: ReturnType<typeof vi.spyOn>
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('registers beforeunload when isDirty is true', () => {
    renderHook(() => useSafeReload(true))
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    )
  })

  it('does not register beforeunload when isDirty is false', () => {
    renderHook(() => useSafeReload(false))
    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    )
  })

  it('removes the listener on unmount when isDirty was true', () => {
    const { unmount } = renderHook(() => useSafeReload(true))
    unmount()
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    )
  })

  it('re-registers when isDirty changes from false to true', () => {
    const { rerender } = renderHook(({ dirty }) => useSafeReload(dirty), {
      initialProps: { dirty: false },
    })

    expect(addEventListenerSpy).not.toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    )

    rerender({ dirty: true })
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    )
  })

  it('removes old listener and registers new one when isDirty changes from true to false then back', () => {
    const { rerender } = renderHook(({ dirty }) => useSafeReload(dirty), {
      initialProps: { dirty: true },
    })

    const handler1 = addEventListenerSpy.mock.calls.find(
      ([event]) => event === 'beforeunload',
    )?.[1]

    rerender({ dirty: false })

    expect(removeEventListenerSpy).toHaveBeenCalledWith('beforeunload', handler1)

    rerender({ dirty: true })

    expect(addEventListenerSpy).toHaveBeenCalledTimes(2)
  })

  it('registered handler calls preventDefault and sets returnValue', () => {
    const mockEvent = {
      preventDefault: vi.fn(),
      returnValue: 'non-empty',
    } as unknown as BeforeUnloadEvent

    renderHook(() => useSafeReload(true))

    const handler = addEventListenerSpy.mock.calls.find(
      ([event]) => event === 'beforeunload',
    )?.[1] as (e: BeforeUnloadEvent) => void

    handler(mockEvent)
    expect(mockEvent.preventDefault).toHaveBeenCalled()
    expect(mockEvent.returnValue).toBe('')
  })
})