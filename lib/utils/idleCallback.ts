import {
  IDLE_CALLBACK_DEFAULT_TIMEOUT_MS,
  IDLE_CALLBACK_FALLBACK_DELAY_MS,
} from '@/lib/config/idle';

export interface PolyfillIdleDeadline {
  readonly didTimeout: boolean;
  timeRemaining: () => number;
}

export type PolyfillIdleCallback = (deadline: PolyfillIdleDeadline) => void;

/**
 * Polyfills window.requestIdleCallback and window.cancelIdleCallback on browsers
 * that lack native support (such as Safari / WebKit engines).
 * Uses a small setTimeout wrapper to schedule callbacks safely.
 */
export function polyfillRequestIdleCallback(): void {
  if (typeof window === 'undefined') return;

  if (typeof window.requestIdleCallback !== 'function') {
    (window as any).requestIdleCallback = function (
      cb: (deadline: PolyfillIdleDeadline) => void,
      _options?: { timeout?: number }
    ): number {
      const start = Date.now();
      return window.setTimeout(() => {
        cb({
          didTimeout: false,
          timeRemaining: () =>
            Math.max(0, IDLE_CALLBACK_DEFAULT_TIMEOUT_MS - (Date.now() - start)),
        });
      }, IDLE_CALLBACK_FALLBACK_DELAY_MS) as unknown as number;
    };
  }

  if (typeof window.cancelIdleCallback !== 'function') {
    (window as any).cancelIdleCallback = function (id: number): void {
      window.clearTimeout(id);
    };
  }
}

/**
 * Safe wrapper for scheduling an idle callback.
 * Invokes native window.requestIdleCallback if supported; otherwise falls back to a setTimeout wrapper.
 *
 * @param cb - Callback function to execute when idle
 * @param options - Optional IdleRequestOptions (e.g. { timeout })
 * @returns Handle identifier that can be passed to safeCancelIdleCallback
 */
export function safeRequestIdleCallback(
  cb: PolyfillIdleCallback,
  options?: { timeout?: number }
): number {
  if (typeof window !== 'undefined' && typeof window.requestIdleCallback === 'function') {
    return window.requestIdleCallback(cb as any, options);
  }

  const start = Date.now();
  return setTimeout(() => {
    cb({
      didTimeout: false,
      timeRemaining: () =>
        Math.max(0, IDLE_CALLBACK_DEFAULT_TIMEOUT_MS - (Date.now() - start)),
    });
  }, IDLE_CALLBACK_FALLBACK_DELAY_MS) as unknown as number;
}

/**
 * Safe wrapper for canceling an idle callback.
 * Invokes native window.cancelIdleCallback if supported; otherwise clears the fallback timeout.
 *
 * @param id - Handle identifier returned by safeRequestIdleCallback
 */
export function safeCancelIdleCallback(id: number): void {
  if (typeof window !== 'undefined' && typeof window.cancelIdleCallback === 'function') {
    window.cancelIdleCallback(id);
    return;
  }
  clearTimeout(id);
}

// Auto-run polyfill initialization on browser load
if (typeof window !== 'undefined') {
  polyfillRequestIdleCallback();
}
