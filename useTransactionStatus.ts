import { useEffect, useRef, useState } from 'react';
import { apiClient } from '@/lib/client/apiClient';

export type TransactionStatus = 'pending' | 'success' | 'error' | 'idle';
export type TransactionLifecycleStatus = 'idle' | 'pending' | 'confirmed' | 'failed' | 'unknown';

export interface UseTransactionStatusOptions {
  enabled?: boolean;
  baseDelayMs?: number;
  maxDelayMs?: number;
  maxAttempts?: number;
}

export function getTransactionStatusUrl(txHash: string): string {
  return `/api/v1/remittance/status/${encodeURIComponent(txHash)}`;
}

export function mapApiStatusToLifecycle(status?: string | null): TransactionLifecycleStatus | null {
  switch (status) {
    case 'completed':
    case 'success':
    case 'confirmed':
      return 'confirmed';
    case 'failed':
      return 'failed';
    default:
      return null;
  }
}

export function nextBackoffDelay(
  attemptIndex: number,
  baseDelayMs: number,
  maxDelayMs: number,
): number {
  const normalizedAttempts = Math.max(0, attemptIndex);
  const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** normalizedAttempts);
  return Math.max(baseDelayMs, delay);
}

interface TransactionStatusState {
  status: TransactionLifecycleStatus;
  attempts: number;
  isPolling: boolean;
  error: string | null;
}

const DEFAULT_BASE_DELAY_MS = 1000;
const DEFAULT_MAX_DELAY_MS = 30000;
const DEFAULT_MAX_ATTEMPTS = 5;

function isTerminalStatus(status: TransactionLifecycleStatus): boolean {
  return status === 'confirmed' || status === 'failed' || status === 'unknown';
}

export function useTransactionStatus(
  txHash: string | null,
  options: UseTransactionStatusOptions = {},
): TransactionStatusState {
  const {
    enabled = true,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    maxDelayMs = DEFAULT_MAX_DELAY_MS,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
  } = options;

  const [status, setStatus] = useState<TransactionLifecycleStatus>('idle');
  const [attempts, setAttempts] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  const shouldPoll = Boolean(txHash) && enabled;

  useEffect(() => {
    const cleanupTimer = () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const cleanup = () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      cleanupTimer();
    };

    if (!shouldPoll) {
      setStatus('idle');
      setAttempts(0);
      setIsPolling(false);
      setError(null);
      cleanup();
      return cleanup;
    }

    setStatus('pending');
    setAttempts(0);
    setError(null);
    setIsPolling(true);

    async function executePoll(attemptNumber: number): Promise<void> {
      if (!txHash) return;

      setAttempts(attemptNumber);
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await apiClient.get(getTransactionStatusUrl(txHash), {
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        if (response === null) {
          setError('session_expired');
          setIsPolling(false);
          return;
        }

        if (!response.ok) {
          setError(`status_${response.status}`);
          setStatus('pending');

          if (attemptNumber >= maxAttempts) {
            setStatus('unknown');
            setIsPolling(false);
            return;
          }

          const delayMs = nextBackoffDelay(attemptNumber, baseDelayMs, maxDelayMs);
          timerRef.current = window.setTimeout(
            () => void executePoll(attemptNumber + 1),
            delayMs,
          );
          return;
        }

        const body = await response.json().catch(() => null);
        const lifecycle = mapApiStatusToLifecycle(body?.status);

        if (lifecycle) {
          setStatus(lifecycle);
          setIsPolling(false);
          setError(null);
          return;
        }

        setStatus('pending');
        setError(null);

        if (attemptNumber >= maxAttempts) {
          setStatus('unknown');
          setIsPolling(false);
          return;
        }

        const delayMs = nextBackoffDelay(attemptNumber, baseDelayMs, maxDelayMs);
        timerRef.current = window.setTimeout(
          () => void executePoll(attemptNumber + 1),
          delayMs,
        );
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        const message =
          error instanceof Error ? error.message : String(error ?? 'unknown_error');
        setError(message);
        setStatus('pending');

        if (attemptNumber >= maxAttempts) {
          setStatus('unknown');
          setIsPolling(false);
          return;
        }

        const delayMs = nextBackoffDelay(attemptNumber, baseDelayMs, maxDelayMs);
        timerRef.current = window.setTimeout(
          () => void executePoll(attemptNumber + 1),
          delayMs,
        );
      }
    }

    void executePoll(1);

    return cleanup;
  }, [txHash, shouldPoll, baseDelayMs, maxDelayMs, maxAttempts]);

  const effectiveIsPolling = isPolling && !isTerminalStatus(status);

  return {
    status,
    attempts,
    isPolling: effectiveIsPolling,
    error,
  };
}
