"use client";

import { useState, useCallback, useRef } from "react";
import { apiClient } from "@/lib/client/apiClient";
import { useAsyncOperations } from "@/lib/context/AsyncOperationsContext";

/**
 * Action result type for policy mutations.
 *
 * @property xdr - The unsigned transaction XDR returned by the backend
 * @property error - Human-readable error message when the action fails
 */
export interface PolicyActionResult {
  xdr?: string;
  error?: string;
}

/**
 * Unified state for a single policy action (pay or deactivate).
 *
 * @property idle - No action in progress
 * @property pending - Request in flight
 * @property success - XDR received, ready for wallet signing
 * @property error - Request failed
 */
export type PolicyActionState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "success"; xdr: string }
  | { status: "error"; message: string };

/**
 * Return type of the {@link usePolicyActions} hook.
 *
 * @property payState - Current state of the pay-premium action
 * @property deactivateState - Current state of the deactivate action
 * @property payPremium - Trigger a pay-premium request
 * @property deactivate - Trigger a deactivate request
 * @property resetPay - Reset pay-premium state to idle
 * @property resetDeactivate - Reset deactivate state to idle
 */
export interface UsePolicyActionsReturn {
  payState: PolicyActionState;
  deactivateState: PolicyActionState;
  payPremium: (policyId: string) => Promise<void>;
  deactivate: (policyId: string) => Promise<void>;
  resetPay: () => void;
  resetDeactivate: () => void;
}

/**
 * React hook that encapsulates pay-premium and deactivate mutations
 * for a single insurance policy.
 *
 * Features:
 * - Deduplicates concurrent requests (only one in-flight per action)
 * - Integrates with {@link AsyncOperationsContext} for global status tracking
 * - Returns typed XDR payloads ready for wallet signing
 * - Provides reset helpers for retry flows
 *
 * @example
 * ```tsx
 * const { payState, payPremium, resetPay } = usePolicyActions();
 *
 * <button onClick={() => payPremium(policyId)} disabled={payState.status === "pending"}>
 *   Pay Premium
 * </button>
 * {payState.status === "success" && <SignXdr xdr={payState.xdr} />}
 * ```
 */
