"use client";

import { useState, useEffect, useRef } from "react";
import { User, Bell, Shield, Wallet, Users, Globe } from "lucide-react";
import { useClientTranslator } from "@/lib/i18n/client";
import { ProfileSection } from "@/components/settings/ProfileSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";
import { SecuritySection } from "@/components/settings/SecuritySection";
import { WalletSection } from "@/components/settings/WalletSection";
import { FamilySection } from "@/components/settings/FamilySection";
import { PreferencesSection } from "@/components/settings/PreferencesSection";
import PageHeadingLink from "@/components/PageHeadingLink";

const SECTIONS = [
  { id: "profile",        labelKey: "settings.sections.profile",         icon: User    },
  { id: "notifications",  labelKey: "settings.sections.notifications",   icon: Bell    },
  { id: "security",       labelKey: "settings.sections.security",        icon: Shield  },
  { id: "wallet",         labelKey: "settings.sections.wallet",          icon: Wallet  },
  { id: "family",         labelKey: "settings.sections.family",          icon: Users   },
  { id: "preferences",    labelKey: "settings.sections.preferences",     icon: Globe   },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { t } = useClientTranslator();
  const [active, setActive] = useState<SectionId>("profile");
  const observerRef = useRef<IntersectionObserver | null>(null);

  // ── Scroll-spy: update active nav item based on visible section ────────────
  useEffect(() => {
    const ids = SECTIONS.map((s) => s.id);
    const visible = new Map<string, number>();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          visible.set(e.target.id, e.intersectionRatio);
        });
        const best = [...visible.entries()].sort((a, b) => b[1] - a[1])[0];
        if (best && best[1] > 0) setActive(best[0] as SectionId);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 0.75, 1] },
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, []);

  // ── Scroll to section on nav click ────────────────────────────────────────
  const scrollTo = (id: SectionId) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    // Also update immediately for responsiveness
    setActive(id);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ── Sticky top bar (mobile breadcrumb / desktop title) ── */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 overflow-hidden px-4 sm:px-6">
          <h1 className="shrink-0 text-base font-semibold text-gray-900 dark:text-white">
            {t("settings.page_title")}
          </PageHeadingLink>
          {/* Mobile: horizontal scrollable nav pills */}
          <nav
            className="ml-auto flex min-w-0 flex-1 gap-1 overflow-x-auto sm:hidden scrollbar-none"
            aria-label={t("settings.nav_aria_label")}
          >
            {SECTIONS.map(({ id, labelKey, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                aria-current={active === id ? "location" : undefined}
                aria-label={t(labelKey)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                  active === id
                    ? "bg-indigo-600 text-white"
                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                <Icon size={13} strokeWidth={2} />
                {t(labelKey)}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 lg:grid lg:grid-cols-[220px_1fr] lg:gap-10 lg:items-start">
        {/* ── Desktop sidebar nav ── */}
        <aside className="hidden lg:block sticky top-20 self-start">
          <nav aria-label={t("settings.nav_aria_label")}>
            <ul className="space-y-0.5">
              {SECTIONS.map(({ id, labelKey, icon: Icon }) => (
                <li key={id}>
                  <button
                    onClick={() => scrollTo(id)}
                    aria-current={active === id ? "location" : undefined}
                    aria-label={t(labelKey)}
                    className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 text-left ${
                      active === id
                        ? "bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                    }`}
                  >
                    <Icon
                      size={16}
                      strokeWidth={active === id ? 2 : 1.8}
                      className={
                        active === id
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-gray-400 dark:text-gray-500"
                      }
                    />
                    {t(labelKey)}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* ── Main content stack ── */}
        <main className="space-y-6" aria-label={t("settings.content_aria_label")}>
          <ProfileSection />
          <NotificationsSection />
          <SecuritySection />
          <WalletSection />
          <FamilySection />
          <PreferencesSection />
        </main>
      </div>
    </div>
  );
}
