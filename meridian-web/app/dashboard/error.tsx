'use client'

import { ErrorRecovery } from '@/components/error-recovery'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="container mx-auto space-y-8 py-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Real-time metrics and productivity insights</p>
      </div>
      <ErrorRecovery
        error={error}
        reset={reset}
        boundary="dashboard"
        className="flex min-h-[45vh] flex-col items-center justify-center px-4 text-center"
      />
    </div>
  )
}
