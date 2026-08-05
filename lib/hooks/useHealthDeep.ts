"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/client/apiClient";

export const HEALTH_DEEP_URL = "/api/health";

export type HealthDeepStatus = "ok" | "degraded";

export interface HealthDeepDependency {
  reachable: boolean;
  error?: string;
}

export interface HealthDeepRpcDependency extends HealthDeepDependency {
  latestLedger?: number;
  protocolVersion?: number;
  networkPassphrase?: string;
  network?: string;
}

/** Response shape of `GET /api/health` (the full/deep dependency check). */
export interface HealthDeepResponse {
  status: HealthDeepStatus;
  database: HealthDeepDependency;
  rpc: HealthDeepRpcDependency;
  anchor: HealthDeepDependency;
  contractIds?: Record<string, string>;
  timestamp: string;
}

export interface UseHealthDeepResult {
  data: HealthDeepResponse | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Typed hook for the deep health-check endpoint (`GET /api/health`), which
 * probes the database, Soroban RPC, and anchor and returns 503 when any
 * critical dependency is unreachable. Intended for admin/ops surfaces, not
 * for gating end-user flows.
 */
export function useHealthDeep(): UseHealthDeepResult {
  const [data, setData] = useState<HealthDeepResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => {
    setRefreshToken((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      const res = await apiClient.get(HEALTH_DEEP_URL);
      if (cancelled) return;

      if (res === null) {
        // session expiry handler already ran in apiClient
        setIsLoading(false);
        return;
      }

      // 503 is a valid, informative response here (a dependency is down) --
      // the body is still parsed and surfaced, not treated as a fetch failure.
      const body = (await res.json().catch(() => null)) as HealthDeepResponse | null;

      if (!body) {
        setError(res.statusText || "Failed to parse health response");
        setIsLoading(false);
        return;
      }

      setData(body);
      setIsLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [refreshToken]);

  return { data, isLoading, error, refresh };
}
