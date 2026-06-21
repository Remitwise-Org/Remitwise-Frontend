"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ExchangeRate } from "@/lib/anchor/client";
import { apiClient } from "@/lib/client/apiClient";

/** Client-side TTL: 2 minutes — shorter than the 5-min server cache so clients
 *  revalidate before the server value goes stale. */
export const CLIENT_RATES_TTL_MS = 2 * 60 * 1000;

export interface RatesState {
  rates: ExchangeRate[];
  loading: boolean;
  /** true when rates were served stale by the API */
  stale: boolean;
  error: string | null;
  /** Manually trigger a fresh fetch, ignoring the client TTL. */
  refresh: () => void;
}

const RatesContext = createContext<RatesState | null>(null);

/**
 * Provides a single shared exchange-rate fetch to all descendant consumers.
 * A single in-flight request is shared; subsequent subscribers reuse the
 * cached value until CLIENT_RATES_TTL_MS elapses.
 */
export function RatesProvider({ children }: { children: React.ReactNode }) {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Timestamp of the last successful fetch (ms). */
  const lastFetchedAt = useRef<number>(0);
  /** In-flight promise so concurrent callers share one request. */
  const inflightRef = useRef<Promise<void> | null>(null);

  const fetchRates = useCallback(async (force = false) => {
    const isFresh = lastFetchedAt.current > 0 && (Date.now() - lastFetchedAt.current) < CLIENT_RATES_TTL_MS;
    if (!force && isFresh) return;

    // Share an in-flight request
    if (inflightRef.current) return inflightRef.current;

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get("/api/anchor/rates");
        if (!res || !res.ok) {
          throw new Error(`HTTP ${res?.status ?? "error"}`);
        }
        const data: { rates: ExchangeRate[]; stale: boolean } = await res.json();
        setRates(data.rates ?? []);
        setStale(data.stale ?? false);
        lastFetchedAt.current = Date.now();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
        inflightRef.current = null;
      }
    };

    inflightRef.current = run();
    return inflightRef.current;
  }, []);

  useEffect(() => {
    fetchRates();
    const id = setInterval(() => fetchRates(), CLIENT_RATES_TTL_MS);
    return () => clearInterval(id);
  }, [fetchRates]);

  const refresh = useCallback(() => fetchRates(true), [fetchRates]);

  return (
    <RatesContext.Provider value={{ rates, loading, stale, error, refresh }}>
      {children}
    </RatesContext.Provider>
  );
}

/**
 * Returns the shared exchange-rate state from the nearest RatesProvider.
 * Throws if used outside a provider.
 */
export function useExchangeRates(): RatesState {
  const ctx = useContext(RatesContext);
  if (!ctx) throw new Error("useExchangeRates must be used within a RatesProvider");
  return ctx;
}

/**
 * Returns the numeric price for a given sell/buy asset pair, or undefined
 * when rates are not yet loaded or the pair is not found.
 */
export function useRateForPair(
  sellAsset: string,
  buyAsset: string
): number | undefined {
  const { rates } = useExchangeRates();
  const entry = rates.find(
    (r) => r.sell_asset === sellAsset && r.buy_asset === buyAsset
  );
  return entry ? parseFloat(entry.price) : undefined;
}
