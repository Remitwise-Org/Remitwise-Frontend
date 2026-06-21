"use client";

import { useState } from "react";
import { useClientTranslator, useClientLocale } from "@/lib/i18n/client";
import { Globe } from "lucide-react";

type SupportedLocale = "en" | "es";

export default function LocaleSwitcher() {
  const { t } = useClientTranslator();
  const locale = useClientLocale();
  const [isOpen, setIsOpen] = useState(false);

  const locales: { code: SupportedLocale; name: string; flag: string }[] = [
    { code: "en", name: t("localeSwitcher.english"), flag: "🇺🇸" },
    { code: "es", name: t("localeSwitcher.spanish"), flag: "🇪🇸" },
  ];

  const currentLocale = locales.find((l) => l.code === locale) || locales[0];

  const handleLocaleChange = (newLocale: SupportedLocale) => {
    localStorage.setItem("locale", newLocale);
    window.location.reload();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.04] transition-colors"
        aria-label={t("localeSwitcher.label")}
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">{currentLocale.flag}</span>
        <span className="hidden md:inline">{currentLocale.code.toUpperCase()}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full z-20 mt-2 w-48 rounded-xl border border-white/10 bg-[#1a1a1a] shadow-xl">
            <div className="p-2">
              {locales.map((loc) => (
                <button
                  key={loc.code}
                  onClick={() => {
                    handleLocaleChange(loc.code);
                    setIsOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-300 hover:bg-white/[0.04] transition-colors"
                >
                  <span className="text-lg">{loc.flag}</span>
                  <span>{loc.name}</span>
                  {loc.code === locale && (
                    <span className="ml-auto text-red-400">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
