"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/footer";
import FinalCallToAction from "@/components/FinalCallToAction";
import RootErrorBoundary from "@/components/RootErrorBoundary";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const excludedRoutes = ["/transactions", "/financial-insights"];

  const isExcluded =
    excludedRoutes.includes(pathname) || pathname.startsWith("/dashboard");

  if (isExcluded) {
    return <RootErrorBoundary>{children}</RootErrorBoundary>;
  }

  return (
    <RootErrorBoundary>
      <Header />
      <div className="pt-20">
        {children}
        <FinalCallToAction />
        <Footer />
      </div>
    </RootErrorBoundary>
  );
}
