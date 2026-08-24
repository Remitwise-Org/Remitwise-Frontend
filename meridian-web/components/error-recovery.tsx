'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Home, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useErrorToast } from '@/hooks/use-error-toast'
import { getErrorCategory, getRecoveryCopy, reportCriticalError } from '@/lib/error-recovery'

interface ErrorRecoveryProps {
  error: Error
  reset: () => void
  boundary: string
  className?: string
}

export function ErrorRecovery({ error, reset, boundary, className }: ErrorRecoveryProps) {
  const [isOnline, setIsOnline] = useState(true)
  const { triggerErrorToast } = useErrorToast()
  const category = getErrorCategory(error, isOnline)
  const copy = getRecoveryCopy(category)

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)
    updateOnlineStatus()
    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)
    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  useEffect(() => {
    reportCriticalError(error, boundary)
    triggerErrorToast(error, { category, scope: boundary })
  }, [boundary, category, error, triggerErrorToast])

  const handleRetry = useCallback(() => reset(), [reset])

  return (
    <section aria-labelledby={`${boundary}-error-title`} className={className ?? 'flex min-h-[70vh] flex-col items-center justify-center px-4 text-center'}>
      <div className="w-full max-w-lg">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 ring-2 ring-destructive/20">
          <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
        </div>
        <h1 id={`${boundary}-error-title`} className="mb-3 text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-muted-foreground">{copy.description}</p>
        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button onClick={handleRetry} className="w-full gap-2 sm:w-auto"><RefreshCw className="h-4 w-4" aria-hidden="true" />Retry</Button>
          <Link href="/" className="w-full sm:w-auto"><Button variant="outline" className="w-full gap-2"><Home className="h-4 w-4" aria-hidden="true" />Go home</Button></Link>
        </div>
      </div>
    </section>
  )
}
