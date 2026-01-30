"use strict";

import React from "react";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
  /** Visual variants for different screens; default keeps the existing light list style. */
  variant?: "default" | "dark-card";
}

export default function SettingsSection({
  title,
  children,
  variant = "default",
}: SettingsSectionProps) {
  const isDarkCard = variant === "dark-card";

  return (
    <div className={isDarkCard ? "mb-6" : "mb-8" }>
      <h2
        className={
          isDarkCard
            ? "mb-2 text-sm font-semibold text-white"
            : "px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
        }
      >
        {title}
      </h2>

      <div
        className={
          isDarkCard
            ? "bg-[#010101] rounded-2xl overflow-hidden"
            : "bg-white border-t border-b border-gray-200 divide-y divide-gray-200"
        }
      >
        {children}
      </div>
    </div>
  );
}
