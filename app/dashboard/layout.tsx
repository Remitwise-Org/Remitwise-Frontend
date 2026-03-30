import { WhatsNewProvider } from "@/lib/context/WhatsNewContext";
import WhatsNewPanel from "@/components/Dashboard/WhatsNewPanel";
import PrimaryNav from "@/components/Nav/PrimaryNav";
import SubNav from "@/components/Nav/SubNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WhatsNewProvider>
      <div className="min-h-screen bg-bg3">
        <PrimaryNav />
        <SubNav />
        {/* 
                    pt-20 for PrimaryNav (80px) 
                    + pt-16 for SubNav (64px) = 144px 
                */}
        <div className="pt-36">{children}</div>
        <WhatsNewPanel />
      </div>
    </WhatsNewProvider>
  );
}
