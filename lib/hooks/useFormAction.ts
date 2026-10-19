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
const DEFAULT_SUCCESS_MESSAGE = "Request completed successfully.";

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
 * @bug (fixed) Previously a submit that resolved after unmount would call
 * `setState` on an unmounted component, triggering a React warning and
 * potentially interfering with re-mounted siblings. The `mountedRef` guard
 * eliminates this.
 */
export function useFormAction<T extends ActionState = ActionState>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST"
) {
  const [state, setState] = useState<T>({} as T);
  const [isPending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

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
        try {
          const res = await apiClient.request(url, {
            method,
            body: formData,
            signal: controller.signal,
          });

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
          if (
            controller.signal.aborted ||
            (error instanceof DOMException && error.name === "AbortError") ||
            !mountedRef.current
          ) {
            return;
          }
          setState({ error: NETWORK_ERROR_MESSAGE } as T);
        }
      });
    },
    [method, url]
  );

  return [state, formAction, isPending] as const;
}
