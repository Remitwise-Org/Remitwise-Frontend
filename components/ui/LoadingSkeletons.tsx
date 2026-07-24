import type { ReactNode } from "react";

import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";

function SectionShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-black/40 p-5 sm:p-6 backdrop-blur-sm ${className}`}
    >
      {children}
    </div>
  );
}

function HeaderSkeleton({
  eyebrow = false,
  titleWidth = "w-40",
  subtitleWidth = "w-56",
}: {
  eyebrow?: boolean;
  titleWidth?: string;
  subtitleWidth?: string;
}) {
  return (
    <div className="mb-6 flex items-start justify-between gap-4">
      <div className="space-y-2">
        {eyebrow ? <Skeleton className="h-3 w-24 rounded-full" /> : null}
        <Skeleton className={`${titleWidth} h-6 rounded`} />
        <Skeleton className={`${subtitleWidth} h-4 rounded`} />
      </div>
      <Skeleton className="h-8 w-16 rounded-full" />
    </div>
  );
}

function StatGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} variant="stat" />
      ))}
    </div>
  );
}

function ListRowSkeleton({ dense = false }: { dense?: boolean }) {
  return (
    <div className={`space-y-3 rounded-2xl border border-white/5 bg-white/[0.03] ${dense ? "p-4" : "p-5"}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-2/3 rounded" />
          <Skeleton className="h-4 w-1/3 rounded" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-24 rounded" />
        <Skeleton className="h-4 w-16 rounded" />
      </div>
    </div>
  );
}

function SummaryKpiSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="relative rounded-2xl border border-white/5 bg-[linear-gradient(180deg,rgba(16,16,16,0.98),rgba(10,10,10,0.98))] p-5 sm:p-6"
        >
          <div className="mb-4 flex items-start justify-between">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-9 w-20 rounded" />
            <Skeleton className="h-4 w-28 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardLoadingSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <StatGridSkeleton />

        <SectionShell>
          <HeaderSkeleton titleWidth="w-36" subtitleWidth="w-48" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-24 rounded-xl" />
            ))}
          </div>
        </SectionShell>

        <SectionShell>
          <HeaderSkeleton titleWidth="w-48" subtitleWidth="w-40" />
          <Skeleton className="h-64 rounded-3xl" />
        </SectionShell>

        <SectionShell>
          <HeaderSkeleton titleWidth="w-44" subtitleWidth="w-36" />
          <div className="hidden gap-4 md:grid">
            <div className="grid grid-cols-5 gap-4 border-b border-white/5 pb-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton
                  key={index}
                  className={`${index === 1 ? "w-2/3" : "w-full"} h-4 rounded`}
                />
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="grid grid-cols-5 gap-4 border-b border-white/5 py-4 last:border-0"
              >
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
          <div className="grid gap-4 md:hidden">
            {Array.from({ length: 4 }).map((_, index) => (
              <ListRowSkeleton key={index} />
            ))}
          </div>
        </SectionShell>

        <div className="grid gap-6 lg:grid-cols-2">
          <SectionShell>
            <HeaderSkeleton titleWidth="w-40" subtitleWidth="w-32" />
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Skeleton className="h-4 w-32 rounded" />
                    <Skeleton className="h-4 w-16 rounded" />
                  </div>
                  <Skeleton className="h-2.5 rounded-full" />
                </div>
              ))}
            </div>
          </SectionShell>

          <SectionShell>
            <HeaderSkeleton titleWidth="w-36" subtitleWidth="w-28" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-4"
                >
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3 rounded" />
                    <Skeleton className="h-3 w-1/2 rounded" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded" />
                </div>
              ))}
            </div>
          </SectionShell>
        </div>
      </div>
    </main>
  );
}

