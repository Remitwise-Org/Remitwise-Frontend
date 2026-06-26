"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { PieChart, Target, Zap, History, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";

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

    const containerRef = useRef<HTMLUListElement>(null);
    const activeIndex = links.findIndex(link => isActive(link.href));
    const initialIndex = activeIndex !== -1 ? activeIndex : 0;
    const [focusedIndex, setFocusedIndex] = useState(initialIndex);

    // Sync focusedIndex with pathname changes (e.g. initial render or clicking a link)
    useEffect(() => {
        const activeIdx = links.findIndex(link => isActive(link.href));
        if (activeIdx !== -1) {
            setFocusedIndex(activeIdx);
        }
    }, [pathname]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
        let nextIndex = focusedIndex;
        switch (e.key) {
            case "ArrowLeft":
            case "ArrowUp":
                nextIndex = (focusedIndex - 1 + links.length) % links.length;
                break;
            case "ArrowRight":
            case "ArrowDown":
                nextIndex = (focusedIndex + 1) % links.length;
                break;
            case "Home":
                nextIndex = 0;
                break;
            case "End":
                nextIndex = links.length - 1;
                break;
            default:
                return; // Let other keys propagate naturally
        }

        e.preventDefault();
        setFocusedIndex(nextIndex);

        // Move focus to the target link element
        if (containerRef.current) {
            const items = containerRef.current.querySelectorAll('[role="tab"]');
            const targetEl = items[nextIndex] as HTMLElement;
            if (targetEl) {
                targetEl.focus();
            }
        }
    };

    return (
        <nav aria-label="Dashboard sub-navigation" className="fixed top-16 z-40 w-full overflow-x-hidden border-b border-white/5 bg-[#0F0F0F]/80 py-3 backdrop-blur-md 375:top-20 375:py-4">
            <div className="mx-auto max-w-7xl overflow-x-hidden px-4 sm:px-6 lg:px-8">
                <ul
                    ref={containerRef}
                    role="tablist"
                    onKeyDown={handleKeyDown}
                    className="flex min-w-0 items-center gap-1 sm:gap-2 focus:outline-none"
                >
                    {links.map((link, index) => {
                        const isCurrent = isActive(link.href);
                        return (
                            <li key={link.name} role="presentation">
                                <Link
                                    href={link.href}
                                    role="tab"
                                    aria-selected={isCurrent}
                                    aria-current={isCurrent ? "page" : undefined}
                                    tabIndex={focusedIndex === index ? 0 : -1}
                                    className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-medium transition-all duration-300 whitespace-nowrap group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/50 375:gap-2 375:px-4 sm:text-sm
                                        ${isCurrent
                                            ? "text-brand-red bg-brand-red/10 border border-brand-red/20 shadow-[0_0_15px_rgba(215,35,35,0.1)]"
                                            : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                                        }`}
                                >
                                    {link.icon}
                                    {link.name}
                                    {isCurrent && <ChevronRight className="w-4 h-4 opacity-50" />}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </nav>
    );
};

export default SubNav;
