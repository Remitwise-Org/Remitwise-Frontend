"use strict";

import React from "react";

interface SettingsSectionProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export default function SettingsSection({
  title,
  subtitle,
  icon,
  children,
}: SettingsSectionProps) {
  return (
    <div className="mb-8">
      {/* Section Header */}
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
      
      {/* Section Card */}
      <div className="bg-[#0f0f0f] border border-gray-800/30 rounded-xl overflow-hidden divide-y divide-gray-800/30">
        {children}
      </div>
    </div>
  );
}