export function BillsLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#010101]">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <div className="space-y-8">
          <SummaryKpiSkeleton />

          <SectionShell>
            <HeaderSkeleton titleWidth="w-40" subtitleWidth="w-48" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <ListRowSkeleton key={index} dense />
              ))}
            </div>
          </SectionShell>

          <SectionShell>
            <HeaderSkeleton titleWidth="w-44" subtitleWidth="w-40" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <ListRowSkeleton key={index} dense />
              ))}
            </div>
          </SectionShell>

          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_360px] xl:items-start">
            <SectionShell>
              <HeaderSkeleton eyebrow titleWidth="w-44" subtitleWidth="w-56" />
              <div className="space-y-5">
                <Skeleton className="h-16 rounded-2xl" />
                <div className="grid gap-6 md:grid-cols-2">
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                </div>
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-24 rounded-2xl" />
                <Skeleton className="h-12 rounded-xl" />
              </div>
            </SectionShell>

            <SectionShell>
              <HeaderSkeleton titleWidth="w-48" subtitleWidth="w-52" />
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <Skeleton className="mb-3 h-5 w-2/3 rounded" />
                    <Skeleton className="mb-2 h-4 w-full rounded" />
                    <Skeleton className="h-4 w-5/6 rounded" />
                  </div>
                ))}
              </div>
            </SectionShell>
          </div>
        </div>
      </main>
    </div>
  );
}

