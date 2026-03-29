"use client";

import React, { useEffect, useState } from "react";

type SettingsNavItem = {
  id: string;
  title: string;
  description: string;
};

interface SettingsNavigationProps {
  items: SettingsNavItem[];
}

export default function SettingsNavigation({ items }: SettingsNavigationProps) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-40% 0px -55% 0px",
        threshold: 0.1,
      }
    );

    items.forEach((item) => {
      const section = document.getElementById(item.id);
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="Settings navigation" className="space-y-6">
      <div className="hidden xl:block rounded-[28px] border border-gray-800/70 bg-[#0f0f0f]/90 p-5 xl:sticky xl:top-24">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">
          Jump to
        </p>

        <div className="mt-4 space-y-2">
          {items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`block rounded-2xl border px-4 py-3 text-sm transition-colors ${
                  isActive
                    ? "border-red-500/40 bg-red-500/10 text-white"
                    : "border-transparent text-gray-300 hover:border-white/10 hover:bg-white/5"
                }`}
              >
                <div className="font-medium">{item.title}</div>
                <div className="text-xs text-gray-500">{item.description}</div>
              </a>
            );
          })}
        </div>
      </div>

      <div className="rounded-[28px] border border-gray-800/70 bg-[#0f0f0f]/90 p-5 xl:hidden">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">
          Sections
        </p>
        <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2">
          {items.map((item) => {
            const isActive = item.id === activeId;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`shrink-0 rounded-2xl border px-4 py-3 text-sm transition-colors ${
                  isActive
                    ? "border-red-500/40 bg-red-500/10 text-white"
                    : "border-white/10 text-gray-300 hover:border-white/20 hover:bg-white/5"
                }`}
              >
                {item.title}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
