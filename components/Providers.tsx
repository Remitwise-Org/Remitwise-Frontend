"use client";

import { ReactNode } from "react";
import { WalletProvider } from "stellar-wallet-kit";
import { DensityProvider } from "@/lib/context/DensityContext";
import { ToastProvider } from "@/lib/context/ToastContext";
import { AsyncOperationsProvider } from "@/lib/context/AsyncOperationsContext";
import LayoutWrapper from "@/components/LayoutWrapper";
import ToastRegion from "@/components/ToastRegion";
import SessionExpiryProvider from "@/components/SessionExpiryProvider";
import CommandPalette from "@/components/CommandPalette";

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
      <ToastProvider>
        <DensityProvider>
          <AsyncOperationsProvider>
            <SessionExpiryProvider>
              <LayoutWrapper>{children}</LayoutWrapper>
              <ToastRegion />
              <CommandPalette />
            </SessionExpiryProvider>
          </AsyncOperationsProvider>
        </DensityProvider>
      </ToastProvider>
    </WalletProvider>
  );
}
