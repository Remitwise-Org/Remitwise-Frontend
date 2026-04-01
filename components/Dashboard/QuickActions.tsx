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
} from "lucide-react";

interface ActionButtonProps {
  href: string;
  label: string;
  icon: React.ReactNode;
  secondaryIcon?: React.ReactNode;
  variant: "primary" | "secondary";
}

function ActionButton({
  href,
  label,
  icon,
  secondaryIcon,
  variant,
}: ActionButtonProps) {
  const baseClasses =
    "flex items-center justify-between w-full px-6 py-4 rounded-lg font-semibold text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg";
  const variantClasses =
    variant === "primary"
      ? "bg-brand-red hover:bg-brand-redHover shadow-[0_0_20px_rgba(215,35,35,0.3)]"
      : "bg-[#1a1a1a] text-foreground hover:bg-[#252525] border border-[#2a2a2a]";

  return (
    <Link href={href} className={`${baseClasses} ${variantClasses}`}>
      <div className="flex items-center gap-3">
        {secondaryIcon && (
          <span className="text-white opacity-90">{secondaryIcon}</span>
        )}
        <span className="text-white">{icon}</span>
        <span className="text-base">{label}</span>
      </div>
      <ArrowRight className="w-5 h-5 text-white opacity-70" />
    </Link>
  );
}

export default function QuickActions() {
  return (
    <div className="bg-gradient-to-br from-bg2 to-bg3 rounded-2xl p-6 border border-border shadow-[0_0_30px_rgba(215,35,35,0.15)] hover:shadow-[0_0_40px_rgba(215,35,35,0.25)] transition-shadow duration-300 text-foreground">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[#D72323] rounded-lg shadow-[0_0_15px_rgba(215,35,35,0.4)]">
          <Zap className="w-5 h-5 text-white" fill="white" />
        </div>
        <h2 className="text-xl font-bold text-white">Quick Actions</h2>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 mb-6">
        {/* Primary Actions */}
        <ActionButton
          href="/emergency-transfer"
          label="Emergency Transfer"
          icon={<Zap className="w-5 h-5" />}
          secondaryIcon={<AlertTriangle className="w-5 h-5" />}
          variant="primary"
        />
        <ActionButton
          href="/send"
          label="Send Money"
          icon={<Send className="w-5 h-5" />}
          variant="primary"
        />

        {/* Secondary Actions */}
        <ActionButton
          href="/family"
          label="Manage Family"
          icon={<Users className="w-5 h-5" />}
          variant="secondary"
        />
        <ActionButton
          href="/goals"
          label="Add Savings Goal"
          icon={<Target className="w-5 h-5" />}
          variant="secondary"
        />
        <ActionButton
          href="/bills"
          label="Pay Bill"
          icon={<FileText className="w-5 h-5" />}
          variant="secondary"
        />
      </div>

      {/* Help Section */}
      <div className="flex items-center justify-between pt-4 border-t border-[#2a2a2a]">
        <span className="text-sm text-gray-400">Need Help?</span>
        <Link
          href="/tutorial"
          className="flex items-center gap-2 text-sm font-semibold text-[#D72323] hover:text-[#B91C1C] transition-colors duration-200"
        >
          View Tutorial
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
