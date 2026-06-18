"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Send, LayoutDashboard, FileText, Shield, Users, Settings, Bell } from "lucide-react";
import Logo from "./Logo";
import WalletButton from "../WalletButton";
import MobileNav from "./MobileNav";
import { useWhatsNewOptional } from "@/lib/context/WhatsNewContext";
import WhatsNewBadge from "@/components/Dashboard/WhatsNewBadge";

const PrimaryNav = () => {
    const pathname = usePathname();
    const whatsNew = useWhatsNewOptional();

    const links = [
        { name: "Send", href: "/send", icon: <Send className="w-4 h-4" /> },
        { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
        { name: "Bills", href: "/bills", icon: <FileText className="w-4 h-4" /> },
        { name: "Insurance", href: "/insurance", icon: <Shield className="w-4 h-4" /> },
        { name: "Family", href: "/family", icon: <Users className="w-4 h-4" /> },
        { name: "Settings", href: "/settings", icon: <Settings className="w-4 h-4" /> },
    ];

    const isActive = (href: string) => {
        if (href === "/") return pathname === "/";
        return pathname.startsWith(href);
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-[60] border-b border-white/5 bg-brand-dark/50 backdrop-blur-xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-20">
                    {/* Left: Logo */}
                    <div className="flex-shrink-0">
                        <Logo />
                    </div>

                    {/* Center: Desktop Links */}
                    <nav className="hidden lg:flex items-center gap-1">
                        {links.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 relative group
                                    ${isActive(link.href)
                                        ? "text-white bg-brand-red/10 border border-brand-red/20 shadow-[0_0_15px_rgba(215,35,35,0.2)]"
                                        : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
                                    }`}
                            >
                                <span className={isActive(link.href) ? "text-brand-red" : "text-white/40 group-hover:text-white/60"}>
                                    {link.icon}
                                </span>
                                {link.name}
                                {isActive(link.href) && (
                                    <span className="absolute inset-0 rounded-full bg-brand-red/10 blur-[2px] -z-10 animate-neon-pulse" />
                                )}
                            </Link>
                        ))}
                    </nav>

                    {/* Right: Wallet & Mobile Menu Toggle */}
                  <div className="flex items-center gap-3">
                        {whatsNew && (
                            <button
                                onClick={whatsNew.toggle}
                                aria-label="What's New"
                                aria-expanded={whatsNew.isOpen}
                                className="relative flex items-center justify-center w-10 h-10 rounded-full text-white/60 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 transition-all duration-300"
                            >
                                <Bell className="w-5 h-5" />
                                <WhatsNewBadge className="top-1.5 right-1.5 w-5 h-5" />
                            </button>
                        )}
                        <WalletButton />
                        <div className="lg:hidden">
                            <MobileNav />
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default PrimaryNav;
