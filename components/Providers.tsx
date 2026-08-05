"use client";

import { ReactNode, useEffect, lazy, Suspense } from "react";
import { WalletProvider, useWallet } from "stellar-wallet-kit";
import { DensityProvider } from "@/lib/context/DensityContext";
import { TelemetryProvider } from "@/lib/context/TelemetryContext";
import { ThemeProvider } from "@/lib/context/ThemeContext";
import { ToastProvider } from "@/lib/context/ToastContext";
import { NetworkStatusProvider } from "@/lib/context/NetworkStatusContext";
import { AsyncOperationsProvider } from "@/lib/context/AsyncOperationsContext";
import { ConfirmProvider } from "@/lib/context/ConfirmContext";
import { ShortcutHelpProvider } from "@/lib/context/ShortcutHelpContext";
import LayoutWrapper from "@/components/LayoutWrapper";
import ToastRegion from "@/components/ToastRegion";
import SessionExpiryProvider from "@/components/SessionExpiryProvider";
import CommandPalette from "@/components/CommandPalette";
import DevRequestIdDisplay from "@/components/DevRequestIdDisplay";
import DevResetHandler from "@/components/dev/DevResetHandler";

/**
 * Client-side provider boundary for the app.
 *
 * `stellar-wallet-kit`'s `WalletProvider` (and the app's React context
 * providers) rely on React client features such as `createContext`, so they
 * must live inside a `"use client"` boundary. Keeping them in this dedicated
 * component prevents them from being pulled into the server (RSC) graph of the
 * root layout, which would otherwise fail during static page-data collection.
 */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <WalletProvider>
      <ApiClientAuthBridge />
      <UnhandledRejectionListener />
      <ToastProvider>
        <DensityProvider>
          <TelemetryProvider>
            <AsyncOperationsProvider>
              <SessionExpiryProvider>
                <LayoutWrapper>{children}</LayoutWrapper>
                <ToastRegion />
                <CommandPalette />
                <DevRequestIdDisplay />
                <DevResetHandler />
              </SessionExpiryProvider>
            </AsyncOperationsProvider>
          </TelemetryProvider>
        </DensityProvider>
      </ToastProvider>
    </WalletProvider>
  );
}
