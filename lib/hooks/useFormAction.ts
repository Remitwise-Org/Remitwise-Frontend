
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
      payload.success === false &&
      "error" in payload &&
      payload.error &&
      typeof payload.error === "object" &&
      "message" in payload.error &&
      typeof payload.error.message === "string"
  );
}

function isValidationErrorPayload(payload: unknown): payload is { validationErrors?: ValidationError[] } {
  return Boolean(
    payload &&
      typeof payload === "object" &&
      "validationErrors" in payload &&
      Array.isArray(payload.validationErrors)
  );
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * Submits form payloads through a shared API endpoint while handling request
 * cancellation, HTTP failures, and parse errors.
 *
 * The hook preserves the existing tuple shape `[state, formAction, isPending]`
 * so existing form components can continue using it unchanged.
 */
export function useFormAction<T extends ActionState = ActionState>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE" = "POST"
) {
  const [state, setState] = useState<T>({} as T);
  const [isPending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const formAction = useCallback(
    (formData: FormData) => {
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

          if (!res) {
            return;
          }

          if (controller.signal.aborted) {
            return;
          }

          const payload = await parseResponseBody(res);

          if (controller.signal.aborted) {
            return;
          }

          if (!res.ok) {
            const errorPayload = payload as ErrorPayload;
            const message =
              (isApiErrorPayload(errorPayload) && errorPayload.error?.message) ||
              (isValidationErrorPayload(errorPayload) && errorPayload.validationErrors?.[0]?.message) ||
              `Request failed with status ${res.status}`;

            const nextState = {
              error: message,
            } as T;

            if (isValidationErrorPayload(errorPayload) && errorPayload.validationErrors) {
              (nextState as T & { validationErrors?: ValidationError[] }).validationErrors =
                errorPayload.validationErrors;
            }

            setState(nextState);
            return;
          }

          if (payload === null || payload === undefined) {
            setState({
              success: DEFAULT_SUCCESS_MESSAGE,
            } as T);
            return;
          }

          if (typeof payload === "string") {
            setState({
              success: payload,
            } as T);
            return;
          }

          if (
            payload &&
            typeof payload === "object" &&
            "success" in payload &&
            payload.success === false &&
            !isApiErrorPayload(payload)
          ) {
            const errorPayload = payload as ErrorPayload;
            setState({
              error:
                errorPayload.error?.message ||
                "The server returned an error response.",
            } as T);
            return;
          }

          setState(payload as T);
        } catch (error) {
          if (controller.signal.aborted) {
            return;
          }

          const isAbortError =
            error instanceof DOMException && error.name === "AbortError";
          if (isAbortError) {
            return;
          }

          setState({
            error: NETWORK_ERROR_MESSAGE,
          } as T);
        }
      });
    },
    [method, url]
  );

  return [state, formAction, isPending] as const;
}