export function usePolicyActions(): UsePolicyActionsReturn {
  const [payState, setPayState] = useState<PolicyActionState>({ status: "idle" });
  const [deactivateState, setDeactivateState] = useState<PolicyActionState>({
    status: "idle",
  });

  const { dispatch } = useAsyncOperations();

  // Track in-flight requests to prevent duplicate submissions
  const payAbortRef = useRef<AbortController | null>(null);
  const deactivateAbortRef = useRef<AbortController | null>(null);

  const resetPay = useCallback(() => {
    if (payAbortRef.current) {
      payAbortRef.current.abort();
      payAbortRef.current = null;
    }
    setPayState({ status: "idle" });
  }, []);

  const resetDeactivate = useCallback(() => {
    if (deactivateAbortRef.current) {
      deactivateAbortRef.current.abort();
      deactivateAbortRef.current = null;
    }
    setDeactivateState({ status: "idle" });
  }, []);

  /**
   * Request a pay-premium XDR for the given policy.
   *
   * @param policyId - The policy identifier
   * @throws Never throws; errors are captured in state
   */
  const payPremium = useCallback(
    async (policyId: string): Promise<void> => {
      if (!policyId) {
        setPayState({ status: "error", message: "Policy ID is required" });
        return;
      }

      // Deduplicate
      if (payAbortRef.current) {
        return;
      }

      const abortCtrl = new AbortController();
      payAbortRef.current = abortCtrl;

      setPayState({ status: "pending" });

      const opId = `pay-premium-${policyId}-${Date.now()}`;
      dispatch({
        type: "ADD_OPERATION",
        payload: {
          id: opId,
          title: "Pay Premium",
          detail: `Preparing premium payment for policy ${policyId}`,
          status: "building",
          createdAt: Date.now(),
        },
      });

      try {
        const response = await apiClient.post(`/api/v1/insurance/${encodeURIComponent(policyId)}/pay`, {
          signal: abortCtrl.signal,
        });

        if (!response) {
          // Session expired — handled by apiClient
          setPayState({ status: "error", message: "Session expired. Please reconnect your wallet." });
          dispatch({ type: "UPDATE_OPERATION", payload: { id: opId, status: "failed" } });
          return;
        }

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          const message = body.error || `Payment request failed (${response.status})`;
          setPayState({ status: "error", message });
          dispatch({ type: "UPDATE_OPERATION", payload: { id: opId, status: "failed" } });
          return;
        }

        const data = (await response.json()) as PolicyActionResult;

        if (!data.xdr) {
          setPayState({ status: "error", message: "Invalid response: missing transaction payload" });
          dispatch({ type: "UPDATE_OPERATION", payload: { id: opId, status: "failed" } });
          return;
        }

        setPayState({ status: "success", xdr: data.xdr });
        dispatch({ type: "UPDATE_OPERATION", payload: { id: opId, status: "confirmed" } });
      } catch (err) {
        if (abortCtrl.signal.aborted) {
          setPayState({ status: "idle" });
          dispatch({ type: "REMOVE_OPERATION", payload: opId });
          return;
        }
        const message = err instanceof Error ? err.message : "An unexpected error occurred";
        setPayState({ status: "error", message });
        dispatch({ type: "UPDATE_OPERATION", payload: { id: opId, status: "failed" } });
      } finally {
        payAbortRef.current = null;
      }
    },
    [dispatch]
  );

  /**
   * Request a deactivate-policy XDR for the given policy.
   *
   * @param policyId - The policy identifier
   * @throws Never throws; errors are captured in state
   */
  const deactivate = useCallback(
    async (policyId: string): Promise<void> => {
      if (!policyId) {
        setDeactivateState({ status: "error", message: "Policy ID is required" });
        return;
      }

      if (deactivateAbortRef.current) {
        return;
      }

      const abortCtrl = new AbortController();
      deactivateAbortRef.current = abortCtrl;

      setDeactivateState({ status: "pending" });

      const opId = `deactivate-policy-${policyId}-${Date.now()}`;
      dispatch({
        type: "ADD_OPERATION",
        payload: {
          id: opId,
          title: "Deactivate Policy",
          detail: `Preparing deactivation for policy ${policyId}`,
          status: "building",
          createdAt: Date.now(),
        },
      });

      try {
        const response = await apiClient.post(
          `/api/v1/insurance/${encodeURIComponent(policyId)}/deactivate`,
          { signal: abortCtrl.signal }
        );

        if (!response) {
          setDeactivateState({ status: "error", message: "Session expired. Please reconnect your wallet." });
          dispatch({ type: "UPDATE_OPERATION", payload: { id: opId, status: "failed" } });
          return;
        }

        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          const message = body.error || `Deactivation request failed (${response.status})`;
          setDeactivateState({ status: "error", message });
          dispatch({ type: "UPDATE_OPERATION", payload: { id: opId, status: "failed" } });
          return;
        }

        const data = (await response.json()) as PolicyActionResult;

        if (!data.xdr) {
          setDeactivateState({ status: "error", message: "Invalid response: missing transaction payload" });
          dispatch({ type: "UPDATE_OPERATION", payload: { id: opId, status: "failed" } });
          return;
        }

        setDeactivateState({ status: "success", xdr: data.xdr });
        dispatch({ type: "UPDATE_OPERATION", payload: { id: opId, status: "confirmed" } });
      } catch (err) {
        if (abortCtrl.signal.aborted) {
          setDeactivateState({ status: "idle" });
          dispatch({ type: "REMOVE_OPERATION", payload: opId });
          return;
        }
        const message = err instanceof Error ? err.message : "An unexpected error occurred";
        setDeactivateState({ status: "error", message });
        dispatch({ type: "UPDATE_OPERATION", payload: { id: opId, status: "failed" } });
      } finally {
        deactivateAbortRef.current = null;
      }
    },
    [dispatch]
  );

  return {
    payState,
    deactivateState,
    payPremium,
    deactivate,
    resetPay,
    resetDeactivate,
  };
}