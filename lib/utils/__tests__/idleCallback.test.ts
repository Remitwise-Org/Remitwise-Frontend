import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  polyfillRequestIdleCallback,
  safeRequestIdleCallback,
  safeCancelIdleCallback,
} from '../idleCallback';
import {
  IDLE_CALLBACK_DEFAULT_TIMEOUT_MS,
  IDLE_CALLBACK_FALLBACK_DELAY_MS,
} from '@/lib/config/idle';

describe('idleCallback polyfill & utilities', () => {
  const originalRequestIdleCallback = window.requestIdleCallback;
  const originalCancelIdleCallback = window.cancelIdleCallback;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (originalRequestIdleCallback) {
      window.requestIdleCallback = originalRequestIdleCallback;
    } else {
      delete (window as any).requestIdleCallback;
    }
    if (originalCancelIdleCallback) {
      window.cancelIdleCallback = originalCancelIdleCallback;
    } else {
      delete (window as any).cancelIdleCallback;
    }
  });

  it('should polyfill window.requestIdleCallback and window.cancelIdleCallback when missing (Safari mode)', () => {
    delete (window as any).requestIdleCallback;
    delete (window as any).cancelIdleCallback;

    polyfillRequestIdleCallback();

    expect(typeof window.requestIdleCallback).toBe('function');
    expect(typeof window.cancelIdleCallback).toBe('function');

    const cb = vi.fn();
    const handle = window.requestIdleCallback(cb);

    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(IDLE_CALLBACK_FALLBACK_DELAY_MS);
    expect(cb).toHaveBeenCalledTimes(1);

    const deadline = cb.mock.calls[0][0];
    expect(deadline.didTimeout).toBe(false);
    expect(typeof deadline.timeRemaining).toBe('function');
    expect(deadline.timeRemaining()).toBeGreaterThanOrEqual(0);
    expect(deadline.timeRemaining()).toBeLessThanOrEqual(IDLE_CALLBACK_DEFAULT_TIMEOUT_MS);

    window.cancelIdleCallback(handle);
  });

  it('should allow cancelling polyfilled requestIdleCallback before execution', () => {
    delete (window as any).requestIdleCallback;
    delete (window as any).cancelIdleCallback;

    polyfillRequestIdleCallback();

    const cb = vi.fn();
    const handle = window.requestIdleCallback(cb);

    window.cancelIdleCallback(handle);
    vi.advanceTimersByTime(IDLE_CALLBACK_FALLBACK_DELAY_MS);
    expect(cb).not.toHaveBeenCalled();
  });

  it('safeRequestIdleCallback should fall back to setTimeout when requestIdleCallback is unavailable', () => {
    delete (window as any).requestIdleCallback;

    const cb = vi.fn();
    const handle = safeRequestIdleCallback(cb);

    expect(cb).not.toHaveBeenCalled();
    vi.advanceTimersByTime(IDLE_CALLBACK_FALLBACK_DELAY_MS);
    expect(cb).toHaveBeenCalledTimes(1);

    safeCancelIdleCallback(handle);
  });

  it('safeRequestIdleCallback should use native window.requestIdleCallback when present', () => {
    const mockNativeRequest = vi.fn().mockReturnValue(12345);
    window.requestIdleCallback = mockNativeRequest;

    const cb = vi.fn();
    const handle = safeRequestIdleCallback(cb);

    expect(mockNativeRequest).toHaveBeenCalledWith(cb, undefined);
    expect(handle).toBe(12345);
  });

  it('safeCancelIdleCallback should use native window.cancelIdleCallback when present', () => {
    const mockNativeCancel = vi.fn();
    window.cancelIdleCallback = mockNativeCancel;

    safeCancelIdleCallback(999);
    expect(mockNativeCancel).toHaveBeenCalledWith(999);
  });
});
