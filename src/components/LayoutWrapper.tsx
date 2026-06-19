

import { useLocation } from "wouter";
import Header from "@/components/Header";
import Footer from "@/components/footer";
import FinalCallToAction from "@/components/FinalCallToAction";

export default function LayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pathname] = useLocation();
  const excludedRoutes = ["/transactions", "/financial-insights"];

  const isExcluded =
    excludedRoutes.includes(pathname) || pathname.startsWith("/dashboard");

  if (isExcluded) {
    return <>{children}</>;
  }

  return (
    <>
      <Header />
      {/* Add padding-top to account for fixed header */}
      <div className="pt-20">
        {children}
        <FinalCallToAction />
        <Footer />
      </div>
    </>
  );
}