export function TransactionHistoryLoadingSkeleton() {
  return (
    <main className="w-full min-h-screen bg-[#010101] font-inter">
      {/* Header */}
      <div className="mx-4 mt-8 md:mx-20 md:mt-10">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded" />
          <Skeleton className="h-5 w-64 rounded" />
        </div>
      </div>

      {/* Search and Action Bar */}
      <div className="mx-4 mt-8 md:mx-20 md:mt-10">
        <div className="flex flex-col gap-4 rounded-2xl border border-[#FFFFFF14] bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A] px-4 py-6 sm:gap-5">
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <Skeleton className="h-[42px] w-[120px] rounded-xl" />
            <Skeleton className="h-[42px] w-[120px] rounded-xl" />
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="mx-4 mt-6 md:mx-20">
        <div className="rounded-2xl border border-[#FFFFFF14] bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A] px-4 py-5 sm:px-6">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>

          <div className="mb-5">
            <Skeleton className="h-3 w-12 rounded mb-3" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-[40px] w-[80px] rounded-xl" />
              ))}
            </div>
          </div>

          <div className="mb-5">
            <Skeleton className="h-3 w-10 rounded mb-3" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-[40px] w-[100px] rounded-xl" />
              ))}
            </div>
          </div>

          <div>
            <Skeleton className="h-3 w-20 rounded mb-3" />
            <div className="flex flex-wrap items-end gap-3">
              <Skeleton className="h-[68px] w-[160px] rounded-xl" />
              <Skeleton className="h-[68px] w-[160px] rounded-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Transaction List Groups */}
      <div className="mx-4 mt-8 md:mx-20">
        {["today", "yesterday", "earlier"].map((group) => (
          <div key={group} className="mb-8">
            <div className="mb-3 flex items-center justify-between border-b border-[#FFFFFF14] pb-3">
              <Skeleton className="h-6 w-24 rounded" />
              <Skeleton className="h-4 w-12 rounded" />
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="border border-[#FFFFFF14] bg-gradient-to-t from-[#0A0A0A] to-[#0F0F0F] rounded-2xl p-6"
                >
                  <div className="flex gap-4">
                    <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-5 w-28 rounded" />
                          <Skeleton className="h-4 w-12 rounded" />
                        </div>
                        <Skeleton className="h-6 w-[90px] rounded-full" />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="space-y-1.5">
                          <Skeleton className="h-3 w-14 rounded" />
                          <Skeleton className="h-6 w-24 rounded" />
                        </div>
                        <div className="space-y-1.5">
                          <Skeleton className="h-3 w-20 rounded" />
                          <Skeleton className="h-4 w-28 rounded" />
                        </div>
                        <div className="space-y-1.5">
                          <Skeleton className="h-3 w-16 rounded" />
                          <Skeleton className="h-4 w-32 rounded" />
                        </div>
                        <div className="space-y-1.5">
                          <Skeleton className="h-3 w-8 rounded" />
                          <Skeleton className="h-4 w-16 rounded" />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Skeleton className="h-[38px] w-[120px] rounded-lg" />
                        <Skeleton className="h-[38px] w-[140px] rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

export function InsightsLoadingSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-[#010101]">
      <main className="flex-grow px-4 pb-20 pt-32 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex justify-center">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/40 p-6 backdrop-blur-sm">
              <div className="mb-8 flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32 rounded" />
                  <Skeleton className="h-4 w-28 rounded" />
                </div>
              </div>

              <div className="space-y-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-end justify-between gap-4">
                      <Skeleton className="h-4 w-32 rounded" />
                      <div className="flex items-end gap-3">
                        <Skeleton className="h-4 w-20 rounded" />
                        <Skeleton className="h-4 w-10 rounded" />
                      </div>
                    </div>
                    <Skeleton className="h-2.5 rounded-full" />
                  </div>
                ))}
              </div>

              <div className="mt-10 rounded-2xl border border-red-900/30 bg-red-950/20 p-4">
                <div className="flex gap-3">
                  <Skeleton className="mt-0.5 h-4 w-4 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-5/6 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function GoalsLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#010101] safari-safe-bottom">
      {/* Page header */}
      <div className="border-b border-white/10 px-5 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-40 rounded" />
            <Skeleton className="h-4 w-56 rounded" />
          </div>
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-5 py-7 sm:px-6 lg:px-8">
        {/* Stats row */}
        <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} variant="stat" />
          ))}
        </div>

        {/* Goals grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(16,16,16,0.98),rgba(10,10,10,0.98))] p-5"
            >
              <div className="mb-4 flex items-start justify-between">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="mb-4 space-y-2">
                <Skeleton className="h-5 w-3/4 rounded" />
                <Skeleton className="h-4 w-1/2 rounded" />
              </div>
              <Skeleton className="mb-2 h-2 w-full rounded-full" />
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-9 flex-1 rounded-xl" />
                <Skeleton className="h-9 w-9 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export function TransactionHistoryLoadingSkeleton() {
  return (
    <main className="w-full min-h-screen bg-[#010101]">
      {/* Header */}
      <div className="border-b border-white/10 px-4 py-6 md:px-20">
        <Skeleton className="mb-2 h-7 w-48 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
      </div>

      <div className="mx-4 mt-8 space-y-6 md:mx-20">
        {/* Search + action bar */}
        <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A] px-4 py-6">
          <Skeleton className="mb-4 h-10 w-full rounded-xl" />
          <div className="flex justify-end gap-3">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-24 rounded-xl" />
          </div>
        </div>

        {/* Filters panel */}
        <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0F0F0F] to-[#0A0A0A] px-4 py-5">
          <div className="mb-4 flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-xl" />
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-20 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Transaction rows */}
        <div className="space-y-4">
          {["today", "yesterday", "earlier"].map((group) => (
            <section key={group}>
              <div className="mb-3 flex items-center justify-between border-b border-white/[0.08] pb-3">
                <Skeleton className="h-5 w-24 rounded" />
                <Skeleton className="h-4 w-16 rounded" />
              </div>
              <div className="space-y-3">
                {Array.from({ length: group === "today" ? 2 : 3 }).map((_, i) => (
                  <ListRowSkeleton key={i} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}

export function InsightLoadingSkeleton() {
  return (
    <div
      className="min-h-screen p-4 sm:p-6 lg:p-8"
      style={{ background: "linear-gradient(180deg, #0F0F0F 0%, #0A0A0A 100%)" }}
    >
      <div className="mx-auto max-w-[928px] space-y-6">
        {/* Title + period selector row */}
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <Skeleton className="h-8 w-44 rounded" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>

        {/* KPI stat row */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/10 bg-black/40 p-4"
            >
              <Skeleton className="mb-2 h-4 w-20 rounded" />
              <Skeleton className="h-6 w-24 rounded" />
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <SkeletonCard variant="chart" />
          <SkeletonCard variant="chart" />
        </div>
      </div>
    </div>
  );
}
