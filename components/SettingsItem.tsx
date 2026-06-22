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
  comingSoonLabel?: string;
  hasDropdownBar?: boolean;
  hasIconBackground?: boolean;
  /** Styling variants; default preserves existing look. */
  variant?: "default" | "notification-row" | "security-row";
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
  rightIcon,
  comingSoon = false,
  comingSoonLabel = "Coming Soon",
  hasDropdownBar = false,
  hasIconBackground = false,
  variant = "default",
  divider = false,
}: SettingsItemProps) {
  const isNotificationRow = variant === "notification-row";
  const isDisabled = comingSoon;
  const dropdownRegionId = React.useId();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(hasDropdownBar);

  React.useEffect(() => {
    setIsDropdownOpen(hasDropdownBar);
  }, [hasDropdownBar]);

  const handleActivate = () => {
    if (isDisabled) {
      return;
    }

    if (type === "dropdown") {
      setIsDropdownOpen((current) => !current);
    }

    onClick?.();
  };

  const sharedDisabledProps = isDisabled
    ? ({
        "aria-disabled": true,
        tabIndex: -1,
      } as const)
    : {};

  if (isNotificationRow) {
    return (
      <div
        className={`flex items-center justify-between border border-[#FFFFFF14] h-[77px] p-3 sm:p-4 transition-colors bg-zinc-800/50 ${
          divider ? "border-b border-zinc-800" : ""
        } ${type !== "toggle" && onClick && !isDisabled ? "cursor-pointer" : ""}`}
        onClick={type !== "toggle" && !isDisabled ? onClick : undefined}
        {...sharedDisabledProps}
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
    <div className="bg-[#0f0f0f]">
      {type !== "toggle" && type !== "text" ? (
      <button
        type="button"
        className={`flex items-center justify-between p-4 hover:bg-gray-800/20 transition-colors ${
          isDisabled ? "cursor-default" : "cursor-pointer"
        } group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f0f] disabled:hover:bg-transparent`}
        onClick={handleActivate}
        disabled={isDisabled}
        tabIndex={isDisabled ? -1 : undefined}
        aria-disabled={isDisabled || undefined}
        aria-expanded={type === "dropdown" ? isDropdownOpen : undefined}
        aria-controls={type === "dropdown" ? dropdownRegionId : undefined}
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
              {comingSoonLabel}
            </span>
          )}
          {type === "navigation" && rightIcon && (
            <div className="text-gray-500">
              {rightIcon}
            </div>
          )}
          {type === "navigation" && !rightIcon && (
            <ChevronRight className="w-5 h-5 text-gray-500" />
          )}
          {type === "dropdown" && (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </div>
      </button>
      ) : (
      <div
        className="flex items-center justify-between p-4 transition-colors group"
        {...sharedDisabledProps}
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
              {comingSoonLabel}
            </span>
          )}
          {type === "toggle" && onToggle && (
            <Toggle enabled={enabled} onChange={onToggle} />
          )}
          {type === "text" && value && (
            <span className="text-sm text-gray-500">{value}</span>
          )}
        </div>
      </div>
      )}
      
      {/* Dropdown bar for dropdown type items */}
      {type === "dropdown" && (
        <div
          className="px-4 pb-4"
          id={dropdownRegionId}
          hidden={!isDropdownOpen}
        >
          <div className="flex items-center gap-2 bg-[#161616] rounded-lg px-3 py-2.5 border border-gray-700/20">
            <ChevronDown className="w-4 h-4 text-gray-500" />
          </div>
        </div>
      )}
    </div>
  );
}
