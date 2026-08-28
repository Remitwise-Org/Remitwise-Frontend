/**
 * Performance Monitoring Utilities
 * 
 * Tools for measuring and tracking Core Web Vitals and custom metrics
 */

export interface PerformanceMetrics {
  lcp?: number
  fid?: number
  cls?: number
  ttfb?: number
  fcp?: number
}

/**
 * Measure Cumulative Layout Shift (CLS)
 * 
 * @returns Promise that resolves with the CLS score
 */
export function measureCLS(): Promise<number> {
  return new Promise((resolve) => {
    let clsScore = 0

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const layoutShift = entry as any
        // Only count shifts without recent input
        if (!layoutShift.hadRecentInput) {
          clsScore += layoutShift.value
        }
      }
    })

    observer.observe({ type: 'layout-shift', buffered: true })

    // Resolve after 3 seconds of observation
    setTimeout(() => {
      observer.disconnect()
      resolve(clsScore)
    }, 3000)
  })
}

/**
 * Measure Largest Contentful Paint (LCP)
 * 
 * @returns Promise that resolves with the LCP time in milliseconds
 */
export function measureLCP(): Promise<number> {
  return new Promise((resolve) => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as any
      const lcp = lastEntry.renderTime || lastEntry.loadTime
      resolve(lcp)
    })

    observer.observe({ type: 'largest-contentful-paint', buffered: true })

    // Fallback timeout
    setTimeout(() => resolve(0), 5000)
  })
}

/**
 * Measure First Input Delay (FID)
 * 
 * @returns Promise that resolves with the FID in milliseconds
 */
export function measureFID(): Promise<number> {
  return new Promise((resolve) => {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fidEntry = entry as any
        const fid = fidEntry.processingStart - fidEntry.startTime
        resolve(fid)
        observer.disconnect()
        return
      }
    })

    observer.observe({ type: 'first-input', buffered: true })

    // Fallback timeout
    setTimeout(() => resolve(0), 10000)
  })
}

/**
 * Get all Core Web Vitals
 */
export async function getCoreWebVitals(): Promise<PerformanceMetrics> {
  const [lcp, cls] = await Promise.all([
    measureLCP(),
    measureCLS(),
  ])

  // Get navigation timing metrics
  const perfData = performance.getEntriesByType('navigation')[0] as any

  return {
    lcp,
    cls,
    ttfb: perfData?.responseStart || 0,
    fcp: perfData?.domContentLoadedEventEnd || 0,
  }
}

/**
 * Report Web Vitals to analytics
 * 
 * @param metric - The metric to report
 * @param value - The metric value
 */
export function reportWebVital(metric: string, value: number) {
  // Send to analytics service
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric, {
      value: Math.round(value),
      event_category: 'Web Vitals',
      event_label: metric,
      non_interaction: true,
    })
  }

  // Log in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric}:`, value)
  }
}

/**
 * Monitor and report all Core Web Vitals
 */
export function monitorPerformance() {
  if (typeof window === 'undefined') return

  // Measure and report CLS
  measureCLS().then((cls) => {
    reportWebVital('CLS', cls)
  })

  // Measure and report LCP
  measureLCP().then((lcp) => {
    reportWebVital('LCP', lcp)
  })

  // Measure and report FID
  measureFID().then((fid) => {
    reportWebVital('FID', fid)
  })
}

/**
 * Performance mark utility
 * 
 * @param name - Mark name
 */
export function mark(name: string) {
  if (typeof window !== 'undefined' && performance.mark) {
    performance.mark(name)
  }
}

/**
 * Performance measure utility
 * 
 * @param name - Measure name
 * @param startMark - Start mark name
 * @param endMark - End mark name
 */
export function measure(name: string, startMark: string, endMark?: string) {
  if (typeof window !== 'undefined' && performance.measure) {
    try {
      performance.measure(name, startMark, endMark)
      const measure = performance.getEntriesByName(name)[0]
      return measure?.duration || 0
    } catch (error) {
      console.warn('Performance measurement failed:', error)
      return 0
    }
  }
  return 0
}
