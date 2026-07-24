"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WalletProvider } from "stellar-wallet-kit";
import { DensityProvider } from "@/lib/context/DensityContext";
import { ThemeProvider } from "@/lib/context/ThemeContext";
import { ToastProvider } from "@/lib/context/ToastContext";
import { AsyncOperationsProvider } from "@/lib/context/AsyncOperationsContext";
import LayoutWrapper from "@/components/LayoutWrapper";
import ToastRegion from "@/components/ToastRegion";
import SessionExpiryProvider from "@/components/SessionExpiryProvider";
import CommandPalette from "@/components/CommandPalette";
import DevRequestIdDisplay from "@/components/DevRequestIdDisplay";
import ConsentBanner from "@/components/ConsentBanner";
import { SWR_DEFAULTS } from "@/lib/config/swr";
import { ShortcutHelpProvider } from "@/lib/context/ShortcutHelpContext";
import ShortcutHelpModal from "@/components/ShortcutHelpModal";

const queryClient = new QueryClient({
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
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <ThemeProvider>
          <ToastProvider>
            <DensityProvider>
              <AsyncOperationsProvider>
                <SessionExpiryProvider>
                  <ShortcutHelpProvider>
                    <LayoutWrapper>{children}</LayoutWrapper>
                    <ToastRegion />
                    <CommandPalette />
                    <DevRequestIdDisplay />
                    <ShortcutHelpModal />
                    <ConsentBanner />
                  </ShortcutHelpProvider>
                </SessionExpiryProvider>
              </AsyncOperationsProvider>
            </DensityProvider>
          </ToastProvider>
        </ThemeProvider>
      </WalletProvider>
    </QueryClientProvider>
  );
}
