import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";
import { DensityProvider } from "@/lib/context/DensityContext";
import { ToastProvider } from "@/lib/context/ToastContext";
import { ContractOperationsProvider } from "@/lib/context/ContractOperationsContext";
import ToastRegion from "@/components/ToastRegion";
import SessionExpiryProvider from "@/components/SessionExpiryProvider";
import CommandPalette from "@/components/CommandPalette";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RemitWise - Smart Remittance & Financial Planning",
  description:
    "A remittance app that helps families save, plan, and protect — not just send money.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} starry-bg min-h-screen`}>
        <ToastProvider>
          <DensityProvider>
            <ContractOperationsProvider>
              <SessionExpiryProvider>
                <LayoutWrapper>
                  {children}
                </LayoutWrapper>
                <ToastRegion />
                <CommandPalette />
              </SessionExpiryProvider>
            </ContractOperationsProvider>
          </DensityProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
