"use client";

import React from "react";
import { BarChart3 } from "lucide-react";
import Header from "@/components/Header";
import { useSeo } from "@/lib/hooks/useSeo";
import { CategoryDonutChart } from "@/components/Insights/categoryDonutChart";
import { RemittanceTrendChart } from "@/components/Insights/remittanceTrendChart";
import { SpendingVsSavingsChart } from "@/components/Insights/spendingVsSavingChart";
import WidgetErrorState from "@/components/ui/WidgetErrorState";
import { useInsightsData } from "@/lib/client/useInsightsData";

/** Skeleton placeholder shown while /api/insights is loading. */
function ChartSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading chart data"
      className="w-full animate-pulse rounded-3xl bg-white/5 border border-white/10 h-64"
    />
  );
}

export default function InsightsPage() {
  useSeo({
    title: "Insights | RemitWise",
    description:
      "Explore your top spending categories and financial insights on RemitWise.",
  });

  const { data, status, error, refetch } = useInsightsData("current_month");

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-grow pt-32 pb-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Page heading */}
          <div className="flex items-center gap-3">
            <div className="bg-red-500/10 p-2 rounded-lg">
              <BarChart3 className="w-5 h-5 text-red-500" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold">Insights</h1>
              <p className="text-gray-500 text-sm">
                Your financial activity at a glance
              </p>
            </div>
          </div>

          {/* Error banner — shown when all charts fail */}
          {status === "error" && (
            <WidgetErrorState
              message={error ?? "Unable to load insights data."}
              onRetry={refetch}
            />
          )}

          {/* Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category donut */}
            {status === "loading" ? (
              <ChartSkeleton />
            ) : (
              <CategoryDonutChart
                data={
                  status === "success" && data && data.categories.length > 0
                    ? data.categories
                    : undefined
                }
              />
            )}

            {/* Remittance trend */}
            {status === "loading" ? (
              <ChartSkeleton />
            ) : (
              <RemittanceTrendChart
                data={
                  status === "success" && data && data.trend.length > 0
                    ? data.trend
                    : undefined
                }
              />
            )}
          </div>

          {/* Spending vs savings — full width */}
          {status === "loading" ? (
            <ChartSkeleton />
          ) : (
            <SpendingVsSavingsChart
              data={
                status === "success" &&
                data &&
                data.spendingVsSavings.length > 0
                  ? data.spendingVsSavings
                  : undefined
              }
            />
          )}
        </div>
      </main>

      <footer className="w-full" />
    </div>
  );
}
