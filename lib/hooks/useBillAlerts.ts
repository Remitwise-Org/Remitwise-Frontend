"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/client/apiClient";
import type { BillReminder } from "@/lib/bills-reminders";

export interface UseBillAlertsResult {
  /** Bills due soon (or overdue) — see `getBillsDueSoon` for the window rules. */
  alerts: BillReminder[];
  isLoading: boolean;
  error: string | null;
  /** Re-fetches the alerts list. Safe to call from event handlers. */
  refresh: () => void;
}

/**
 * Typed hook for `GET /api/v1/bills/due-soon` — this app's alerts endpoint:
 * upcoming/overdue bill reminders for the signed-in wallet.
 */
export function useBillAlerts(): UseBillAlertsResult {
  const [alerts, setAlerts] = useState<BillReminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.getJson<BillReminder[]>("/api/v1/bills/due-soon");
      // `null` means the session-expiry flow already took over (redirect).
      if (data === null) return;
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alerts");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { alerts, isLoading, error, refresh: load };
}
