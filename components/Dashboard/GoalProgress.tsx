import WidgetErrorState from '@/components/ui/WidgetErrorState'

interface GoalProgressProps {
  name: string
  current: number
  target: number
  gradient: { from: string; to: string }
  /** Pass true to show the error state */
  hasError?: boolean
  /** Called when the user clicks "Try again" in the error state */
  onRetry?: () => void
}

export default function GoalProgress({
  name,
  current,
  target,
  gradient,
  hasError = false,
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
