"use client";

import { useState } from "react";
import { 
    Menu, X, Home, 
    Send, LayoutDashboard, FileText, 
    Shield, Users, Settings, 
    PieChart, Target, Zap, 
    History, Wallet, LogOut, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/client/logout";

const MobileNav = () => {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const sections = [
        {
            title: "Main Activity",
            links: [
                { name: "Home", href: "/", icon: <Home className="w-5 h-5" /> },
                { name: "Send Money", href: "/send", icon: <Send className="w-5 h-5" /> },
                { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
            ]
        },
        {
            title: "Finance & Tools",
            links: [
                { name: "Bills & Payments", href: "/bills", icon: <FileText className="w-5 h-5" /> },
                { name: "Insurance", href: "/insurance", icon: <Shield className="w-5 h-5" /> },
                { name: "Family Hub", href: "/family", icon: <Users className="w-5 h-5" /> },
            ]
        },
        {
            title: "Dashboard Sub-Nav",
            links: [
                { name: "Overview", href: "/dashboard", icon: <PieChart className="w-5 h-5" /> },
                { name: "Savings Goals", href: "/dashboard/goals", icon: <Target className="w-5 h-5" /> },
                { name: "Insights", href: "/dashboard/insight", icon: <Zap className="w-5 h-5" /> },
                { name: "History", href: "/dashboard/transaction-history", icon: <History className="w-5 h-5" /> },
            ]
        },
        {
            title: "Account",
            links: [
                { name: "Settings", href: "/settings", icon: <Settings className="w-5 h-5" /> },
                { name: "Wallet Details", href: "/wallet-details", icon: <Wallet className="w-5 h-5" /> },
            ]
        }
    ];

    const isActive = (href: string) => {
        if (href === "/" || href === "/dashboard") return pathname === href;
        return pathname.startsWith(href);
    };

    const handleLogout = async () => {
        setIsOpen(false);
        await logout();
    };

    return (
        <div className="lg:hidden">
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                aria-label="Open Mobile Menu"
            >
                <Menu className="w-5 h-5 text-white/80" />
            </button>

            {/* Menu Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-[100] bg-brand-dark overflow-y-auto stars-bg flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-bold text-white tracking-tight">Menu</span>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-white/80" />
                        </button>
                    </div>

                    {/* Links */}
                    <nav className="flex-1 p-4 sm:p-6 space-y-8 pb-24">
                        {sections.map((section, idx) => (
                            <div key={idx} className="space-y-4">
                                <h3 className="text-xs font-bold text-white/30 uppercase tracking-[0.2rem] px-2">
                                    {section.title}
                                </h3>
                                <div className="space-y-1">
                                    {section.links.map((link) => (
                                        <Link
                                            key={link.name}
                                            href={link.href}
                                            onClick={() => setIsOpen(false)}
                                            className={`flex items-center justify-between p-4 rounded-2xl transition-all group overflow-hidden relative
                                                ${isActive(link.href)
                                                    ? "bg-brand-red/10 border border-brand-red/20 shadow-[0_0_20px_rgba(215,35,35,0.1)]"
                                                    : "hover:bg-white/5 border border-transparent"
                                                }`}
                                        >
                                            <div className="flex items-center gap-4 relative z-10">
                                                <div className={`p-2 rounded-xl transition-colors
                                                    ${isActive(link.href) ? "bg-brand-red text-white" : "bg-white/5 text-white/40 group-hover:text-white/60"}
                                                `}>
                                                    {link.icon}
                                                </div>
                                                <span className={`font-semibold transition-colors
                                                    ${isActive(link.href) ? "text-white" : "text-white/70 group-hover:text-white"}
                                                `}>
                                                    {link.name}
                                                </span>
                                            </div>
                                            <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1
                                                ${isActive(link.href) ? "text-brand-red" : "text-white/20 group-hover:text-white/40"}
                                            `} />
                                            {isActive(link.href) && (
                                                <span className="absolute inset-0 bg-brand-red/5 blur-xl -z-10" />
                                            )}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* Footer / Account */}
                    <div className="p-4 sm:p-6 border-t border-white/5 bg-brand-dark/50 backdrop-blur-xl mt-auto sticky bottom-0">
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-red-600/10 to-transparent border border-red-600/20 text-red-500 font-bold tracking-wide hover:from-red-600 hover:to-red-700 hover:text-white transition-all shadow-xl shadow-red-600/5 group"
                        >
                            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                            SIGN OUT
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MobileNav;
