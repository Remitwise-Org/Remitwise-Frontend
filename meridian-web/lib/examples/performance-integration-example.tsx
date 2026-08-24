/**
 * Performance Monitoring Integration Examples
 * 
 * This file demonstrates how to integrate performance monitoring
 * into dashboard components and custom features.
 */

'use client'

import { useEffect, useState } from 'react'
import { mark, measure } from '@/lib/utils/performance'
import {
  DashboardMarks,
  measureDataFetch,
  measureMetricsRender,
  getDashboardMetrics,
  logDashboardPerformance,
  reportDashboardPerformance,
} from '@/lib/utils/dashboard-performance'

// ============================================================================
// Example 1: Track Data Fetching
// ============================================================================

export function ExampleDataFetchTracking() {
  const [data, setData] = useState(null)

  useEffect(() => {
    async function fetchData() {
      // Mark start of data fetch
      mark(DashboardMarks.DATA_FETCH_START)

      try {
        const response = await fetch('/api/dashboard')
        const result = await response.json()
        setData(result)
      } finally {
        // Mark end of data fetch
        mark(DashboardMarks.DATA_FETCH_END)

        // Measure the duration
        const duration = measureDataFetch()

        // Log in development
        if (process.env.NODE_ENV === 'development') {
          console.log(`Data fetch completed in ${duration}ms`)
        }
      }
    }

    fetchData()
  }, [])

  return <div>{/* Render data */}</div>
}

// ============================================================================
// Example 2: Track Component Rendering
// ============================================================================

export function ExampleRenderTracking() {
  useEffect(() => {
    // Mark start of render
    mark(DashboardMarks.METRICS_RENDER_START)

    return () => {
      // Mark end of render on cleanup
      mark(DashboardMarks.METRICS_RENDER_END)

      // Measure the duration
      const duration = measureMetricsRender()

      if (process.env.NODE_ENV === 'development') {
        console.log(`Metrics rendered in ${duration}ms`)
      }
    }
  }, [])

  return <div>{/* Component content */}</div>
}

// ============================================================================
// Example 3: Track Custom Operations
// ============================================================================

export function ExampleCustomOperationTracking() {
  const [result, setResult] = useState(null)

  const handleHeavyOperation = async () => {
    // Mark start
    mark('heavy-operation-start')

    try {
      // Perform operation
      const data = await performHeavyCalculation()
      setResult(data)
    } finally {
      // Mark end
      mark('heavy-operation-end')

      // Measure duration
      const duration = measure(
        'heavy-operation',
        'heavy-operation-start',
        'heavy-operation-end'
      )

      console.log(`Operation completed in ${duration}ms`)
    }
  }

  return (
    <button onClick={handleHeavyOperation}>
      Start Heavy Operation
    </button>
  )
}

// Helper function
async function performHeavyCalculation(): Promise<any> {
  return new Promise((resolve) => {
    setTimeout(() => resolve({ result: 'done' }), 1000)
  })
}

// ============================================================================
// Example 4: Track User Interactions
// ============================================================================

export function ExampleInteractionTracking() {
  const handleClick = () => {
    mark(DashboardMarks.INTERACTION_START)

    // Perform action
    performAction()

    mark(DashboardMarks.INTERACTION_END)

    const duration = measure(
      'interaction',
      DashboardMarks.INTERACTION_START,
      DashboardMarks.INTERACTION_END
    )

    console.log(`Interaction handled in ${duration}ms`)
  }

  return <button onClick={handleClick}>Click Me</button>
}

function performAction() {
  // Simulate some work
  for (let i = 0; i < 1000; i++) {
    Math.random()
  }
}

// ============================================================================
// Example 5: Complete Dashboard Page with Performance Tracking
// ============================================================================

export function ExampleDashboardWithPerformance() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      // Track data fetch
      mark(DashboardMarks.DATA_FETCH_START)
      const dashboardData = await fetch('/api/dashboard').then((r) => r.json())
      mark(DashboardMarks.DATA_FETCH_END)
      measureDataFetch()

      setData(dashboardData)
      setIsLoading(false)

      // Track metrics rendering
      mark(DashboardMarks.METRICS_RENDER_START)
    }

    loadDashboard()
  }, [])

  useEffect(() => {
    if (!isLoading) {
      // Rendering complete
      mark(DashboardMarks.METRICS_RENDER_END)
      measureMetricsRender()

      // Log all dashboard metrics
      logDashboardPerformance()

      // Report to analytics in production
      if (process.env.NODE_ENV === 'production') {
        const metrics = getDashboardMetrics()
        reportDashboardPerformance(metrics)
      }
    }
  }, [isLoading])

  if (isLoading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Render dashboard content */}
    </div>
  )
}

// ============================================================================
// Example 6: Performance Monitoring Hook
// ============================================================================

export function usePerformanceMonitoring(operationName: string) {
  const startMark = `${operationName}-start`
  const endMark = `${operationName}-end`

  const startTracking = () => {
    mark(startMark)
  }

  const endTracking = () => {
    mark(endMark)
    const duration = measure(operationName, startMark, endMark)

    if (process.env.NODE_ENV === 'development') {
      console.log(`${operationName}: ${duration}ms`)
    }

    return duration
  }

  return { startTracking, endTracking }
}

