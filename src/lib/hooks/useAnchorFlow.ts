/**
 * useAnchorFlow — orchestrates anchor deposit/withdraw flows.
 *
 * Responsibilities:
 *  - Fetch and cache exchange rates (with staleness tracking).
 *  - Initiate deposit or withdraw via the anchor client.
 *  - Poll flow status until terminal state or timeout.
 *  - Expose fine-grained state for multi-step UI.
 *
 * @example
 * ```tsx
 * const { rates, rateStale, submit, flow, step, setStep, error } = useAnchorFlow();
 * ```
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchRates,
  initiateDeposit,
  initiateWithdraw,
} from "@/lib/anchor/client";
import {
  getCachedRates,
  isRateExpired,
  isRateStale,
  setRatesCache,
  type AnchorRate,
} from "@/lib/anchor/rates-cache";
import {
  clearFlow,
  getFlow,
  startFlow,
  subscribeFlow,
  updateFlow,
  type AnchorFlow,
  type FlowDirection,
} from "@/lib/anchor/flow-store";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Step = "direction" | "amount" | "review" | "confirm";

export interface SubmitParams {
  direction: FlowDirection;
  asset: string;
  amount: number;
  walletAddress: string;
  dest?: string;
}

export interface UseAnchorFlowResult {
  /** Fetched exchange rates */
  rates: AnchorRate[];
  /** Whether the cached rate is stale (older than 90 s) */
  rateStale: boolean;
  /** Timestamp of last successful rate fetch */
  ratesFetchedAt: number | null;
  /** Whether rates are currently loading */
  ratesLoading: boolean;
  /** Re-fetch rates immediately */
  refreshRates: () => Promise<void>;
  /** Current multi-step wizard position */
  step: Step;
  setStep: (s: Step) => void;
  /** Submit the flow (deposit or withdraw) */
  submit: (params: SubmitParams) => Promise<void>;
  /** In-progress flow from the store */
  flow: AnchorFlow | null;
  /** Whether a submission or poll is in progress */
  loading: boolean;
  /** Last error message */
  error: string | null;
  /** Clear error and reset to direction step */
  reset: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 120_000;

const TERMINAL_STATUSES = new Set([
  "completed",
  "error",
  "timeout",
  "refunded",
  "expired",
]);

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAnchorFlow(): UseAnchorFlowResult {
  const [rates, setRates] = useState<AnchorRate[]>(() => {
    const cached = getCachedRates();
    return cached ? cached.rates : [];
  });
  const [rateStale, setRateStale] = useState(isRateStale());
  const [ratesFetchedAt, setRatesFetchedAt] = useState<number | null>(() => {
    const cached = getCachedRates();
    return cached ? cached.fetchedAt : null;
  });
  const [ratesLoading, setRatesLoading] = useState(false);

  const [step, setStep] = useState<Step>("direction");
  const [flow, setFlow] = useState<AnchorFlow | null>(getFlow);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  // Subscribe to flow store changes
  useEffect(() => {
    const unsub = subscribeFlow(setFlow);
    return unsub;
  }, []);

  // Refresh stale-rate indicator periodically
  useEffect(() => {
    const id = setInterval(() => setRateStale(isRateStale()), 15_000);
    return () => clearInterval(id);
  }, []);

  // Load rates on mount if expired
  useEffect(() => {
    if (isRateExpired()) {
      void refreshRates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshRates = useCallback(async () => {
    setRatesLoading(true);
    try {
      const data = await fetchRates();
      if (data) {
        const entry = setRatesCache(data.rates);
        setRates(data.rates);
        setRatesFetchedAt(entry.fetchedAt);
        setRateStale(false);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch rates";
      setError(msg);
    } finally {
      setRatesLoading(false);
    }
  }, []);

  // Stop polling helper
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // Poll flow status
  const startPolling = useCallback(
    (flowId: string) => {
      stopPolling();
      pollStartRef.current = Date.now();

      pollTimerRef.current = setInterval(async () => {
        // Timeout guard
        if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
          stopPolling();
          updateFlow({ status: "timeout" });
          setLoading(false);
          return;
        }

        try {
          const { fetchFlowStatus } = await import("@/lib/anchor/client");
          const status = await fetchFlowStatus(flowId);
          if (!status) return;

          updateFlow({ status: status.status as AnchorFlow["status"], message: status.message });

          if (TERMINAL_STATUSES.has(status.status)) {
            stopPolling();
            setLoading(false);
          }
        } catch {
          // Non-fatal; keep polling
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling],
  );

  // Clean up on unmount
  useEffect(() => () => stopPolling(), [stopPolling]);

  const submit = useCallback(
    async ({ direction, asset, amount, walletAddress, dest }: SubmitParams) => {
      setError(null);
      setLoading(true);
      setStep("confirm");
      startFlow(direction, asset, amount);

      try {
        let flowId: string;

        if (direction === "deposit") {
          const result = await initiateDeposit({ asset, amount, walletAddress });
          if (!result) throw new Error("Session expired. Please reconnect your wallet.");
          flowId = result.id;
          updateFlow({ status: "pending_anchor", more_info_url: result.more_info_url });
        } else {
          const result = await initiateWithdraw({ asset, amount, walletAddress, dest });
          if (!result) throw new Error("Session expired. Please reconnect your wallet.");
          flowId = result.id;
          updateFlow({ status: "pending_user_transfer", more_info_url: result.more_info_url });
        }

        startPolling(flowId);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Submission failed. Please try again.";
        setError(msg);
        updateFlow({ status: "error", message: msg });
        setLoading(false);
      }
    },
    [startPolling],
  );

  const reset = useCallback(() => {
    stopPolling();
    clearFlow();
    setError(null);
    setLoading(false);
    setStep("direction");
  }, [stopPolling]);

  return {
    rates,
    rateStale,
    ratesFetchedAt,
    ratesLoading,
    refreshRates,
    step,
    setStep,
    submit,
    flow,
    loading,
    error,
    reset,
  };
}
