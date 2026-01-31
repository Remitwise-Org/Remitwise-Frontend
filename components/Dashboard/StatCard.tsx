import { TrendingUp } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  percentage: string;
  icon: React.ReactNode;
  trend?: "up" | "none";
}

export default function StatCard({
  title,
  value,
  percentage,
  icon,
  trend = "up",
}: StatCardProps) {
  const isNeutral = trend === "none" || percentage === "0%";

  return (
    <div
      className="rounded-[24px] p-6 border border-[#FFFFFF14] hover:border-white/30 transition-colors duration-300"
      style={{ backgroundImage: "var(--card)" }}
    >
      <div className="flex items-center justify-between mb-8">
        {/* Icon Container */}
        <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#2D0A0A] text-[#DC2626]">
          {icon}
        </div>

        {/* Percentage Pill */}
        <div
          className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold ${isNeutral ? "bg-[#1A1A1A] text-gray-500" : "bg-[#2D0A0A] text-[#DC2626]"
            }`}
        >
          {!isNeutral && <TrendingUp className="w-3.5 h-3.5" />}
          <span>{percentage}</span>
        </div>
      </div>

      <div className="space-y-1">
        <div className="text-gray-400 text-sm font-medium">{title}</div>
        <div className="text-[32px] font-bold text-white tracking-tight">
          {value}
        </div>
      </div>
    </div>
  );
}
