import { WhatsNewProvider } from "@/lib/context/WhatsNewContext";
import WhatsNewPanel from "@/components/Dashboard/WhatsNewPanel";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <WhatsNewProvider>
            <div>
                {children}
                <WhatsNewPanel />
            </div>
        </WhatsNewProvider>
    );
}