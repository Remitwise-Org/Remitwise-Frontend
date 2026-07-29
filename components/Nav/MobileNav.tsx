"use client";

import { useState, useEffect, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
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
import ShortcutTooltip from "@/components/ui/ShortcutTooltip";
import { getPendingTranslationKeys } from "@/lib/i18n/pending-translations";

/** Dev-only: number of English strings with no Spanish translation yet
 * (see docs/i18n-message-extraction.md). Computed once per module load
 * rather than per render -- the locale files only change on a rebuild. */
const PENDING_TRANSLATION_COUNT =
  process.env.NODE_ENV === "development" ? getPendingTranslationKeys().length : 0;

const MobileNav = () => {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const lastFocusedElementRef = useRef<HTMLElement | null>(null);

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

    useEffect(() => {
        if (!isOpen) return;

        lastFocusedElementRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;

        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setIsOpen(false);
            }
        };

        const handleFocusTrap = (event: FocusEvent) => {
            if (!dialogRef.current?.contains(event.target as Node)) {
                event.preventDefault();
                dialogRef.current?.focus();
            }
        };

        document.addEventListener('keydown', handleEsc);
        document.addEventListener('focusin', handleFocusTrap);
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleEsc);
            document.removeEventListener('focusin', handleFocusTrap);
            document.body.style.overflow = '';
            lastFocusedElementRef.current?.focus();
        };
    }, [isOpen]);

    const isActive = (href: string) => {
        if (href === "/" || href === "/dashboard") return pathname === href;
        return pathname.startsWith(href);
    };

    const handleLogout = async () => {
        setIsOpen(false);
        await logout();
    };

    const handleClose = () => {
        setIsOpen(false);
    };

    const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Tab') {
            const focusableElements = dialogRef.current?.querySelectorAll<HTMLElement>(
                'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
            );

            if (!focusableElements || focusableElements.length === 0) {
                event.preventDefault();
                return;
            }

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey && document.activeElement === firstElement) {
                event.preventDefault();
                lastElement.focus();
            } else if (!event.shiftKey && document.activeElement === lastElement) {
                event.preventDefault();
                firstElement.focus();
            }
        }
    };

    return (
        <div className="lg:hidden">
            <ShortcutTooltip label="Open Mobile Menu" shortcut="Esc" side="left">
              <button
                  type="button"
                  onClick={() => setIsOpen(true)}
                  className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                  aria-label="Open Mobile Menu"
                  aria-expanded={isOpen}
                  aria-controls="mobile-navigation-dialog"
                  aria-haspopup="dialog"
              >
                  <Menu className="w-5 h-5 text-white/80" />
              </button>
            </ShortcutTooltip>

            {/* Menu Overlay */}
            {isOpen && (
                <div
                    id="mobile-navigation-dialog"
                    className="fixed inset-0 z-[100] bg-brand-dark overflow-y-auto stars-bg flex flex-col"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Mobile navigation"
                    ref={dialogRef}
                    tabIndex={-1}
                    onKeyDown={handleDialogKeyDown}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <span className="text-xl font-bold text-white tracking-tight">Menu</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="p-2 sm:p-2.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                            aria-label="Close Mobile Menu"
                        >
                            <X className="w-5 h-5 text-white/80" />
                        </button>
                    </div>

                    {/* Links */}
                    <nav aria-label="Mobile navigation links" className="flex-1 p-4 sm:p-6 space-y-8 pb-24">
                        {sections.map((section, idx) => (
                            <div key={idx} className="space-y-4">
                                <h2 className="text-xs font-bold text-white/70 uppercase tracking-[0.2rem] px-2">
                                    {section.title}
                                </h2>
                                <ul className="space-y-1">
                                    {section.links.map((link) => (
                                        <li key={link.name}>
                                            <Link
                                                href={link.href}
                                                aria-current={isActive(link.href) ? "page" : undefined}
                                                onClick={handleClose}
                                                className={`flex items-center justify-between p-4 rounded-2xl transition-all group overflow-hidden relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/50
                                                    ${isActive(link.href)
                                                        ? "bg-brand-red/10 border border-brand-red/20 shadow-[0_0_20px_rgba(215,35,35,0.1)]"
                                                        : "hover:bg-white/5 border border-transparent"
                                                    }`}
                                            >
                                                <div className="flex items-center gap-4 relative z-10">
                                                    <div className={`p-2 rounded-xl transition-colors
                                                        ${isActive(link.href) ? "bg-brand-red text-white" : "bg-white/5 text-white/70 group-hover:text-white/90"}
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
                                                    ${isActive(link.href) ? "text-brand-red" : "text-white/60 group-hover:text-white/80"}
                                                `} />
                                                {isActive(link.href) && (
                                                    <span className="absolute inset-0 bg-brand-red/5 blur-xl -z-10" />
                                                )}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </nav>

                    {/* Footer / Account */}
                    <div className="p-4 sm:p-6 pb-[calc(theme(spacing.4)+env(safe-area-inset-bottom))] sm:pb-[calc(theme(spacing.6)+env(safe-area-inset-bottom))] border-t border-white/5 bg-brand-dark/50 backdrop-blur-xl mt-auto sticky bottom-0">
                        {PENDING_TRANSLATION_COUNT > 0 && (
                            <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-400">
                                {PENDING_TRANSLATION_COUNT} translation{PENDING_TRANSLATION_COUNT === 1 ? "" : "s"} pending for es
                            </div>
                        )}
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
