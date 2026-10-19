import { errorReporter } from "./errorReporter";

export interface UnhandledRejectionLike {
  reason: unknown;
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Normalizes a rejection's `reason` (which can be anything — an `Error`, a
 * string, a plain object, `undefined`) into an `Error` and reports it through
 * the shared error reporter, so a promise rejected with no `.catch()` is
 * never silently swallowed.
 */
export function handleUnhandledRejection(event: UnhandledRejectionLike): void {
  const { reason } = event;
  const error =
    reason instanceof Error
      ? reason
      : new Error(typeof reason === "string" ? reason : safeStringify(reason));

  errorReporter.captureException(error, { source: "unhandledrejection" });
}

/**
 * Registers a window-level `unhandledrejection` listener.
 *
 * @returns A cleanup function that removes the listener — call it from a
 *   `useEffect` return so the listener doesn't leak across remounts.
 */
export function registerUnhandledRejectionHandler(): () => void {
  if (typeof window === "undefined") return () => {};

  const listener = (event: PromiseRejectionEvent) => handleUnhandledRejection(event);
  window.addEventListener("unhandledrejection", listener);
  return () => window.removeEventListener("unhandledrejection", listener);
}
