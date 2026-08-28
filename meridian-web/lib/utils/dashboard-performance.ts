/**
 * Dashboard-Specific Performance Utilities
 * 
 * Tools for measuring and optimizing dashboard performance metrics
 */

import { mark, measure } from './performance'

/**
 * Performance marks for dashboard lifecycle events
 */
export const DashboardMarks = {
  // Initial load marks
  DATA_FETCH_START: 'dashboard-data-fetch-start',
  DATA_FETCH_END: 'dashboard-data-fetch-end',
  
  // Rendering marks
  METRICS_RENDER_START: 'dashboard-metrics-render-start',
  METRICS_RENDER_END: 'dashboard-metrics-render-end',
  
  CHARTS_RENDER_START: 'dashboard-charts-render-start',
  CHARTS_RENDER_END: 'dashboard-charts-render-end',
  
  // Interaction marks
  INTERACTION_START: 'dashboard-interaction-start',
  INTERACTION_END: 'dashboard-interaction-end',
  
  // Animation marks
  COUNTER_ANIMATION_START: 'dashboard-counter-animation-start',
  COUNTER_ANIMATION_END: 'dashboard-counter-animation-end',
} as const

/**
 * Performance measures for dashboard operations
 */
export const DashboardMeasures = {
  DATA_FETCH: 'dashboard-data-fetch-duration',
  METRICS_RENDER: 'dashboard-metrics-render-duration',
  CHARTS_RENDER: 'dashboard-charts-render-duration',
  INTERACTION: 'dashboard-interaction-duration',
  COUNTER_ANIMATION: 'dashboard-counter-animation-duration',
  TOTAL_LOAD: 'dashboard-total-load-time',
} as const

/**
 * Track data fetching performance
 * 
 * @returns Duration in milliseconds
 */
export function measureDataFetch(): number {
  return measure(
    DashboardMeasures.DATA_FETCH,
    DashboardMarks.DATA_FETCH_START,
    DashboardMarks.DATA_FETCH_END
  )
}

/**
 * Track metrics rendering performance
 * 
 * @returns Duration in milliseconds
 */
export function measureMetricsRender(): number {
  return measure(
    DashboardMeasures.METRICS_RENDER,
    DashboardMarks.METRICS_RENDER_START,
    DashboardMarks.METRICS_RENDER_END
  )
}

/**
 * Track charts rendering performance
 * 
 * @returns Duration in milliseconds
 */
export function measureChartsRender(): number {
  return measure(
    DashboardMeasures.CHARTS_RENDER,
    DashboardMarks.CHARTS_RENDER_START,
    DashboardMarks.CHARTS_RENDER_END
  )
}

/**
 * Track user interaction performance
 * 
 * @returns Duration in milliseconds
 */
export function measureInteraction(): number {
  return measure(
    DashboardMeasures.INTERACTION,
    DashboardMarks.INTERACTION_START,
    DashboardMarks.INTERACTION_END
  )
}

/**
 * Track counter animation performance
 * 
 * @returns Duration in milliseconds
 */
export function measureCounterAnimation(): number {
  return measure(
    DashboardMeasures.COUNTER_ANIMATION,
    DashboardMarks.COUNTER_ANIMATION_START,
    DashboardMarks.COUNTER_ANIMATION_END
  )
}

/**
 * Get all dashboard performance metrics
 * 
 * @returns Object with all dashboard timing metrics
 */
export function getDashboardMetrics() {
  if (typeof window === 'undefined') {
    return null
  }

  const metrics = {
    dataFetch: 0,
    metricsRender: 0,
    chartsRender: 0,
    totalLoad: 0,
  }

  try {
    // Get all measures
    const entries = performance.getEntriesByType('measure')
    
    entries.forEach((entry) => {
      switch (entry.name) {
        case DashboardMeasures.DATA_FETCH:
          metrics.dataFetch = entry.duration
          break
        case DashboardMeasures.METRICS_RENDER:
          metrics.metricsRender = entry.duration
          break
        case DashboardMeasures.CHARTS_RENDER:
          metrics.chartsRender = entry.duration
          break
        case DashboardMeasures.TOTAL_LOAD:
          metrics.totalLoad = entry.duration
          break
      }
    })
  } catch (error) {
    console.warn('Failed to get dashboard metrics:', error)
  }

  return metrics
}

/**
 * Log dashboard performance metrics to console (development only)
 */
