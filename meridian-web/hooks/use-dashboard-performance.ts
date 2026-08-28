'use client'

import { useEffect, useRef, useState } from 'react'
import { mark, measure } from '@/lib/utils/performance'

/**
 * Dashboard Performance Metrics
 */
export interface DashboardPerformanceMetrics {
  dataFetchDuration: number | null
  hydrationDuration: number | null
  renderDuration: number | null
  totalLoadTime: number | null
}

/**
 * Hook for tracking dashboard-specific performance metrics
 * 
 * Tracks:
 * - Initial data fetch time
 * - Component hydration time
 * - Render performance
 * - Total dashboard load time
 * 
 * @returns Performance metrics and tracking functions
 * 
 * @example
 * ```tsx
 * function Dashboard() {
 *   const { metrics, startDataFetch, endDataFetch, startHydration, endHydration } = useDashboardPerformance()
 *   
 *   useEffect(() => {
 *     startDataFetch()
 *     fetchData().then(() => {
 *       endDataFetch()
 *       startHydration()
 *       // ... hydration logic
 *       endHydration()
 *     })
 *   }, [])
 *   
 *   return <div>{metrics.totalLoadTime}ms</div>
 * }
 * ```
 */
export function useDashboardPerformance() {
  const [metrics, setMetrics] = useState<DashboardPerformanceMetrics>({
    dataFetchDuration: null,
    hydrationDuration: null,
    renderDuration: null,
    totalLoadTime: null,
  })

  const startTime = useRef<number>(0)

  useEffect(() => {
    // Mark dashboard start time
    startTime.current = performance.now()
    mark('dashboard-start')
  }, [])

  const startDataFetch = () => {
    mark('dashboard-data-fetch-start')
  }

  const endDataFetch = () => {
    mark('dashboard-data-fetch-end')
    const duration = measure(
      'dashboard-data-fetch',
      'dashboard-data-fetch-start',
      'dashboard-data-fetch-end'
    )
    
    setMetrics((prev) => ({
      ...prev,
      dataFetchDuration: duration,
    }))

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Dashboard Performance] Data fetch: ${duration.toFixed(2)}ms`)
    }
  }

  const startHydration = () => {
    mark('dashboard-hydration-start')
  }

  const endHydration = () => {
    mark('dashboard-hydration-end')
    const duration = measure(
      'dashboard-hydration',
      'dashboard-hydration-start',
      'dashboard-hydration-end'
    )
    
    setMetrics((prev) => ({
      ...prev,
      hydrationDuration: duration,
    }))

    // Calculate total load time
    const totalTime = performance.now() - startTime.current

    setMetrics((prev) => ({
      ...prev,
      totalLoadTime: totalTime,
    }))

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Dashboard Performance] Hydration: ${duration.toFixed(2)}ms`)
      console.log(`[Dashboard Performance] Total load: ${totalTime.toFixed(2)}ms`)
    }

    // Report to analytics in production
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      if ((window as any).gtag) {
        (window as any).gtag('event', 'dashboard_load_time', {
          value: Math.round(totalTime),
          event_category: 'Dashboard Performance',
          event_label: 'Total Load Time',
          non_interaction: true,
        })
      }
    }
  }

  const startRender = () => {
    mark('dashboard-render-start')
  }

  const endRender = () => {
    mark('dashboard-render-end')
    const duration = measure(
      'dashboard-render',
      'dashboard-render-start',
      'dashboard-render-end'
    )
    
    setMetrics((prev) => ({
      ...prev,
      renderDuration: duration,
    }))

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Dashboard Performance] Render: ${duration.toFixed(2)}ms`)
    }
  }

  return {
    metrics,
    startDataFetch,
    endDataFetch,
    startHydration,
    endHydration,
    startRender,
    endRender,
  }
}

/**
 * Hook for tracking component render performance
 * 
 * @param componentName - Name of the component for logging
 * 
 * @example
 * ```tsx
 * function MetricCard() {
 *   useComponentPerformance('MetricCard')
 *   return <Card>...</Card>
 * }
 * ```
 */
export function useComponentPerformance(componentName: string) {
  const renderCount = useRef(0)
  const mountTime = useRef<number>(0)

  useEffect(() => {
    // Mark component mount
    if (renderCount.current === 0) {
      mountTime.current = performance.now()
      mark(`${componentName}-mount`)
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Component Performance] ${componentName} mounted`)
      }
    }

    renderCount.current += 1
  })

  useEffect(() => {
    // Measure time to interactive (first render complete)
    return () => {
      if (renderCount.current > 0) {
        mark(`${componentName}-unmount`)
        const duration = measure(
          `${componentName}-lifetime`,
          `${componentName}-mount`,
          `${componentName}-unmount`
        )

        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[Component Performance] ${componentName} lifetime: ${duration.toFixed(2)}ms (${renderCount.current} renders)`
          )
        }
      }
    }
  }, [componentName])

  return {
    renderCount: renderCount.current,
  }
}

/**
 * Hook for tracking animation performance
 * 
 * Measures frame rate and dropped frames during animations
 * 
 * @returns Animation performance metrics
 * 
 * @example
 * ```tsx
 * function AnimatedCounter() {
 *   const { fps, startTracking, stopTracking } = useAnimationPerformance()
 *   
 *   useEffect(() => {
 *     startTracking()
 *     // ... animation code
 *     return () => stopTracking()
 *   }, [])
 *   
 *   return <div>FPS: {fps}</div>
 * }
 * ```
 */
export function useAnimationPerformance() {
  const [fps, setFps] = useState<number>(60)
  const [isTracking, setIsTracking] = useState(false)
  const frameTimesRef = useRef<number[]>([])
  const rafIdRef = useRef<number>()

  const measureFrame = () => {
    const now = performance.now()
    frameTimesRef.current.push(now)

    // Keep only last 60 frames
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift()
    }

    // Calculate FPS
    if (frameTimesRef.current.length >= 2) {
      const totalTime =
        frameTimesRef.current[frameTimesRef.current.length - 1] -
        frameTimesRef.current[0]
      const avgFrameTime = totalTime / (frameTimesRef.current.length - 1)
      const calculatedFps = 1000 / avgFrameTime

      setFps(Math.round(calculatedFps))
    }

    if (isTracking) {
      rafIdRef.current = requestAnimationFrame(measureFrame)
    }
  }

  const startTracking = () => {
    setIsTracking(true)
    frameTimesRef.current = []
    rafIdRef.current = requestAnimationFrame(measureFrame)
  }

  const stopTracking = () => {
    setIsTracking(false)
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
    }

    // Log final FPS in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Animation Performance] Average FPS: ${fps}`)
      
      if (fps < 30) {
        console.warn(`[Animation Performance] Low FPS detected: ${fps}`)
      }
    }
  }

  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current)
      }
    }
  }, [])

  return {
    fps,
    isTracking,
    startTracking,
    stopTracking,
  }
}
