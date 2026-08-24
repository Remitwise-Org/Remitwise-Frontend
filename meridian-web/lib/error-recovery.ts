import { track } from '@vercel/analytics'

export type ErrorCategory = 'offline' | 'network' | 'unknown'

const NETWORK_ERROR_PATTERN = /\b(network|fetch|connection|timeout|timed?\s*out|internet)\b/i

export function getErrorCategory(error: unknown, isOnline = true): ErrorCategory {
  if (!isOnline) return 'offline'
  return error instanceof Error && NETWORK_ERROR_PATTERN.test(error.message) ? 'network' : 'unknown'
}

export function getRecoveryCopy(category: ErrorCategory) {
  switch (category) {
    case 'offline':
      return { title: 'You are offline', description: 'Check your internet connection, then retry when you are back online.', toastDescription: 'Check your connection, then try again.' }
    case 'network':
      return { title: 'We could not reach Meridian', description: 'Please check your connection and try again. Your information is still safe.', toastDescription: 'Check your connection and try again.' }
    default:
      return { title: 'Something went wrong', description: 'We could not load this page. Please try again, or return to the homepage.', toastDescription: 'Please try again.' }
  }
}

/** Reports only safe metadata; monitoring can never affect recovery. */
export function reportCriticalError(error: Error, boundary: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[${boundary}] captured an error`, error)
    return
  }

  try {
    track('critical_error', { boundary, category: getErrorCategory(error) })
  } catch {
    // Monitoring is deliberately best-effort.
  }
}
