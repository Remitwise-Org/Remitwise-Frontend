"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { PieChart, Target, Zap, History, ChevronRight } from "lucide-react";

const SubNav = () => {
    const pathname = usePathname();

    const links = [
        { name: "Overview", href: "/dashboard", icon: <PieChart className="w-4 h-4" /> },
        { name: "Savings Goals", href: "/dashboard/goals", icon: <Target className="w-4 h-4" /> },
        { name: "Insights", href: "/dashboard/insight", icon: <Zap className="w-4 h-4" /> },
        { name: "History", href: "/dashboard/transaction-history", icon: <History className="w-4 h-4" /> },
    ];

    const isActive = (href: string) => {
        if (href === "/dashboard") return pathname === "/dashboard";
        return pathname.startsWith(href);
    };

    return (
        <nav aria-label="Dashboard sub-navigation" className="fixed top-16 z-40 w-full overflow-x-hidden border-b border-white/5 bg-[#0F0F0F]/80 py-3 backdrop-blur-md 375:top-20 375:py-4">
            <div className="mx-auto max-w-7xl overflow-x-hidden px-4 sm:px-6 lg:px-8">
                <ul className="flex min-w-0 items-center gap-1 sm:gap-2">
                    {links.map((link) => (
                        <li key={link.name}>
                            <Link
                                href={link.href}
                                aria-current={isActive(link.href) ? "page" : undefined}
                                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all duration-300 whitespace-nowrap group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/50 375:gap-2 375:px-4 sm:text-sm
                                    ${isActive(link.href)
                                        ? "text-brand-red bg-brand-red/10 border border-brand-red/20 shadow-[0_0_15px_rgba(215,35,35,0.1)]"
                                        : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                                    }`}
                            >
                                {link.icon}
                                {link.name}
                                {isActive(link.href) && <ChevronRight className="w-4 h-4 opacity-50" />}
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
};

export default SubNav;
