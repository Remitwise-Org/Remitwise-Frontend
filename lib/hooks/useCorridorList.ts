"use client";

import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/client/apiClient";
import type { ExchangeRate } from "@/lib/anchor/client";

export interface Corridor {
  /** Source asset/currency, e.g. "USDC". */
  from: string;
  /** Destination asset/currency, e.g. "PHP". */
  to: string;
  /** Units of `to` received per one unit of `from`. */
  rate: number;
}

export interface UseCorridorListResult {
  corridors: Corridor[];
  loading: boolean;
  error: string | null;
  /** True when `/api/anchor/rates` served a cached fallback because the
   * upstream Anchor call failed -- corridors are still shown, just possibly
   * outdated. */
  stale: boolean;
}

function toCorridors(rates: ExchangeRate[]): Corridor[] {
  return rates.map((rate) => ({
    from: rate.sell_asset,
    to: rate.buy_asset,
    rate: parseFloat(rate.price),
  }));
}

const IDLE: UseCorridorListResult = { corridors: [], loading: true, error: null, stale: false };

/** Fetches the list of supported send corridors (currency pairs + rate)
 * from `/api/anchor/rates`, reshaped from the raw `ExchangeRate[]` the
 * Anchor client returns. Centralizes that reshaping so callers (e.g. the
 * send flow's currency picker) don't each re-derive it from scratch. */
export function useCorridorList(): UseCorridorListResult {
  const [result, setResult] = useState<UseCorridorListResult>(IDLE);

  const load = useCallback(async () => {
    setResult((current) => ({ ...current, loading: true, error: null }));

    const res = await apiClient.get("/api/anchor/rates");
    if (res === null) return; // session-expiry flow already handled this

    if (!res.ok) {
      setResult({ corridors: [], loading: false, error: `Request failed with status ${res.status}`, stale: false });
      return;
    }

    const body = (await res.json()) as { rates: ExchangeRate[]; stale: boolean };
    setResult({ corridors: toCorridors(body.rates ?? []), loading: false, error: null, stale: Boolean(body.stale) });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return result;
}
