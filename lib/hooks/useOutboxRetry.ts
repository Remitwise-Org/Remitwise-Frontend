"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/client/apiClient";

export const OUTBOX_DLQ_URL = "/api/v1/admin/webhooks/dlq";
export const OUTBOX_PROCESS_URL = "/api/v1/admin/webhooks/process";

export function replayEventUrl(eventId: string): string {
  return `${OUTBOX_DLQ_URL}/${encodeURIComponent(eventId)}/replay`;
}

export interface OutboxEvent {
  id: string;
  source: string;
  eventType: string;
  status: string;
  retryCount: number;
  maxRetries: number;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OutboxStats {
  pending: number;
  processing: number;
  processed: number;
  failed: number;
  dlq: number;
  total: number;
}

export interface UseOutboxRetryResult {
  events: OutboxEvent[];
  stats: OutboxStats | null;
  isLoading: boolean;
  error: string | null;
  /** ids currently being retried, for per-row loading state */
  retryingIds: Set<string>;
  refresh: () => void;
  /** Replay a single dead-lettered event via POST .../[id]/replay. */
  retryOne: (eventId: string) => Promise<boolean>;
  /** Trigger a bulk reprocess of all pending events via POST .../process. */
  retryAll: () => Promise<boolean>;
}

/**
 * Admin-panel hook for the webhook outbox's dead-letter queue: lists
 * dead-lettered events and exposes single-event and bulk retry actions.
 * Backed by `GET /api/v1/admin/webhooks/dlq` and
 * `POST /api/v1/admin/webhooks/{dlq/:id/replay,process}`.
 */
export function useOutboxRetry(): UseOutboxRetryResult {
  const [events, setEvents] = useState<OutboxEvent[]>([]);
  const [stats, setStats] = useState<OutboxStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryingIds, setRetryingIds] = useState<Set<string>>(new Set());
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => setRefreshToken((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      const res = await apiClient.get(OUTBOX_DLQ_URL);
      if (cancelled) return;

      if (res === null) {
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        setError(res.statusText || "Failed to load outbox events");
        setIsLoading(false);
        return;
      }

      const body = await res.json().catch(() => null);
      if (cancelled) return;

      setEvents(body?.data?.events ?? []);
      setStats(body?.data?.stats ?? null);
      setIsLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  const retryOne = useCallback(
    async (eventId: string): Promise<boolean> => {
      setRetryingIds((prev) => new Set(prev).add(eventId));
      try {
        const res = await apiClient.post(replayEventUrl(eventId));
        if (res && res.ok) {
          refresh();
          return true;
        }
        return false;
      } finally {
        setRetryingIds((prev) => {
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
      }
    },
    [refresh],
  );

  const retryAll = useCallback(async (): Promise<boolean> => {
    const res = await apiClient.post(OUTBOX_PROCESS_URL);
    const ok = !!res && res.ok;
    if (ok) refresh();
    return ok;
  }, [refresh]);

  return { events, stats, isLoading, error, retryingIds, refresh, retryOne, retryAll };
}
