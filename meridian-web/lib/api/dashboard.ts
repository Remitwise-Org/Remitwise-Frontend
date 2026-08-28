/**
 * Dashboard API Client
 * 
 * Handles data fetching for dashboard metrics with:
 * - Server-side fetching for SSR
 * - Client-side polling for real-time updates
 * - Error handling and fallbacks
 */

export interface DashboardMetric {
  id: string
  label: string
  value: number
  delta: number
  deltaType: 'positive' | 'negative' | 'neutral'
  unit?: string
  icon?: string
}

export interface ChartDataPoint {
  timestamp: string
  value: number
  label?: string
}

export interface DashboardData {
  metrics: {
    activeUsers: DashboardMetric
    totalRevenue: DashboardMetric
    conversionRate: DashboardMetric
    avgSessionDuration: DashboardMetric
  }
  charts: {
    userActivity: ChartDataPoint[]
    revenueOverTime: ChartDataPoint[]
    conversionFunnel: ChartDataPoint[]
  }
  lastUpdated: string
}

/**
 * Fetch dashboard data from API
 * Used for both server-side and client-side fetching
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    // In production, replace with actual API endpoint
    // const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/dashboard`, {
    //   cache: 'no-store', // For fresh data on each request
    // })
    
    // For now, return mock data that simulates real API response
    return generateMockDashboardData()
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
    
    // Return fallback data instead of throwing
    return generateMockDashboardData()
  }
}

/**
 * Generate mock dashboard data
 * Replace this with actual API call in production
 */
function generateMockDashboardData(): DashboardData {
  const now = new Date()
  
  return {
    metrics: {
      activeUsers: {
        id: 'active-users',
        label: 'Active Users',
        value: 2543,
        delta: 12.5,
        deltaType: 'positive',
        unit: 'users',
        icon: 'users',
      },
      totalRevenue: {
        id: 'total-revenue',
        label: 'Total Revenue',
        value: 54320,
        delta: 8.2,
        deltaType: 'positive',
        unit: '$',
        icon: 'dollar-sign',
      },
      conversionRate: {
        id: 'conversion-rate',
        label: 'Conversion Rate',
        value: 3.24,
        delta: -1.4,
        deltaType: 'negative',
        unit: '%',
        icon: 'trending-up',
      },
      avgSessionDuration: {
        id: 'avg-session',
        label: 'Avg. Session',
        value: 245,
        delta: 5.8,
        deltaType: 'positive',
        unit: 'sec',
        icon: 'activity',
      },
    },
    charts: {
      userActivity: generateTimeSeriesData(24, 100, 500),
      revenueOverTime: generateTimeSeriesData(24, 1000, 5000),
      conversionFunnel: [
        { timestamp: 'Visitors', value: 10000, label: 'Visitors' },
        { timestamp: 'Sign Ups', value: 3200, label: 'Sign Ups' },
        { timestamp: 'Active', value: 2543, label: 'Active Users' },
        { timestamp: 'Converted', value: 824, label: 'Converted' },
      ],
    },
    lastUpdated: now.toISOString(),
  }
}

/**
 * Generate time series data for charts
 */
function generateTimeSeriesData(
  points: number,
  min: number,
  max: number
): ChartDataPoint[] {
  const data: ChartDataPoint[] = []
  const now = new Date()
  
  for (let i = points - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000)
    const value = Math.floor(Math.random() * (max - min) + min)
    
    data.push({
      timestamp: timestamp.toISOString(),
      value,
      label: timestamp.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        hour12: false 
      }),
    })
  }
  
  return data
}

/**
 * Client-side polling function
 * Call this from useEffect or React Query
 */
export async function pollDashboardData(): Promise<DashboardData> {
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 1000
  await new Promise(resolve => setTimeout(resolve, jitter))
  
  return fetchDashboardData()
}
