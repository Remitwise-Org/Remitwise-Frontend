import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface DashboardSkeletonProps {
  variant: 'metrics' | 'charts' | 'full'
}

/**
 * Dashboard Skeleton Component
 * 
 * Provides structural skeletons for zero layout shift during hydration.
 * Dimensions are explicitly set to match final rendered components.
 * 
 * Features:
 * - Explicit dimensions prevent CLS
 * - Matches final component structure exactly
 * - Accessible (hidden from screen readers via aria-hidden)
 */
export function DashboardSkeleton({ variant }: DashboardSkeletonProps) {
  if (variant === 'metrics' || variant === 'full') {
    return (
      <div aria-hidden="true" aria-label="Loading metrics">
        <MetricsGridSkeleton />
        {variant === 'full' && <ChartsSkeleton />}
      </div>
    )
  }

  if (variant === 'charts') {
    return (
      <div aria-hidden="true" aria-label="Loading charts">
        <ChartsSkeleton />
      </div>
    )
  }

  return null
}

/**
 * Metrics Grid Skeleton
 * Matches the 4-card grid layout with explicit dimensions
 */
function MetricsGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="space-y-0 pb-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-[120px] mb-2" />
            <Skeleton className="h-4 w-[80px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Charts Skeleton
 * Matches the chart layout with explicit aspect ratio
 */
function ChartsSkeleton() {
  return (
    <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      {/* Main Chart - Takes 4 columns */}
      <Card className="col-span-full lg:col-span-4">
        <CardHeader>
          <Skeleton className="h-6 w-[160px] mb-2" />
          <Skeleton className="h-4 w-[240px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>

      {/* Secondary Chart - Takes 3 columns */}
      <Card className="col-span-full lg:col-span-3">
        <CardHeader>
          <Skeleton className="h-6 w-[140px] mb-2" />
          <Skeleton className="h-4 w-[200px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
