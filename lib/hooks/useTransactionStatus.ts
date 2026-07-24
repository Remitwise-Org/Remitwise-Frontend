import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/lib/client/apiClient";

export type TransactionLifecycleStatus = "idle" | "pending" | "confirmed" | "failed" | "unknown";

export interface UseTransactionStatusOptions {
  enabled?: boolean;
  baseDelayMs?: number;
  maxDelayMs?: number;
  maxAttempts?: number;
}

export function mapApiStatusToLifecycle(apiStatus: string | undefined | null): TransactionLifecycleStatus | null {
  if (apiStatus === "completed" || apiStatus === "success" || apiStatus === "confirmed") return "confirmed";
  if (apiStatus === "failed") return "failed";
  return null;
}

export function nextBackoffDelay(attempts: number, baseDelay: number, maxDelay: number) {
  const clampedAttempts = Math.max(0, attempts);
  const delay = baseDelay * Math.pow(2, clampedAttempts);
  return Math.min(delay, maxDelay);
}

export function getTransactionStatusUrl(hash: string) {
  return `/api/v1/remittance/status/${encodeURIComponent(hash)}`;
}

export function useTransactionStatus(txHash: string | null, options: UseTransactionStatusOptions = {}) {
  const { enabled = true, baseDelayMs = 1000, maxDelayMs = 30000, maxAttempts = 10 } = options;

  const [status, setStatus] = useState<TransactionLifecycleStatus>("idle");
  const [isPolling, setIsPolling] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout>();
  const unmountedRef = useRef(false);
  
  // Create a mutable ref to hold the latest poll function to break the circular dependency loop
  const pollRef = useRef<(currentAttempt: number) => Promise<void>>();

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  // 1. scheduleNext now safely triggers the function stored in our mutable ref
  const scheduleNext = useCallback((nextAttempt: number) => {
    if (unmountedRef.current) return;
    const delay = nextBackoffDelay(nextAttempt, baseDelayMs, maxDelayMs);
    timerRef.current = setTimeout(() => {
      if (pollRef.current) pollRef.current(nextAttempt);
    }, delay);
  }, [baseDelayMs, maxDelayMs]);

  // 2. The core polling function logic
  const poll = useCallback(async (currentAttempt: number) => {
    if (!txHash || unmountedRef.current) return;
    
    setIsPolling(true);
    setAttempts(currentAttempt + 1);
    
    if (currentAttempt >= maxAttempts) {
      setStatus("unknown");
      setIsPolling(false);
      return;
    }

    try {
      const response = await apiClient.get(getTransactionStatusUrl(txHash));
      if (!response) {
        setError("session_expired");
        setIsPolling(false);
        return;
      }
      
      const data = await response.json();
      if (!response.ok) {
        setError(`status_${response.status}`);
        scheduleNext(currentAttempt + 1);
        return;
      }
      
      const lifecycle = mapApiStatusToLifecycle(data.status);
      if (lifecycle) {
        setStatus(lifecycle);
        setError(null);
        setIsPolling(false);
        return;
      }
      
      scheduleNext(currentAttempt + 1);
    } catch (err: any) {
      setError(err.message || "error");
      scheduleNext(currentAttempt + 1);
    }
  }, [txHash, maxAttempts]);

  // Helper to schedule the next poll with exponential backoff
  const scheduleNext = (nextAttempt: number) => {
    const delay = nextBackoffDelay(nextAttempt, baseDelayMs, maxDelayMs);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      poll(nextAttempt);
    }, delay);
  };

  useEffect(() => {
    if (!enabled || !txHash) {
      setStatus("idle");
      setIsPolling(false);
      return;
    }
    
    setStatus("pending");
    setError(null);
    setAttempts(0);
    poll(0);
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [txHash, enabled, poll]);

  return { status, isPolling, attempts, error };
}