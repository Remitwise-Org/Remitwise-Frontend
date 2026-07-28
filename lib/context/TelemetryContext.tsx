"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { DEV_TELEMETRY_STORAGE_KEY } from "@/lib/config/developer";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TelemetryEventLevel = "debug" | "info" | "warn" | "error";

export interface TelemetryEvent {
  /** ISO-8601 timestamp set automatically by logTelemetry(). */
  timestamp: string;
  level: TelemetryEventLevel;
  /** Dot-separated path identifying the emitting module, e.g. "wallet.send". */
  source: string;
  message: string;
  /** Any structured key/value payload relevant to the event. */
  payload?: Record<string, unknown>;
}

interface TelemetryContextType {
  /** Whether the developer telemetry toggle is currently on. */
  telemetryEnabled: boolean;
  /** Persist the toggle state to localStorage. */
  setTelemetryEnabled: (enabled: boolean) => void;
  /**
   * Emit a structured telemetry event to the console when the toggle is on.
   * Safe to call unconditionally — no-ops when telemetry is disabled.
   */
  logTelemetry: (
    source: string,
    message: string,
    payload?: Record<string, unknown>,
    level?: TelemetryEventLevel,
  ) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const TelemetryContext = createContext<TelemetryContextType | undefined>(
  undefined,
);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  const [telemetryEnabled, setTelemetryState] = useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch).
  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(DEV_TELEMETRY_STORAGE_KEY);
        if (stored !== null) {
          setTelemetryState(JSON.parse(stored) === true);
        }
      }
    } catch {
      // Corrupted or restricted storage — stay at default (false).
    }
  }, []);

  const setTelemetryEnabled = useCallback((enabled: boolean) => {
    setTelemetryState(enabled);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          DEV_TELEMETRY_STORAGE_KEY,
          JSON.stringify(enabled),
        );
      }
    } catch {
      // Silently ignore when localStorage is unavailable.
    }
  }, []);

  // Keep a ref so logTelemetry always sees the current flag without stale closures.
  const enabledRef = useRef(telemetryEnabled);
  useEffect(() => {
    enabledRef.current = telemetryEnabled;
  }, [telemetryEnabled]);

  const logTelemetry = useCallback(
    (
      source: string,
      message: string,
      payload?: Record<string, unknown>,
      level: TelemetryEventLevel = "debug",
    ) => {
      if (!enabledRef.current) return;

      const event: TelemetryEvent = {
        timestamp: new Date().toISOString(),
        level,
        source,
        message,
        ...(payload !== undefined && { payload }),
      };

      // Mirror the log level to the appropriate console method.
      switch (level) {
        case "error":
          console.error("[telemetry]", JSON.stringify(event));
          break;
        case "warn":
          console.warn("[telemetry]", JSON.stringify(event));
          break;
        case "info":
          console.info("[telemetry]", JSON.stringify(event));
          break;
        default:
          console.debug("[telemetry]", JSON.stringify(event));
      }
    },
    [],
  );

  return (
    <TelemetryContext.Provider
      value={{ telemetryEnabled, setTelemetryEnabled, logTelemetry }}
    >
      {children}
    </TelemetryContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Access developer telemetry state and the structured console logger.
 *
 * @throws {Error} When called outside of a `<TelemetryProvider>` tree.
 *
 * @example
 * const { logTelemetry } = useTelemetry();
 * logTelemetry("wallet.send", "Transfer initiated", { amount: 10, currency: "USDC" });
 */
export function useTelemetry(): TelemetryContextType {
  const context = useContext(TelemetryContext);
  if (context === undefined) {
    throw new Error(
      "useTelemetry must be used within a TelemetryProvider. " +
        "Did you forget to wrap your component in <TelemetryProvider>?",
    );
  }
  return context;
}
