import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSaveData } from '@/lib/hooks/useSaveData'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a minimal mock of `navigator.connection` that supports `saveData`
 * and emits "change" events via `addEventListener`.
 */
function makeConnection(initialSaveData: boolean) {
  let _saveData = initialSaveData
  const listeners: Array<() => void> = []

  const connection = {
    get saveData() {
      return _saveData
    },
    addEventListener(_event: string, cb: () => void) {
      listeners.push(cb)
    },
    removeEventListener(_event: string, cb: () => void) {
      const idx = listeners.indexOf(cb)
      if (idx !== -1) listeners.splice(idx, 1)
    },
    /** Test-only helper: flip saveData and fire all "change" listeners. */
    _set(value: boolean) {
      _saveData = value
      listeners.forEach((cb) => cb())
    },
    get _listenerCount() {
      return listeners.length
    },
  }

  return connection
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useSaveData', () => {
  let originalConnection: unknown

  beforeEach(() => {
    originalConnection = (navigator as any).connection
  })

  afterEach(() => {
    // Restore to original value (usually undefined in jsdom)
    Object.defineProperty(navigator, 'connection', {
      value: originalConnection,
      writable: true,
      configurable: true,
    })
  })

  it('returns false by default when navigator.connection is not present', () => {
    Object.defineProperty(navigator, 'connection', {
      value: undefined,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useSaveData())
    expect(result.current).toBe(false)
  })

  it('returns false when navigator.connection.saveData is false', () => {
    const connection = makeConnection(false)
    Object.defineProperty(navigator, 'connection', {
      value: connection,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useSaveData())
    expect(result.current).toBe(false)
  })

  it('returns true when navigator.connection.saveData is true', () => {
    const connection = makeConnection(true)
    Object.defineProperty(navigator, 'connection', {
      value: connection,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useSaveData())
    expect(result.current).toBe(true)
  })

  it('updates reactively when saveData changes at runtime', () => {
    const connection = makeConnection(false)
    Object.defineProperty(navigator, 'connection', {
      value: connection,
      writable: true,
      configurable: true,
    })

    const { result } = renderHook(() => useSaveData())
    expect(result.current).toBe(false)

    act(() => {
      connection._set(true)
    })
    expect(result.current).toBe(true)

    act(() => {
      connection._set(false)
    })
    expect(result.current).toBe(false)
  })

  it('removes the change listener on unmount', () => {
    const connection = makeConnection(false)
    Object.defineProperty(navigator, 'connection', {
      value: connection,
      writable: true,
      configurable: true,
    })

    const { unmount } = renderHook(() => useSaveData())
    expect(connection._listenerCount).toBe(1)

    unmount()
    expect(connection._listenerCount).toBe(0)
  })

  it('gracefully handles a connection object without addEventListener', () => {
    Object.defineProperty(navigator, 'connection', {
      value: { saveData: true },
      writable: true,
      configurable: true,
    })

    // Should not throw; picks up the initial value but cannot subscribe.
    const { result } = renderHook(() => useSaveData())
    expect(result.current).toBe(true)
  })
})
