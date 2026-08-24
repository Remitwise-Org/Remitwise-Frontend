/**
 * SectionSkeleton — placeholder shown while a lazy section hydrates.
 *
 * Sized and structured to roughly match the real sections so the layout
 * does not shift when content loads (reduces CLS).
 */
import { Skeleton } from '@/components/ui/skeleton';

interface SectionSkeletonProps {
  /** Approximate visual variant so the skeleton matches the real content */
  variant?: 'default' | 'chart' | 'grid' | 'cta';
}

export function SectionSkeleton({ variant = 'default' }: SectionSkeletonProps) {
  return (
    <div
      className="w-full py-20 px-4 max-w-7xl mx-auto"
      aria-hidden="true"
      aria-label="Loading section…"
    >
      {/* Section heading placeholder */}
      <div className="text-center mb-16 space-y-3">
        <Skeleton className="h-10 w-64 mx-auto rounded-lg" />
        <Skeleton className="h-5 w-96 mx-auto rounded" />
      </div>

      {variant === 'chart' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Chart card placeholder */}
          <Skeleton className="h-80 w-full rounded-2xl" />
          {/* Feature list placeholder */}
          <div className="space-y-4">
            <Skeleton className="h-6 w-48 rounded" />
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {variant === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      )}

      {variant === 'cta' && (
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-72 w-full rounded-3xl" />
        </div>
      )}

      {variant === 'default' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-48 rounded" />
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