export function logDashboardPerformance() {
  if (process.env.NODE_ENV !== 'development') return

  const metrics = getDashboardMetrics()
  
  if (!metrics) return

  console.group('📊 Dashboard Performance Metrics')
  console.log(`Data Fetch: ${metrics.dataFetch.toFixed(2)}ms`)
  console.log(`Metrics Render: ${metrics.metricsRender.toFixed(2)}ms`)
  console.log(`Charts Render: ${metrics.chartsRender.toFixed(2)}ms`)
  console.log(`Total Load: ${metrics.totalLoad.toFixed(2)}ms`)
  console.groupEnd()
}

/**
 * Report dashboard performance to analytics
 * 
 * @param metrics - Dashboard performance metrics
 */
export function reportDashboardPerformance(metrics: ReturnType<typeof getDashboardMetrics>) {
  if (!metrics) return

  // Send to analytics service
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'dashboard_performance', {
      event_category: 'Performance',
      data_fetch_time: Math.round(metrics.dataFetch),
      metrics_render_time: Math.round(metrics.metricsRender),
      charts_render_time: Math.round(metrics.chartsRender),
      total_load_time: Math.round(metrics.totalLoad),
    })
  }
}

/**
 * Performance budget thresholds for dashboard (in milliseconds)
 */
export const PERFORMANCE_BUDGET = {
  DATA_FETCH: 1000, // Max 1s for data fetch
  METRICS_RENDER: 100, // Max 100ms for metrics render
  CHARTS_RENDER: 300, // Max 300ms for charts render
  INTERACTION: 100, // Max 100ms for interactions
  COUNTER_ANIMATION: 1000, // Max 1s for counter animations
  TOTAL_LOAD: 2500, // Max 2.5s for total dashboard load
} as const

/**
 * Check if performance meets budget requirements
 * 
 * @param metrics - Dashboard performance metrics
 * @returns Object indicating which metrics are within budget
 */
export function checkPerformanceBudget(metrics: ReturnType<typeof getDashboardMetrics>) {
  if (!metrics) return null

  return {
    dataFetch: metrics.dataFetch <= PERFORMANCE_BUDGET.DATA_FETCH,
    metricsRender: metrics.metricsRender <= PERFORMANCE_BUDGET.METRICS_RENDER,
    chartsRender: metrics.chartsRender <= PERFORMANCE_BUDGET.CHARTS_RENDER,
    totalLoad: metrics.totalLoad <= PERFORMANCE_BUDGET.TOTAL_LOAD,
    allPassed:
      metrics.dataFetch <= PERFORMANCE_BUDGET.DATA_FETCH &&
      metrics.metricsRender <= PERFORMANCE_BUDGET.METRICS_RENDER &&
      metrics.chartsRender <= PERFORMANCE_BUDGET.CHARTS_RENDER &&
      metrics.totalLoad <= PERFORMANCE_BUDGET.TOTAL_LOAD,
  }
}

/**
 * Log performance budget warnings
 */
export function logPerformanceBudgetWarnings() {
  if (process.env.NODE_ENV !== 'development') return

  const metrics = getDashboardMetrics()
  if (!metrics) return

  const budget = checkPerformanceBudget(metrics)
  if (!budget || budget.allPassed) return

  console.group('⚠️ Performance Budget Warnings')
  
  if (!budget.dataFetch) {
    console.warn(
      `Data Fetch: ${metrics.dataFetch.toFixed(2)}ms exceeds budget of ${PERFORMANCE_BUDGET.DATA_FETCH}ms`
    )
  }
  
  if (!budget.metricsRender) {
    console.warn(
      `Metrics Render: ${metrics.metricsRender.toFixed(2)}ms exceeds budget of ${PERFORMANCE_BUDGET.METRICS_RENDER}ms`
    )
  }
  
  if (!budget.chartsRender) {
    console.warn(
      `Charts Render: ${metrics.chartsRender.toFixed(2)}ms exceeds budget of ${PERFORMANCE_BUDGET.CHARTS_RENDER}ms`
    )
  }
  
  if (!budget.totalLoad) {
    console.warn(
      `Total Load: ${metrics.totalLoad.toFixed(2)}ms exceeds budget of ${PERFORMANCE_BUDGET.TOTAL_LOAD}ms`
    )
  }
  
  console.groupEnd()
}
