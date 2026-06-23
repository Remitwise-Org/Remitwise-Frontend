"use client";

import { useCallback, useId, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Clock, PieChart as PieChartIcon } from "lucide-react";
import WidgetEmptyState from "@/components/ui/WidgetEmptyState";
import WidgetErrorState from "@/components/ui/WidgetErrorState";
import { useClientTranslator } from "@/lib/i18n/client";
import { buildChartImageLabel, buildChartSummary } from "@/lib/a11y/chart";

const data = [
  {
    name: "Remittances",
    value: 58,
    amount: "$3,240",
    displayPercent: "57.5%",
    color: "#dc2626",
  },
  {
    name: "Savings",
    value: 28,
    amount: "$1,580",
    displayPercent: "28.1%",
    color: "#b91c1c",
  },
  {
    name: "Bills",
    value: 12,
    amount: "$685",
    displayPercent: "12.2%",
    color: "#991b1b",
  },
  {
    name: "Insurance",
    value: 2,
    amount: "$125",
    displayPercent: "2.2%",
    color: "#7f1d1d",
  },
];

const RADIAN = Math.PI / 180;

const renderLabel = ({
  cx,
  cy,
  midAngle,
  outerRadius,
  index,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  index?: number;
}) => {
  if (
    cx === undefined ||
    cy === undefined ||
    midAngle === undefined ||
    outerRadius === undefined ||
    index === undefined
  ) {
    return null;
  }

  const radius = outerRadius + 18;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const item = data[index];

  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fill={item.color}
      fontSize={12}
      fontWeight={500}
      className="hidden sm:block"
    >
      {item.name} {item.value}%
    </text>
  );
};

interface MoneyDistributionWidgetProps {
  /** Pass an empty array to show the empty state */
  distributionData?: typeof data;
  /** Pass true to show the error state */
  hasError?: boolean;
}

export default function MoneyDistributionWidget({
  distributionData = data,
  hasError = false,
}: MoneyDistributionWidgetProps) {
  const [retryKey, setRetryKey] = useState(0);
  const summaryId = useId();
  const { t } = useClientTranslator();

  const labelItems = useMemo(
    () => distributionData.map((item) => `${item.name} ${item.displayPercent ?? `${item.value}%`}`),
    [distributionData],
  );

  const summaryItems = useMemo(
    () => distributionData.map((item) => `${item.name}: ${item.amount} (${item.displayPercent ?? `${item.value}%`})`),
    [distributionData],
  );

  const ariaLabel = buildChartImageLabel("Money distribution", labelItems, t);
  const summaryText = buildChartSummary(summaryItems, t);
  const handleRetry = useCallback(() => setRetryKey((k) => k + 1), []);

  const isEmpty = !hasError && distributionData.length === 0;
  const total = useMemo(
    () =>
      distributionData.reduce(
        (sum, d) => sum + parseFloat(d.amount.replace(/[^0-9.]/g, "")),
        0,
      ),
    [distributionData],
  );

  return (
    <section
      key={retryKey}
      className="rounded-3xl border border-white/10 bg-gradient-to-b from-[#0f0f0f] via-[#0b0b0b] to-[#090909] p-8 text-white shadow-[0_30px_60px_rgba(0,0,0,0.45)] lg:w-[50%] w-full"
    >
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="order-1 sm:order-1">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#dc2626]/30 bg-[#dc2626]/10 text-[#dc2626]">
              <Clock className="h-5 w-5" aria-hidden="true" />
            </span>
            <h2 className="text-2xl font-semibold">Money Distribution</h2>
          </div>
          <p className="mt-2 text-sm text-white/50">Where your money goes</p>
        </div>
        {!isEmpty && !hasError && (
          <div className="order-2 w-full sm:order-2 sm:w-auto sm:text-right">
            <p className="text-sm text-white/50">Total</p>
            <p className="text-3xl font-semibold text-[#dc2626]">
              ${total.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {hasError ? (
        <WidgetErrorState
          message="We couldn't load your distribution data. Please try again."
          onRetry={handleRetry}
        />
      ) : isEmpty ? (
        <WidgetEmptyState
          icon={PieChartIcon}
          title="No distribution data yet"
          description="Set up your money split to see how your funds are allocated."
          ctaLabel="Set up your split"
          ctaHref="/split"
        />
      ) : (
        <div className="mt-8 flex flex-col gap-10 items-start">
          <div
            className="h-[280px] w-full"
            role="img"
            aria-label={ariaLabel}
            aria-describedby={summaryId}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart aria-hidden="true">
                <Pie
                  data={distributionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={0}
                  startAngle={90}
                  endAngle={-270}
                  labelLine={false}
                  label={renderLabel}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth={1}
                >
                  {distributionData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <p id={summaryId} className="sr-only">
            {summaryText}
          </p>

          <div className="w-[90%] sm:w-full">
            <div className="grid w-full grid-cols-2 gap-x-10 gap-y-4 text-left">
              {distributionData.map((item) => (
                <div key={item.name} className="flex items-start gap-3">
                  <span
                    className="mt-2 h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <div>
                    <p className="text-xs text-white/60 font-normal">
                      {item.name}
                    </p>
                    <p className="text-sm font-bold text-white">{item.amount}</p>
                    <p className="text-xs text-white/40 font-normal">
                      {item.displayPercent}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
