import React from "react";

interface PreferencesRowProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle: string;
  rightContent?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function PreferencesRow({
  icon,
  title,
  subtitle,
  rightContent,
  className = "",
  onClick,
}: PreferencesRowProps) {
  return (
    <div
      className={`flex flex-col p-8 bg-[#111111] border border-[#FFFFFF14]${className} ${
        onClick ? "cursor-pointer active:bg-zinc-800 transition-colors" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="text-gray-400">{icon}</div>
        <div className="flex flex-col flex-1">
          <div className="text-sm font-medium text-white">{title}</div>
          <span className="text-xs text-gray-400">{subtitle}</span>
        </div>
      </div>
      {rightContent && <div className="w-full">{rightContent}</div>}
    </div>
  );
}
