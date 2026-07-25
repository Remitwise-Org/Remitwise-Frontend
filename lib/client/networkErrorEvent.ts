/**
 * Network-error event bridge.
 *
 * `apiClient` is a pure-functional module with no React dependency. When it
 * encounters a non-recoverable network or timeout failure it dispatches this
 * custom window event so the React layer can react without creating a circular
 * import.
 *
 * The React side (`useNetworkErrorToast`) listens for `network-error` and
 * shows a "Something went wrong. Retry?" toast with an inline retry button.
 *
 * ## Event contract
 *
 * | Field      | Type       | Description                                                  |
 * |------------|------------|--------------------------------------------------------------|
 * | `url`      | `string`   | The request URL that failed.                                  |
 * | `retry`    | `() => void` | Callback the toast's Retry button will invoke.              |
 * | `isTimeout`| `boolean`  | `true` when the failure was a per-request timeout.           |
 *
 * ## Example (dispatched by apiClient)
 *
 * ```ts
 * dispatchNetworkError({ url: '/api/send', retry: () => apiClient.post('/api/send', opts), isTimeout: false });
 * ```
 *
 * ## Example (consumed by useNetworkErrorToast)
 *
 * ```ts
 * window.addEventListener('network-error', (e) => {
 *   const { retry } = (e as NetworkErrorEvent).detail;
 *   toast({ variant: 'error', title: 'Something went wrong.', action: { label: 'Retry', onClick: retry }, duration: 0 });
 * });
 * ```
 *
 * @module
 */

export const NETWORK_ERROR_EVENT = 'network-error' as const;

export interface NetworkErrorDetail {
  /** The URL of the request that failed. */
  url: string;
  /** Callback to re-issue the exact same request. Provided by `apiClient`. */
  retry: () => void;
  /** `true` when the error was a per-request client timeout (`DOMException` with `name === 'TimeoutError'`). */
  isTimeout: boolean;
}

export type NetworkErrorEvent = CustomEvent<NetworkErrorDetail>;

/**
 * Dispatches a `network-error` custom event on `window`.
 *
 * Safe to call in SSR-like environments — the call is silently skipped when
 * `window` is not available (e.g. during Next.js server-side rendering).
 *
 * @param detail - Payload describing the failed request and a retry callback.
 */
export function dispatchNetworkError(detail: NetworkErrorDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<NetworkErrorDetail>(NETWORK_ERROR_EVENT, { detail }));
}
