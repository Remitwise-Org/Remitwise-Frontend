"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/client/apiClient";

export const AUTH_ME_URL = "/api/auth/me";

export interface TenantInfo {
  /** The signed-in wallet address. This app is single-tenant-per-session:
   * the "tenant" is the authenticated address itself, not a separate
   * organization/workspace id. */
  tenantId: string;
  expiresAt?: number;
}

export interface UseTenantResult {
  tenant: TenantInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

/**
 * Resolves the current tenant (the authenticated wallet address) from the
 * session, backed by `GET /api/auth/me`. Returns `isAuthenticated: false`
 * (not an error) for the expected 401-when-signed-out case.
 */
export function useTenant(): UseTenantResult {
  const [tenant, setTenant] = useState<TenantInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      const res = await apiClient.get(AUTH_ME_URL);
      if (cancelled) return;

      if (res === null) {
        // session expiry handler already ran in apiClient
        setIsLoading(false);
        return;
      }

      if (res.status === 401) {
        setTenant(null);
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        setError(res.statusText || "Failed to resolve tenant");
        setIsLoading(false);
        return;
      }

      const data = (await res.json().catch(() => null)) as
        | { address?: string; expiresAt?: number }
        | null;

      if (!data?.address) {
        setError("Malformed session response");
        setIsLoading(false);
        return;
      }

      setTenant({ tenantId: data.address, expiresAt: data.expiresAt });
      setIsLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { tenant, isAuthenticated: tenant !== null, isLoading, error };
}
