/**
 * `fetchWithTimeout` — a lightweight `fetch` wrapper that aborts the request
 * after a configurable deadline.
 *
 * ## Quick start
 *
 * ```ts
 * import { fetchWithTimeout } from '@/lib/fetch-timeout';
 *
 * // Uses the per-endpoint policy from lib/config/fetch-timeouts automatically.
 * const response = await fetchWithTimeout('/api/anchor/rates');
 *
 * // Override the timeout for a one-off call.
 * const response = await fetchWithTimeout('/api/send', { method: 'POST', body }, 20_000);
 * ```
 *
 * ## Per-endpoint policy
 *
 * When no explicit `timeoutMs` is passed the timeout is resolved by calling
 * {@link getTimeoutForUrl} from `lib/config/fetch-timeouts.ts`. That function
 * walks the {@link ENDPOINT_TIMEOUTS} table in declaration order and returns
 * the timeout for the first matching pattern. Unknown routes fall back to
 * {@link DEFAULT_FETCH_TIMEOUT_MS} (10 s).
 *
 * ## AbortController composition
 *
 * If `options.signal` is already set the module **merges** both signals, so the
 * request is cancelled when _either_ the caller's own controller fires _or_ the
 * deadline fires — whichever comes first. The original signal is never replaced.
 *
 * ## Error surface
 *
 * | Scenario                              | Thrown error                                      |
 * |---------------------------------------|---------------------------------------------------|
 * | Deadline fires before response        | `DOMException` with `name === 'TimeoutError'`     |
 * | Caller signal fires before response   | Re-throws as-is (typically `AbortError`)          |
 * | Any other network / fetch error       | Re-thrown unchanged                               |
 *
 * @module
 */

import { getTimeoutForUrl } from './config/fetch-timeouts';

export type { FetchWithTimeoutOptions };

/** Options accepted by {@link fetchWithTimeout} in addition to `RequestInit`. */
interface FetchWithTimeoutOptions extends RequestInit {
  /**
   * Optional `AbortSignal` from the caller.  When provided it is combined with
   * the internal timeout signal — aborting either one cancels the request.
   */
  signal?: AbortSignal | null;
}

/**
 * Performs a `fetch` request that is automatically aborted after `timeoutMs`
 * milliseconds.
 *
 * @param url      - The resource URL (passed straight through to `fetch`).
 * @param options  - Standard `RequestInit` options.  A caller-supplied `signal`
 *                   is respected and composed with the timeout signal.
 * @param timeoutMs - Timeout in milliseconds.  When omitted the value is
 *                   resolved from the per-endpoint policy table via
 *                   {@link getTimeoutForUrl}.  Pass `0` to disable the timeout.
 * @returns A `Promise` that resolves with the `Response` or rejects with a
 *          `DOMException` (`name === 'TimeoutError'`) when the deadline fires.
 *
 * @example Default per-endpoint policy
 * ```ts
 * const res = await fetchWithTimeout('/api/anchor/rates');
 * ```
 *
 * @example Explicit timeout override
 * ```ts
 * const res = await fetchWithTimeout('/api/send', { method: 'POST', body }, 20_000);
 * ```
 *
 * @example Combined with a caller signal
 * ```ts
 * const controller = new AbortController();
 * const res = await fetchWithTimeout('/api/goals', { signal: controller.signal });
 * // controller.abort() still works even though a timeout signal is also active.
 * ```
 */
export async function fetchWithTimeout(
  url: string,
  options: FetchWithTimeoutOptions = {},
  timeoutMs?: number
): Promise<Response> {
  const resolvedTimeout = timeoutMs ?? getTimeoutForUrl(url);
  const { signal: callerSignal, ...rest } = options;

  // Disabled timeout: fall back to a plain fetch, preserving the caller signal.
  if (resolvedTimeout <= 0) {
    return fetch(url, callerSignal != null ? { ...rest, signal: callerSignal } : rest);
  }

  const timeoutController = new AbortController();
  const timerId = setTimeout(() => {
    timeoutController.abort(
      new DOMException(
        `Request to ${url} timed out after ${resolvedTimeout}ms`,
        'TimeoutError'
      )
    );
  }, resolvedTimeout);

  // Build the effective signal by merging caller + timeout.
  const effectiveSignal = mergeSignals(
    callerSignal ?? null,
    timeoutController.signal
  );

  try {
    return await fetch(url, { ...rest, signal: effectiveSignal });
  } catch (error: unknown) {
    // If the timeout fired, surface a clean TimeoutError to the caller so it
    // can be distinguished from a deliberate abort.
    if (timeoutController.signal.aborted) {
      const reason = timeoutController.signal.reason;
      // reason is already the DOMException we created above.
      throw reason instanceof Error
        ? reason
        : new DOMException(
            `Request to ${url} timed out after ${resolvedTimeout}ms`,
            'TimeoutError'
          );
    }

    // The caller's own signal fired — re-throw as-is so callers can inspect the
    // original abort reason.
    throw error;
  } finally {
    clearTimeout(timerId);
  }
}

/**
 * Merges two `AbortSignal`s into a single combined signal that fires when
 * **either** source fires.  Returns the `timeoutSignal` directly when
 * `callerSignal` is `null` to avoid creating unnecessary controllers.
 *
 * @internal
 */
function mergeSignals(
  callerSignal: AbortSignal | null,
  timeoutSignal: AbortSignal
): AbortSignal {
  if (callerSignal === null) {
    return timeoutSignal;
  }

  // If either is already aborted, create a pre-aborted controller.
  if (callerSignal.aborted) {
    const c = new AbortController();
    c.abort(callerSignal.reason);
    return c.signal;
  }
  if (timeoutSignal.aborted) {
    const c = new AbortController();
    c.abort(timeoutSignal.reason);
    return c.signal;
  }

  const merged = new AbortController();

  const onCallerAbort = () => merged.abort(callerSignal.reason);
  const onTimeoutAbort = () => merged.abort(timeoutSignal.reason);

  callerSignal.addEventListener('abort', onCallerAbort, { once: true });
  timeoutSignal.addEventListener('abort', onTimeoutAbort, { once: true });

  // Clean up listeners when the merged signal fires to prevent memory leaks.
  merged.signal.addEventListener(
    'abort',
    () => {
      callerSignal.removeEventListener('abort', onCallerAbort);
      timeoutSignal.removeEventListener('abort', onTimeoutAbort);
    },
    { once: true }
  );

  return merged.signal;
}
