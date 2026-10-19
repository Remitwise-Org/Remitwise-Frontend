import { AlertCircle } from 'lucide-react'

interface WidgetErrorStateProps {
  message?: string
  onRetry: () => void
}

export default function WidgetErrorState({
  message = 'Something went wrong loading this widget.',
  onRetry,
}: WidgetErrorStateProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center justify-center gap-4 py-10 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#DC2626]/40 bg-[#DC2626]/10 text-[#DC2626]">
        <AlertCircle className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-white">Unable to load data</p>
        <p className="text-xs text-white/50">{message}</p>
      </div>
      <button
        onClick={onRetry}
        aria-label="Retry loading data"
        className="rounded-lg border border-[#DC2626]/40 bg-[#DC2626]/10 px-4 py-2 text-xs font-semibold text-[#DC2626] transition-colors hover:bg-[#DC2626]/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DC2626]"
      >
        Try again
      </button>
    </div>
  )
}
