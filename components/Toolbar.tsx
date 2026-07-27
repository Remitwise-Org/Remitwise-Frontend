"use client";

import { LayoutGrid, LayoutList } from "lucide-react";
import { useDensity } from "@/lib/context/DensityContext";
import type { Density } from "@/lib/config/density";

interface ToolbarProps {
  children: React.ReactNode;
  density?: Density;
  className?: string;
}

export default function Toolbar({
  children,
  density: densityProp,
  className = "",
}: ToolbarProps) {
  const { density: contextDensity, setDensity } = useDensity();
  const density = densityProp ?? contextDensity;
  const isCompact = density === "compact";

  return (
    <div
      role="toolbar"
      aria-orientation="horizontal"
      className={`flex flex-wrap items-center ${
        isCompact ? "gap-space-xs p-space-xs" : "gap-space-sm p-space-sm"
      } rounded-xl bg-white/5 border border-white/10 ${className}`}
    >
      {children}
      <button
        type="button"
        onClick={() => setDensity(isCompact ? "comfortable" : "compact")}
        aria-label={isCompact ? "Switch to comfortable view" : "Switch to compact view"}
        aria-pressed={isCompact}
        className="ml-auto flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red flex-shrink-0"
      >
        {isCompact ? (
          <LayoutList className="w-4 h-4" aria-hidden="true" />
        ) : (
          <LayoutGrid className="w-4 h-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
