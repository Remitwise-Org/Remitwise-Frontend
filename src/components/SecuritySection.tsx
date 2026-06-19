import React from "react";

interface SecuritySectionProps {
  icon: React.ReactNode;
  title: React.ReactNode;
  description: string;
  rightContent?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function SecuritySection({
  icon,
  title,
  description,
  rightContent,
  className = "",
  onClick,
}: SecuritySectionProps) {
  return (
    <div
      className={`flex flex-col py-8 px-4 bg-zinc-800/50 border border-[#FFFFFF14]${className} ${
        onClick ? "cursor-pointer active:bg-zinc-800 transition-colors" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-center gap-4 mb-3">
        <div className="text-gray-400">{icon}</div>
        <div className="flex flex-col flex-1">
          <div className="text-sm font-medium text-white">{title}</div>
          <span className="text-xs text-gray-400">{description}</span>
        </div>
      </div>
      {rightContent && <div className="w-full">{rightContent}</div>}
    </div>
  );
}