"use strict";

import React from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import Toggle from "./Toggle";

interface SettingsItemProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  value?: string;
  type?: "toggle" | "navigation" | "text" | "dropdown";
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  onClick?: () => void;
  rightIcon?: React.ReactNode;
  comingSoon?: boolean;
  hasDropdownBar?: boolean;
  hasIconBackground?: boolean;
}

export default function SettingsItem({
  icon,
  title,
  description,
  value,
  type = "navigation",
  enabled = false,
  onToggle,
  onClick,
  rightIcon,
  comingSoon = false,
  hasDropdownBar = false,
  hasIconBackground = false,
}: SettingsItemProps) {
  return (
    <div className="bg-[#0f0f0f]">
      <div
        className={`flex items-center justify-between p-4 hover:bg-gray-800/20 transition-colors ${
          type !== "toggle" && type !== "text" ? "cursor-pointer" : ""
        } group`}
        onClick={type !== "toggle" && type !== "text" ? onClick : undefined}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {icon && (
            <div className={`flex-shrink-0 ${
              hasIconBackground 
                ? "w-9 h-9 rounded-lg bg-[#161616] border border-gray-700/20 flex items-center justify-center text-gray-400"
                : "text-gray-400"
            }`}>
              {icon}
            </div>
          )}
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-medium text-white">{title}</span>
            {description && (
              <span className="text-xs text-gray-500">{description}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          {comingSoon && (
            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs font-bold text-red-500 bg-red-500/10 rounded border border-red-500/20 uppercase tracking-wide">
              Coming Soon
            </span>
          )}
          {type === "toggle" && onToggle && (
            <Toggle enabled={enabled} onChange={onToggle} />
          )}
          {type === "text" && value && (
            <span className="text-sm text-gray-500">{value}</span>
          )}
          {type === "navigation" && rightIcon && (
            <div className="text-gray-500">
              {rightIcon}
            </div>
          )}
          {type === "navigation" && !rightIcon && (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </div>
      
      {/* Dropdown bar for dropdown type items */}
      {hasDropdownBar && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 bg-[#161616] rounded-lg px-3 py-2.5 border border-gray-700/20">
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      )}
    </div>
  );
}
