import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import LayoutWrapper from "@/components/LayoutWrapper";
import { DensityProvider } from "@/lib/context/DensityContext";

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
        <DensityProvider>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </DensityProvider>
      </body>
    </html>
  );
}
