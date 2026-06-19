"use strict";

import React from "react";

interface ToggleProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  variant?: "default" | "notification";
  id?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  disabled?: boolean;
}

export default function Toggle({
  enabled,
  onChange,
  variant = "default",
  id,
  ariaLabel,
  ariaLabelledBy,
  disabled = false,
}: ToggleProps) {
  const isNotification = variant === "notification";

  if (isNotification) {
    return (
      <button
        id={id}
        type="button"
        onClick={() => onChange(!enabled)}
        className="flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
        role="switch"
        aria-checked={enabled}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        disabled={disabled}
      >
        <div
          className={`relative w-[44px] h-[24px] rounded-full transition-colors duration-200 ease-in-out ${
            enabled ? "bg-[#DC2626]" : "bg-zinc-700"
          }`}
        >
          <div
            className={`absolute top-0.5 left-0.5 w-[20px] h-[20px] bg-[#FFFFFF] rounded-full shadow-md transition-transform duration-200 ease-in-out ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </div>
      </button>
    );
  }

  return (
    <button
      id={id}
      type="button"
      onClick={() => onChange(!enabled)}
      className={`${
        enabled ? "bg-red-500" : "bg-gray-700"
      } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-60`}
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      disabled={disabled}
    >
      <span
        className={`${
          enabled ? "translate-x-6" : "translate-x-1"
        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
      />
    </button>
  );
}
