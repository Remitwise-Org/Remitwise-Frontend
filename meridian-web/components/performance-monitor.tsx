'use client'

import { useEffect, useRef } from 'react'
import { monitorPerformance, reportWebVital } from '@/lib/utils/performance'
import {
  getServiceWorkerSnapshot,
  subscribeToServiceWorker,
  type ServiceWorkerSnapshot,
} from '@/lib/pwa/service-worker'

/**
 * Performance Monitor Component
 *
 * Client component that automatically monitors and reports Core Web Vitals
 * when mounted. Should be included once at the root layout level.
 *
 * Monitors:
 * - Cumulative Layout Shift (CLS)
 * - Largest Contentful Paint (LCP)
 * - First Input Delay (FID)
 * - Time to First Byte (TTFB)
 * - First Contentful Paint (FCP)
 * - Service worker lifecycle (offline readiness)
 *
 * In production, reports to analytics (Google Analytics via gtag)
 * In development, logs to console
 */
export function PerformanceMonitor() {
  /** Guards against double-reporting an activation across state changes. */
  const reportedActivationRef = useRef(false)

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return

    // Small delay to avoid impacting initial render
    const timeoutId = setTimeout(() => {
      monitorPerformance()
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [])

  // Report the service worker lifecycle. `activated` is the moment the app
  // became offline-capable, so its timing is tracked like a web vital: it is
  // the difference between a repeat visit that works on a plane and one that
  // shows the browser's offline page.
  useEffect(() => {
    if (typeof window === 'undefined') return

    const report = (snapshot: ServiceWorkerSnapshot) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Service Worker]', snapshot.status, {
          controlled: snapshot.controlled,
          activatedAt: snapshot.activatedAt,
          error: snapshot.error,
        })
      }

      if (snapshot.status === 'activated' && !reportedActivationRef.current) {
        reportedActivationRef.current = true
        // `activatedAt` is a `performance.now()` reading, i.e. ms since
        // navigation start — the same baseline the web vitals use.
        reportWebVital('SW_Activation', snapshot.activatedAt ?? 0)
        return
      }

      if (snapshot.status === 'error' || snapshot.status === 'redundant') {
        // A failed registration means no offline support at all, so surface it
        // with the same channel rather than swallowing it.
        reportWebVital(`SW_${snapshot.status === 'error' ? 'Error' : 'Redundant'}`, 0)
      }
    }

    // The inline registration script may already have reached `activated`
    // before hydration, so report the current snapshot before subscribing.
    report(getServiceWorkerSnapshot())

    return subscribeToServiceWorker(report)
  }, [])

  // This component renders nothing
  return null
}
