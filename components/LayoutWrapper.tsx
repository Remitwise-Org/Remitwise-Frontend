
"use client";

import { usePathname } from 'next/navigation';
import Header from "@/components/Header";
import Footer from "@/components/footer";
import FinalCallToAction from "@/components/FinalCallToAction";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isExcluded = pathname === '/transactions' || pathname.startsWith('/dashboard');
    const isExcluded = pathname === '/transactions' || pathname === '/financial-insights';

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
