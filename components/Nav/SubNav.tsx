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
        <div className="w-full bg-[#0F0F0F]/80 backdrop-blur-md border-b border-white/5 py-4 top-20 fixed z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1 sm:gap-2">
                    {links.map((link) => (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 whitespace-nowrap group
                                ${isActive(link.href)
                                    ? "text-brand-red bg-brand-red/10 border border-brand-red/20 shadow-[0_0_15px_rgba(215,35,35,0.1)]"
                                    : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                                }`}
                        >
                            {link.icon}
                            {link.name}
                            {isActive(link.href) && <ChevronRight className="w-4 h-4 opacity-50" />}
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SubNav;
