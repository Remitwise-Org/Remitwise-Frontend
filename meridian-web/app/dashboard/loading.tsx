import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Dashboard Loading State
 * 
 * Shown during route transitions and initial page load.
 * Matches the final dashboard layout exactly to prevent layout shifts.
 */
export default function DashboardLoading() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-[200px]" />
          <Skeleton className="h-5 w-[300px]" />
        </div>
      </div>

      {/* Full Dashboard Skeleton */}
      <DashboardSkeleton variant="full" />
    </div>
  )
}
