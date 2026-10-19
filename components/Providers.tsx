"use client";

import { ReactNode, useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import UnhandledRejectionListener from "@/components/UnhandledRejectionListener";
import { apiClient } from "@/lib/client/apiClient";
import ConfirmDialog from "@/components/ConfirmDialog";
import ConsentBanner from "@/components/ConsentBanner";
import ShortcutHelpModal from "@/components/ShortcutHelpModal";
import { WhatsNewProvider } from "@/lib/context/WhatsNewContext";
import { SWR_DEFAULTS } from "@/lib/config/swr";

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: SWR_DEFAULTS.staleTime,
        gcTime: SWR_DEFAULTS.gcTime,
        refetchOnWindowFocus: SWR_DEFAULTS.refetchOnWindowFocus,
        refetchOnReconnect: SWR_DEFAULTS.refetchOnReconnect,
        retry: SWR_DEFAULTS.retry,
        retryDelay: SWR_DEFAULTS.retryDelay,
      },
    },
  });
}

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
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
    <WalletProvider>
      <ApiClientAuthBridge />
      <UnhandledRejectionListener />
      <ThemeProvider>
        <ToastProvider>
          <NetworkStatusProvider>
            <ConfirmProvider>
              <ShortcutHelpProvider>
               <WhatsNewProvider>
                <DensityProvider>
                  <TelemetryProvider>
                    <AsyncOperationsProvider>
                      <SessionExpiryProvider>
                        <LayoutWrapper>{children}</LayoutWrapper>
                        <ToastRegion />
                        <CommandPalette />
                        <DevRequestIdDisplay />
                        <DevResetHandler />
                        <ConsentBanner />
                      </SessionExpiryProvider>
                    </AsyncOperationsProvider>
                  </TelemetryProvider>
                </DensityProvider>
               </WhatsNewProvider>
                <ShortcutHelpModal />
              </ShortcutHelpProvider>
              <ConfirmDialog />
            </ConfirmProvider>
          </NetworkStatusProvider>
        </ToastProvider>
      </ThemeProvider>
    </WalletProvider>
    </QueryClientProvider>
  );
}
