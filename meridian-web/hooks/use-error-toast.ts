import { useCallback } from 'react'
import { toast } from 'sonner'
import { getErrorCategory, getRecoveryCopy, type ErrorCategory } from '@/lib/error-recovery'

interface ErrorToastOptions {
  category?: ErrorCategory
  scope?: string
}

export function useErrorToast() {
  const triggerErrorToast = useCallback((error: unknown, options: ErrorToastOptions = {}) => {
    const category = options.category ?? getErrorCategory(error, navigator.onLine)
    const copy = getRecoveryCopy(category)

    toast.error(copy.title, {
      id: `error-${options.scope ?? category}`,
      description: copy.toastDescription,
      duration: 5000,
      closeButton: true,
    })
  }, [])

  return { triggerErrorToast }
}
