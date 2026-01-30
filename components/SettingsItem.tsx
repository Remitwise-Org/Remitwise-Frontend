"use strict";

import React from "react";
import { ChevronRight } from "lucide-react";
import Toggle from "./Toggle";

interface SettingsItemProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  value?: string;
  type?: "toggle" | "navigation" | "text";
  enabled?: boolean;
  onToggle?: (enabled: boolean) => void;
  onClick?: () => void;
  /** Styling variants; default preserves existing look. */
  variant?: "default" | "notification-row";
  /** When using notification-row, set true to draw a divider under the row. */
  divider?: boolean;
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
  variant = "default",
  divider = false,
}: SettingsItemProps) {
  const isNotificationRow = variant === "notification-row";

  if (isNotificationRow) {
    return (
      <div
        className={`flex items-center justify-between border border-[#FFFFFF14] h-[77px] p-3 sm:p-4 transition-colors hover:bg-zinc-800/50 ${
          divider ? "border-b border-zinc-800" : ""
        } ${type !== "toggle" && onClick ? "cursor-pointer" : ""}`}
        onClick={type !== "toggle" ? onClick : undefined}
      >
        {/* Left side: Icon + Text */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {icon && <div className="text-[#FFFFFF99] flex-shrink-0">{icon}</div>}
          <div className="flex-1 min-w-0">
            <h3 className="text-[#FFFFFF] font-semibold text-[14px] truncate">
              {title}
            </h3>
            {description && (
              <p className="text-[#FFFFFF80] text-[12px] font-normal truncate">{description}</p>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
          {type === "toggle" && onToggle && (
            <Toggle enabled={enabled} onChange={onToggle} variant="notification" />
          )}
          {type === "text" && value && (
            <span className="text-sm text-gray-300 font-mono">{value}</span>
          )}
          {type === "navigation" && (
            <ChevronRight className="w-5 h-5 text-zinc-500" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors cursor-pointer ${
        onClick ? "active:bg-gray-100" : ""
      }`}
      onClick={type !== "toggle" ? onClick : undefined}
    >
      <div className="flex items-center space-x-4">
        {icon && <div className="text-gray-500">{icon}</div>}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-900">{title}</span>
          {description && (
            <span className="text-xs text-gray-500">{description}</span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {type === "toggle" && onToggle && (
          <Toggle enabled={enabled} onChange={onToggle} />
        )}
        {type === "text" && value && (
          <span className="text-sm text-gray-600 font-mono">{value}</span>
        )}
        {type === "navigation" && (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </div>
    </div>
  );
}
