"use strict";

import React from "react";

interface SettingsSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** Visual variants for different screens; default keeps the existing light list style. */
  variant?: "default" | "dark-card";
}

export default function SettingsSection({
  title,
  subtitle,
  icon,
  children,
  variant = "default",
}: SettingsSectionProps) {
  const isDarkCard = variant === "dark-card";

  return (
    <div className={isDarkCard ? "mb-6" : "mb-8"}>
      {/* Section Header */}
      {(icon || subtitle) ? (
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl border-2 border-red-500/50 bg-red-500/10 flex items-center justify-center flex-shrink-0">
            {icon && (
              <div className="text-red-500">{icon}</div>
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-gray-500">{subtitle}</p>
            )}
          </div>
        </div>
      ) : (
        <h2
          className={
            isDarkCard
              ? "mb-2 text-sm font-semibold text-white"
              : "px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider"
          }
        >
          {title}
        </h2>
      )}

      <div
        className={
          isDarkCard
            ? "bg-[#010101] rounded-2xl overflow-hidden"
            : "bg-[#0f0f0f] border border-gray-800/30 rounded-xl overflow-hidden divide-y divide-gray-800/30"
        }
      >
        {children}
      </div>
    </div>
  );
}
