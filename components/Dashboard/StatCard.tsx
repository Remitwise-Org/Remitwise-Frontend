import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export type TrendDirection = "up" | "down" | "none";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  /** Primary change/highlight text, e.g. "+$240" or "+18%". */
  detail1?: string;
  detail1Color?: string;
  /** Secondary contextual text, e.g. "12 transfers". */
  detail2?: string;
  /**
   * Whether to render the trend indicator (icon + primary text).
   * Defaults to `true` whenever a trend value is present.
   */
  showTrend?: boolean;
  /** Trend direction. Drives the icon + accessible label — never color alone. */
  trend?: TrendDirection;
  /** @deprecated Legacy alias for {@link detail1}. Kept for backward compatibility. */
  percentage?: string;
}

const TREND_META: Record<
  TrendDirection,
  { Icon: typeof TrendingUp; label: string }
> = {
  up: { Icon: TrendingUp, label: "Trending up" },
  down: { Icon: TrendingDown, label: "Trending down" },
  none: { Icon: Minus, label: "No change" },
};

export default function StatCard({
  title,
  value,
  icon,
  detail1,
  detail1Color = "text-[#DC2626]",
  detail2,
  showTrend,
  trend,
  percentage,
}: StatCardProps) {
  // ── Reconcile the dual prop API into one consistent shape ────────────────
  // `detail1` is canonical; `percentage` is the legacy alias.
  const trendText = detail1 ?? percentage;
  const hasTrendText = typeof trendText === "string" && trendText.length > 0;

  const isNeutral = trend === "none" || trendText === "0%";
  const direction: TrendDirection = isNeutral ? "none" : trend ?? "up";

  // Show the trend indicator when explicitly requested, or by default whenever
  // a trend value exists. A card with only `detail2` is not a trend card.
  const showTrendIndicator = (showTrend ?? hasTrendText) && hasTrendText;
  const hasDetailRow = showTrendIndicator || Boolean(detail2);

  const { Icon: TrendIcon, label: trendLabel } = TREND_META[direction];

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

        {/* Top-right trend indicator — directional icon conveys trend without color */}
        {showTrendIndicator ? (
          <TrendIcon
            className={`w-4 h-4 ${detail1Color}`}
            role="img"
            aria-label={trendLabel}
          />
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="text-gray-400 text-sm font-medium">{title}</div>

        {/* tabular-nums keeps numeric columns aligned across cards */}
        <div className="text-[32px] font-bold text-white tracking-tight tabular-nums">
          {value}
        </div>

        {hasDetailRow ? (
          <div className="flex items-center justify-between pt-2">
            {showTrendIndicator ? (
              <span className={`text-sm font-semibold ${detail1Color}`}>
                {/* Visible label restates the direction so it is not color-only */}
                <span className="sr-only">{trendLabel}: </span>
                {trendText}
              </span>
            ) : (
              <span aria-hidden="true" />
            )}
            {detail2 ? (
              <span className="text-sm font-semibold text-gray-400 tabular-nums">
                {detail2}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
