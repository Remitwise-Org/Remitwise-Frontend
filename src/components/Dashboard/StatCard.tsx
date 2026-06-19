import { TrendingUp } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  // For trend-based cards (Total Sent, Savings)
  detail1?: string;
  detail1Color?: string;
  detail2?: string;
  showTrend?: boolean;
  // Legacy props for backward compatibility
  percentage?: string;
  trend?: "up" | "none";
}

export default function StatCard({
  title,
  value,
  icon,
  detail1,
  detail1Color = "text-red-500",
  detail2,
  showTrend = false,
  percentage,
  trend = "up",
}: StatCardProps) {
  const isTrendCard = showTrend && detail1 && detail2;
  const isNeutral = trend === "none" || percentage === "0%";

  return (
    <div
      className="rounded-[24px] p-6 border border-[#FFFFFF14] hover:border-white/30 transition-colors duration-300"
      style={{ backgroundImage: "var(--card)" }}
    >
      <div className="flex items-start justify-between mb-8">
        {/* Icon Container */}
        <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#2D0A0A] text-[#DC2626]">
          {icon}
        </div>

        {/* Top-Right Detail: Red trend icon */}
        {isTrendCard ? (
          <TrendingUp className="w-4 h-4 text-[#DC2626]" />
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="text-gray-400 text-sm font-medium">{title}</div>
        
        <div className="text-[32px] font-bold text-white tracking-tight">
          {value}
        </div>

        {/* Detail: Change amount and percentage on same line, or contextual info */}
        {isTrendCard ? (
          <div className="flex items-center justify-between pt-2">
            <span className={`text-sm font-semibold ${detail1Color}`}>
              {detail1}
            </span>
            <span className="text-sm font-semibold text-gray-400">{detail2}</span>
          </div>
        ) : detail1 && detail2 ? (
          <div className="flex items-center justify-between pt-2">
            <div className="text-gray-300 text-sm font-medium">{detail1}</div>
            <div className="text-gray-500 text-xs">{detail2}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
