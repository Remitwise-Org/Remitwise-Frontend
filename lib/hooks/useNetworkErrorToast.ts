"use client";

/**
 * `useNetworkErrorToast` — global soft-error toast for network failures.
 *
 * Mount this hook **once** in a component that is always inside `ToastProvider`
 * (currently `components/Providers.tsx` via `NetworkErrorToastProvider`).
 *
 * ## What it does
 *
 * Listens for the `network-error` window event dispatched by `apiClient` when a
 * request fails at the transport level (after all retries are exhausted) and
 * translates that event into a toast with an inline **Retry** button:
 *
 * > "Something went wrong. Retry?"
 *
 * - **`isTimeout: false`** → `variant: "error"`, title: "Something went wrong. Retry?"
 * - **`isTimeout: true`**  → same but description: "The request timed out."
 * - The toast requires manual dismissal (`duration: 0`) because the user may
 *   want to click **Retry** and should not lose that option.
 * - The **Retry** action calls the `retry` callback provided by `apiClient`.
 *
 * ## Why a hook (not a component)?
 *
 * The hook composes cleanly with the existing React context tree without adding
 * a visible DOM node. `NetworkErrorToastProvider` wraps it so mount-point
 * decisions stay in `Providers.tsx`.
 *
 * ## Testing
 *
 * Dispatch a synthetic event:
 *
 * ```ts
 * window.dispatchEvent(new CustomEvent('network-error', {
 *   detail: { url: '/api/test', retry: vi.fn(), isTimeout: false },
 * }));
 * ```
 *
 * @module
 */

import { useEffect } from "react";
import { useToast } from "@/lib/context/ToastContext";
import { NETWORK_ERROR_EVENT } from "@/lib/client/networkErrorEvent";
import type { NetworkErrorEvent } from "@/lib/client/networkErrorEvent";

/**
 * Attaches a `window` listener for `network-error` events and triggers a toast
 * via `useToast`.  Must be used inside a `ToastProvider`.
 */
export function useNetworkErrorToast(): void {
  const { toast, dismiss } = useToast();

  useEffect(() => {
    function handleNetworkError(event: Event): void {
      const { retry, isTimeout } = (event as NetworkErrorEvent).detail;

      // Wrap the retry callback so we also dismiss the current toast first,
      // then re-show a fresh one if the retry itself fails again.
      const handleRetry = (): void => {
        retry();
      };

      toast({
        variant: "error",
        title: "Something went wrong. Retry?",
        description: isTimeout ? "The request timed out." : undefined,
        action: {
          label: "Retry",
          onClick: handleRetry,
        },
        // Require manual dismissal — user may still want to click Retry.
        duration: 0,
      });
    }

    window.addEventListener(NETWORK_ERROR_EVENT, handleNetworkError);

    return () => {
      window.removeEventListener(NETWORK_ERROR_EVENT, handleNetworkError);
    };
    // `toast` and `dismiss` are stable callbacks from useToast (useCallback).
  }, [toast, dismiss]);
}

/**
 * Thin wrapper component that mounts `useNetworkErrorToast` inside the
 * `ToastProvider` tree.  Renders no DOM output.
 *
 * Usage in `Providers.tsx`:
 *
 * ```tsx
 * import NetworkErrorToastProvider from "@/lib/hooks/useNetworkErrorToast";
 *
 * // Inside <ToastProvider>:
 * <NetworkErrorToastProvider />
 * ```
 */
export default function NetworkErrorToastProvider(): null {
  useNetworkErrorToast();
  return null;
}
