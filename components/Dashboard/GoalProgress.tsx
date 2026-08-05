import { Target } from 'lucide-react'
import WidgetEmptyState from '@/components/ui/WidgetEmptyState'
import WidgetErrorState from '@/components/ui/WidgetErrorState'

interface GoalProgressProps {
  name: string
  current: number
  target: number
  gradient: { from: string; to: string }
  /** Pass true to show the error state */
  hasError?: boolean
  /** Pass true to show the empty state (e.g. goal not yet started) */
  isEmpty?: boolean
  /** Called when the user clicks "Try again" in the error state */
  onRetry?: () => void
}

export default function GoalProgress({
  name,
  current,
  target,
  gradient,
  hasError = false,
  isEmpty = false,
  onRetry,
}: GoalProgressProps) {
  if (hasError) {
    return (
      <WidgetErrorState
        message={`Couldn't load data for "${name}".`}
        onRetry={onRetry ?? (() => {})}
      />
    )
  }

  if (isEmpty) {
    // CTA DESTINATION: /goals — Savings goals management page.
    // Rationale: goal progress is per-goal; with no contributions yet, the user should
    // be directed back to the goals page where they can add to or manage the goal.
    // See issue #1316 CTA destinations table.
    return (
      <WidgetEmptyState
        icon={Target}
        title={`No progress for "${name}" yet`}
        description="Start contributing to this goal to track your progress."
        ctaLabel="Add to this goal"
        ctaHref="/goals"
      />
    )
  }

  const percentage = Math.min((current / target) * 100, 100)

  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="font-medium text-[var(--foreground)]">{name}</span>
        <div className="flex gap-3 items-center">
          <span className="text-(--foreground) font-bold text-sm">${target}</span>
          <span className="text-white/40 text-xs">
            {Math.floor((current / target) * 100)}%
          </span>
        </div>
      </div>
      <div
        className="w-full bg-[#FFFFFF0D] rounded-full h-3 mb-2"
        role="progressbar"
        aria-valuenow={Math.floor(percentage)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${name} progress`}
      >
        <div
          className="h-3 rounded-full"
          style={{
            width: `${percentage}%`,
            transition: 'width 0.3s ease-in-out',
            backgroundImage: `linear-gradient(${gradient.from}, ${gradient.to})`,
          }}
        />
      </div>
    </div>
  )
}
