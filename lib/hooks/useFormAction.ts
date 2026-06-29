"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ActionState } from "@/lib/auth/middleware";
import { ApiErrorResponse } from "@/lib/api/types";
import { apiClient } from "@/lib/client/apiClient";

interface ValidationError {
  path: string;
  message: string;
}

interface ErrorPayload {
  success?: false;
  error?: {
    code?: string;
    message?: string;
  };
  validationErrors?: ValidationError[];
}

const NETWORK_ERROR_MESSAGE = "Network error. Please try again.";
const TIMEOUT_ERROR_MESSAGE = "Request timed out. Please try again.";
const DEFAULT_SUCCESS_MESSAGE = "Request completed successfully.";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_RETRY_DELAY_MS = 250;

type FormActionMethod = "POST" | "PUT" | "PATCH" | "DELETE";

interface UseFormActionOptions {
  /** Timeout for the full submission, including configured retry attempts. */
  timeoutMs?: number;
  /** Additional attempts after the initial request. Defaults to no retry. */
  maxRetries?: number;
  /** Delay between retry attempts in milliseconds. */
  retryDelayMs?: number;
}

function isApiErrorPayload(payload: unknown): payload is ApiErrorResponse {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      "success" in payload &&
      (payload as Record<string, unknown>).success === false &&
      "error" in payload &&
      (payload as Record<string, unknown>).error &&
      typeof (payload as ApiErrorResponse).error === "object" &&
      "message" in ((payload as ApiErrorResponse).error ?? {}) &&
      typeof (payload as ApiErrorResponse).error?.message === "string"
  );
}

function isValidationErrorPayload(
  payload: unknown
): payload is { validationErrors?: ValidationError[] } {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      "validationErrors" in payload &&
      Array.isArray((payload as Record<string, unknown>).validationErrors)
  );
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isRetryableMethod(method: FormActionMethod): boolean {
  return method === "PUT" || method === "DELETE";
}

function isRetryableResponse(response: Response): boolean {
  return response.status >= 500;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  if (signal.aborted) return Promise.reject(signal.reason);

  return new Promise((resolve, reject) => {
    const cleanup = () => signal.removeEventListener("abort", abort);
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const abort = () => {
      clearTimeout(timer);
      cleanup();
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
  });
}

async function submitWithRetry(
  url: string,
  method: FormActionMethod,
  formData: FormData,
  signal: AbortSignal,
  options: Required<Pick<UseFormActionOptions, "maxRetries" | "retryDelayMs">>
): Promise<Response | null> {
  const maxRetries = isRetryableMethod(method) ? Math.max(0, options.maxRetries) : 0;

  for (let attempt = 0; ; attempt += 1) {
    let res: Response | null;
    try {
      res = await apiClient.request(url, {
        method,
        body: formData,
        signal,
        retries: 0,
        timeout: 0,
      });
    } catch (error) {
      if (signal.aborted || isAbortError(error) || attempt >= maxRetries) {
        throw error;
      }

      await sleep(options.retryDelayMs, signal);
      continue;
    }

    if (!res || !isRetryableResponse(res) || attempt >= maxRetries) {
      return res;
    }

    await sleep(options.retryDelayMs, signal);
  }
}

/**
 * Shared form-submission hook used across Send, Split, NewPolicy, and Savings
 * Goal flows.
 *
 * Features:
 * - Cancels in-flight requests on unmount and on rapid re-submit (latest wins).
 * - Guards `setState` with a mounted ref so no state update fires after unmount.
 * - Surfaces typed errors from `ApiErrorResponse` (code + message).
 * - Falls back to a generic network error for unexpected rejections.
 *
 * Public API is backward-compatible with the original tuple shape:
 * `[state, formAction, isPending]`
 *
 * @example
 * ```tsx
 * const [state, formAction, isPending] = useFormAction('/api/insurance');
 * return <form action={formAction}>…</form>;
 * ```
 *
 * @example Opt into timeout and bounded retry for an idempotent update
 * ```tsx
 * const [state, formAction] = useFormAction('/api/settings', 'PUT', {
 *   timeoutMs: 8000,
 *   maxRetries: 1,
 * });
 * ```
 *
 * @bug (fixed) Previously a submit that resolved after unmount would call
 * `setState` on an unmounted component, triggering a React warning and
 * potentially interfering with re-mounted siblings. The `mountedRef` guard
 * eliminates this.
 */
export function useFormAction<T extends ActionState = ActionState>(
  url: string,
  method: FormActionMethod = "POST",
  options: UseFormActionOptions = {}
) {
  const [state, setState] = useState<T>({} as T);
  const [isPending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? 0;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const formAction = useCallback(
    (formData: FormData) => {
      // Abort any in-flight request before starting a new one (latest wins).
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      startTransition(async () => {
        let timedOut = false;
        const timeout =
          timeoutMs > 0
            ? setTimeout(() => {
                timedOut = true;
                controller.abort(new DOMException(TIMEOUT_ERROR_MESSAGE, "AbortError"));
                if (mountedRef.current) {
                  setState({ error: TIMEOUT_ERROR_MESSAGE } as T);
                }
              }, timeoutMs)
            : null;

        try {
          const res = await submitWithRetry(url, method, formData, controller.signal, {
            maxRetries,
            retryDelayMs,
          });

          if (timedOut && mountedRef.current) {
            setState({ error: TIMEOUT_ERROR_MESSAGE } as T);
            return;
          }

          // apiClient returns null when session-expiry flow has been triggered.
          if (!res || controller.signal.aborted || !mountedRef.current) return;

          const payload = await parseResponseBody(res);

          if (controller.signal.aborted || !mountedRef.current) return;

          if (!res.ok) {
            const ep = payload as ErrorPayload;
            const message =
              (isApiErrorPayload(ep) && ep.error?.message) ||
              (isValidationErrorPayload(ep) && ep.validationErrors?.[0]?.message) ||
              `Request failed with status ${res.status}`;

            const nextState = { error: message } as T;
            if (isValidationErrorPayload(ep) && ep.validationErrors) {
              (nextState as T & { validationErrors?: ValidationError[] }).validationErrors =
                ep.validationErrors;
            }
            setState(nextState);
            return;
          }

          if (payload === null || payload === undefined) {
            setState({ success: DEFAULT_SUCCESS_MESSAGE } as T);
            return;
          }

          if (typeof payload === "string") {
            setState({ success: payload } as T);
            return;
          }

          if (
            payload &&
            typeof payload === "object" &&
            "success" in payload &&
            (payload as Record<string, unknown>).success === false &&
            !isApiErrorPayload(payload)
          ) {
            const ep = payload as ErrorPayload;
            setState({
              error: ep.error?.message ?? "The server returned an error response.",
            } as T);
            return;
          }

          setState(payload as T);
        } catch (error) {
          if (timedOut && mountedRef.current) {
            setState({ error: TIMEOUT_ERROR_MESSAGE } as T);
            return;
          }

          if (
            controller.signal.aborted ||
            isAbortError(error) ||
            !mountedRef.current
          ) {
            return;
          }
          setState({ error: NETWORK_ERROR_MESSAGE } as T);
        } finally {
          if (timeout) clearTimeout(timeout);
        }
      });
    },
    [maxRetries, method, retryDelayMs, timeoutMs, url]
  );

  return [state, formAction, isPending] as const;
}
