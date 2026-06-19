"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiClient } from '@/lib/client/apiClient';
import { useClientTranslator } from '@/lib/i18n/client';
import type { ExchangeRate, AnchorFlowResponse } from '@/lib/anchor/client';

export type AnchorFlowDirection = 'deposit' | 'withdraw';

export interface AnchorRatesResponse {
  rates: ExchangeRate[] | null;
  stale?: boolean;
}

export interface AnchorFlowStatus {
  state: 'idle' | 'submitting' | 'awaiting_interactive' | 'completed' | 'failed' | 'timeout';
  error?: string;
  pendingFlowId?: string;
  anchorTransactionId?: string;
  url?: string;
}

export interface UseAnchorFlowOptions {
  /** polling interval while we wait for completion */
  pollIntervalMs?: number;
  /** overall timeout for the flow */
  timeoutMs?: number;
}

const DEFAULT_POLL_INTERVAL_MS = 1500;
const DEFAULT_TIMEOUT_MS = 60_000;

function formatElapsedSeconds(ms: number) {
  return Math.max(0, Math.ceil(ms / 1000));
}

/**
 * useAnchorFlow
 *
 * Client orchestration for:
 * - GET /api/anchor/rates (client-side view)
 * - POST /api/v1/anchor/deposit or /api/v1/anchor/withdraw
 * - polling anchor flow status
 *
 * Note: the backend Anchor flow store (`lib/anchor/flow-store.ts`) is currently
 * in-memory. Therefore, polling correctness depends on the existence of a
 * corresponding API route that can surface status updates.
 */
export function useAnchorFlow(options?: UseAnchorFlowOptions) {
  const { t } = useClientTranslator();

  const pollIntervalMs = options?.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const [rates, setRates] = useState<ExchangeRate[] | null>(null);
  const [ratesStale, setRatesStale] = useState(false);
  const [ratesFetchedAt, setRatesFetchedAt] = useState<number | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesError, setRatesError] = useState<string | null>(null);

  const [status, setStatus] = useState<AnchorFlowStatus>({ state: 'idle' });

  const abortPollRef = useRef<AbortController | null>(null);

  const refreshRates = useCallback(async () => {
    setRatesLoading(true);
    setRatesError(null);

    try {
      // /api/anchor/rates is not versioned; it returns { rates, stale }
      const res = await apiClient.get('/api/anchor/rates');
      if (res === null) return; // session expiry flow triggered
      const body = (await res.json()) as AnchorRatesResponse;
      setRates(body.rates ?? null);
      setRatesStale(Boolean(body.stale));
      setRatesFetchedAt(Date.now());

      if (!res.ok) {
        setRatesError(body ? t('rates.error') : t('rates.error'));
      }
    } catch (e) {
      setRatesError(t('rates.error'));
    } finally {
      setRatesLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refreshRates();
  }, [refreshRates]);

  const staleAgeSeconds = useMemo(() => {
    if (!ratesFetchedAt) return null;
    return formatElapsedSeconds(Date.now() - ratesFetchedAt);
  }, [ratesFetchedAt, ratesLoading]);

  const cancelPolling = useCallback(() => {
    abortPollRef.current?.abort();
    abortPollRef.current = null;
  }, []);

  const submitFlow = useCallback(
    async (payload: {
      direction: AnchorFlowDirection;
      amount: string;
      currency: string;
      destination?: string;
    }) => {
      cancelPolling();

      setStatus({ state: 'submitting' });

      const route = payload.direction === 'deposit' ? '/api/v1/anchor/deposit' : '/api/v1/anchor/withdraw';

      try {
        const body =
          payload.direction === 'deposit'
            ? {
                amount: payload.amount,
                currency: payload.currency,
                destination: payload.destination,
              }
            : {
                amount: payload.amount,
                currency: payload.currency,
                destinationAccount: payload.destination,
              };

        const res = await apiClient.post(route, {
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (res === null) return; // session expiry flow triggered

        const data = (await res.json()) as AnchorFlowResponse & {
          pendingFlowId?: string;
          anchorTransactionId?: string;
          url?: string;
        };

        if (!res.ok) {
          setStatus({
            state: 'failed',
            error: data?.error ? String(data.error) : t('rates.error'),
          });
          return;
        }

        const pendingFlowId = typeof (data as any).pendingFlowId === 'string' ? (data as any).pendingFlowId : undefined;
        const anchorTransactionId = typeof (data as any).anchorTransactionId === 'string' ? (data as any).anchorTransactionId : undefined;
        const url = typeof (data as any).url === 'string' ? (data as any).url : undefined;

        setStatus({
          state: 'awaiting_interactive',
          pendingFlowId,
          anchorTransactionId,
          url,
        });

        // Poll status endpoint (to be implemented server-side if missing)
        const controller = new AbortController();
        abortPollRef.current = controller;

        const startedAt = Date.now();

        // eslint-disable-next-line no-constant-condition
        while (true) {
          if (controller.signal.aborted) return;
          const elapsed = Date.now() - startedAt;
          if (elapsed > timeoutMs) {
            setStatus({ state: 'timeout', pendingFlowId, anchorTransactionId, url });
            return;
          }

          // Best-effort polling endpoint.
          // Expected response shape:
          // { status: 'pending'|'completed'|'failed', error?: string }
          const statusRes = await apiClient.post('/api/anchor/flow/status', {
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pendingFlowId, anchorTransactionId }),
          });

          if (statusRes === null) return;

          const statusBody = (await statusRes.json()) as any;
          const next = statusBody?.status;

          if (next === 'completed') {
            setStatus({ state: 'completed', pendingFlowId, anchorTransactionId, url });
            return;
          }

          if (next === 'failed') {
            setStatus({
              state: 'failed',
              error: statusBody?.error ? String(statusBody.error) : 'Anchor flow failed',
              pendingFlowId,
              anchorTransactionId,
              url,
            });
            return;
          }

          await new Promise((r) => setTimeout(r, pollIntervalMs));
        }
      } catch (e) {
        setStatus({
          state: 'failed',
          error: e instanceof Error ? e.message : 'Anchor flow failed',
        });
      }
    },
    [cancelPolling, pollIntervalMs, timeoutMs, t]
  );

  useEffect(() => {
    return () => cancelPolling();
  }, [cancelPolling]);

  return {
    rates,
    ratesStale,
    ratesFetchedAt,
    ratesLoading,
    ratesError,
    staleAgeSeconds,
    refreshRates,
    status,
    submitFlow,
    cancelPolling,
  };
}

