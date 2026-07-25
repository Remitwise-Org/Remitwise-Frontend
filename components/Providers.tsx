"use client";

import { ReactNode, useEffect } from "react";
import { WalletProvider, useWallet } from "stellar-wallet-kit";
import { DensityProvider } from "@/lib/context/DensityContext";
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
import ShortcutHelpModal from "@/components/ShortcutHelpModal";
import { apiClient } from "@/lib/client/apiClient";

/** Keeps the API client's authorization header aligned with wallet state. */
function ApiClientAuthBridge() {
  const { account, isConnected } = useWallet();

  useEffect(() => {
    apiClient.setAuthToken(isConnected ? account?.address : null);
  }, [account?.address, isConnected]);

  return null;
}

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
      <ToastProvider>
        <DensityProvider>
          <AsyncOperationsProvider>
            <SessionExpiryProvider>
              <ShortcutHelpProvider>
                <LayoutWrapper>{children}</LayoutWrapper>
                <ToastRegion />
                <CommandPalette />
                <ShortcutHelpModal />
              </ShortcutHelpProvider>
            </SessionExpiryProvider>
          </AsyncOperationsProvider>
        </DensityProvider>
      </ToastProvider>
    </WalletProvider>
  );
}
