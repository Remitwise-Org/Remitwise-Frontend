"use client";

import Link from "next/link";
import {
  Zap,
  Send,
  Users,
  Target,
  FileText,
  ArrowRight,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";

interface ActionButtonProps {
  href: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  secondaryIcon?: React.ReactNode;
  variant: "primary" | "secondary";
  priority?: "high" | "normal";
}

function ActionButton({
  href,
  label,
  description,
  icon,
  secondaryIcon,
  variant,
  priority = "normal",
}: ActionButtonProps) {
  const baseClasses =
    "group flex items-center justify-between w-full rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-red focus:ring-offset-2 focus:ring-offset-bg2";
  
  const variantClasses =
    variant === "primary"
      ? priority === "high"
        ? "bg-gradient-to-r from-brand-red to-[#B91C1C] hover:from-brand-redHover hover:to-[#991B1B] shadow-[0_0_25px_rgba(215,35,35,0.4)] px-6 py-5"
        : "bg-brand-red hover:bg-brand-redHover shadow-[0_0_20px_rgba(215,35,35,0.3)] px-6 py-4"
      : "bg-[#1a1a1a] hover:bg-[#252525] border border-[#2a2a2a] hover:border-[#3a3a3a] px-5 py-3.5";

  return (
    <Link href={href} className={`${baseClasses} ${variantClasses}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {secondaryIcon && (
          <span className="text-white opacity-90 flex-shrink-0">{secondaryIcon}</span>
        )}
        <span className="text-white flex-shrink-0">{icon}</span>
        <div className="flex flex-col items-start min-w-0">
          <span className={`text-white ${variant === "primary" && priority === "high" ? "text-lg" : "text-base"}`}>
            {label}
          </span>
          {description && (
            <span className="text-xs text-gray-400 mt-0.5 line-clamp-1">
              {description}
            </span>
          )}
        </div>
      </div>
      <ArrowRight className="w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0 ml-2" />
    </Link>
  );
}

export default function QuickActions() {
  return (
    <div className="bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-4 sm:p-6 border border-border shadow-[0_0_30px_rgba(215,35,35,0.15)] hover:shadow-[0_0_40px_rgba(215,35,35,0.25)] transition-shadow duration-300 text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 sm:mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#D72323] rounded-lg shadow-[0_0_15px_rgba(215,35,35,0.4)]">
            <Zap className="w-5 h-5 text-white" fill="white" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Quick Actions</h2>
            <p className="text-xs text-gray-400 hidden sm:block">Most used features at your fingertips</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 mb-5 sm:mb-6">
        {/* High Priority Primary Action */}
        <div className="relative">
          <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full z-10 hidden sm:block">
            URGENT
          </div>
          <ActionButton
            href="/emergency-transfer"
            label="Emergency Transfer"
            description="Send money urgently with priority processing"
            icon={<Zap className="w-5 h-5" />}
            secondaryIcon={<AlertTriangle className="w-5 h-5" />}
            variant="primary"
            priority="high"
          />
        </div>

        {/* Primary Actions */}
        <ActionButton
          href="/send"
          label="Send Money"
          description="Transfer funds to family and friends"
          icon={<Send className="w-5 h-5" />}
          variant="primary"
        />

        {/* Secondary Actions - Responsive Grid */}
        <div className="pt-2 border-t border-[#2a2a2a]">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Manage & Plan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 sm:gap-3">
            <ActionButton
              href="/family"
              label="Manage Family"
              description="Add or edit family members"
              icon={<Users className="w-5 h-5" />}
              variant="secondary"
            />
            <ActionButton
              href="/goals"
              label="Savings Goals"
              description="Track and achieve your goals"
              icon={<Target className="w-5 h-5" />}
              variant="secondary"
            />
            <ActionButton
              href="/bills"
              label="Pay Bills"
              description="Schedule and pay your bills"
              icon={<FileText className="w-5 h-5" />}
              variant="secondary"
            />
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 pt-4 border-t border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Need help getting started?</span>
        </div>
        <Link
          href="/tutorial"
          className="flex items-center gap-2 text-sm font-semibold text-[#D72323] hover:text-[#B91C1C] transition-colors duration-200 group"
        >
          View Tutorial
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}