// Usage:
export function ExampleUsingPerformanceHook() {
  const { startTracking, endTracking } = usePerformanceMonitoring('my-operation')

  const handleOperation = async () => {
    startTracking()
    await performHeavyCalculation()
    const duration = endTracking()
    console.log(`Completed in ${duration}ms`)
  }

  return <button onClick={handleOperation}>Start</button>
}

// ============================================================================
// Example 7: Conditional Performance Tracking
// ============================================================================

export function ExampleConditionalTracking() {
  const [data, setData] = useState(null)

  useEffect(() => {
    async function fetchWithTracking() {
      const shouldTrack = process.env.NODE_ENV === 'development'

      if (shouldTrack) mark('fetch-start')

      const result = await fetch('/api/data').then((r) => r.json())
      setData(result)

      if (shouldTrack) {
        mark('fetch-end')
        const duration = measure('fetch', 'fetch-start', 'fetch-end')
        console.log(`Fetch: ${duration}ms`)
      }
    }

    fetchWithTracking()
  }, [])

  return <div>{/* Render data */}</div>
}

// ============================================================================
// Example 8: Performance Budget Checking
// ============================================================================

export function ExampleBudgetChecking() {
  useEffect(() => {
    // After dashboard loads, check performance budget
    const checkBudget = () => {
      const metrics = getDashboardMetrics()

      if (!metrics) return

      const budgetCheck = {
        dataFetch: metrics.dataFetch <= 1000,
        metricsRender: metrics.metricsRender <= 100,
        chartsRender: metrics.chartsRender <= 300,
        totalLoad: metrics.totalLoad <= 2500,
      }

      if (!budgetCheck.dataFetch) {
        console.warn(
          `⚠️ Data fetch (${metrics.dataFetch}ms) exceeded budget (1000ms)`
        )
      }

      if (!budgetCheck.metricsRender) {
        console.warn(
          `⚠️ Metrics render (${metrics.metricsRender}ms) exceeded budget (100ms)`
        )
      }

      // Report to monitoring service if any budget exceeded
      const anyExceeded = Object.values(budgetCheck).some((passed) => !passed)
      if (anyExceeded && typeof window !== 'undefined') {
        // Send alert to monitoring service
        fetch('/api/performance-alert', {
          method: 'POST',
          body: JSON.stringify({ metrics, budgetCheck }),
        })
      }
    }

    // Check after dashboard fully loads
    setTimeout(checkBudget, 3000)
  }, [])

  return <div>{/* Dashboard content */}</div>
}

// ============================================================================
// Example 9: Animation Performance Tracking
// ============================================================================

export function ExampleAnimationTracking() {
  const [count, setCount] = useState(0)

  const animateCounter = (targetValue: number) => {
    mark(DashboardMarks.COUNTER_ANIMATION_START)

    // Simulate counter animation
    let current = 0
    const interval = setInterval(() => {
      current += 1
      setCount(current)

      if (current >= targetValue) {
        clearInterval(interval)

        mark(DashboardMarks.COUNTER_ANIMATION_END)
        const duration = measure(
          'counter-animation',
          DashboardMarks.COUNTER_ANIMATION_START,
          DashboardMarks.COUNTER_ANIMATION_END
        )

        console.log(`Counter animated in ${duration}ms`)
      }
    }, 10)
  }

  return (
    <div>
      <div>Count: {count}</div>
      <button onClick={() => animateCounter(100)}>Animate</button>
    </div>
  )
}

// ============================================================================
// Example 10: Real-World Dashboard Integration
// ============================================================================

export function ExampleRealWorldDashboard() {
  const [metrics, setMetrics] = useState(null)
  const [charts, setCharts] = useState(null)

  useEffect(() => {
    async function loadDashboard() {
      // Track overall load
      mark('dashboard-load-start')

      // Track data fetch
      mark(DashboardMarks.DATA_FETCH_START)

      const [metricsData, chartsData] = await Promise.all([
        fetch('/api/metrics').then((r) => r.json()),
        fetch('/api/charts').then((r) => r.json()),
      ])

      mark(DashboardMarks.DATA_FETCH_END)
      measureDataFetch()

      setMetrics(metricsData)
      setCharts(chartsData)

      // Track rendering phases
      requestAnimationFrame(() => {
        mark(DashboardMarks.METRICS_RENDER_START)

        requestAnimationFrame(() => {
          mark(DashboardMarks.METRICS_RENDER_END)
          mark(DashboardMarks.CHARTS_RENDER_START)

          requestAnimationFrame(() => {
            mark(DashboardMarks.CHARTS_RENDER_END)
            mark('dashboard-load-end')

            // Measure all phases
            measureMetricsRender()
            const totalLoad = measure(
              'dashboard-total-load',
              'dashboard-load-start',
              'dashboard-load-end'
            )

            // Log comprehensive metrics
            if (process.env.NODE_ENV === 'development') {
              logDashboardPerformance()
              console.log(`Total dashboard load: ${totalLoad}ms`)
            }

            // Report to analytics
            if (process.env.NODE_ENV === 'production') {
              const allMetrics = getDashboardMetrics()
              reportDashboardPerformance(allMetrics)
            }
          })
        })
      })
    }

    loadDashboard()
  }, [])

  return (
    <div>
      {metrics && <MetricsSection data={metrics} />}
      {charts && <ChartsSection data={charts} />}
    </div>
  )
}

// Helper components
function MetricsSection({ data }: { data: any }) {
  return <div>Metrics</div>
}

function ChartsSection({ data }: { data: any }) {
  return <div>Charts</div>
}
