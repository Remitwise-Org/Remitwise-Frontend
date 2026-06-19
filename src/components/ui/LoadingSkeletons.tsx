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
