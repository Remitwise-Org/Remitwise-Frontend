import { Suspense } from 'react'
import { Metadata } from 'next'
import { Activity, TrendingUp, Users, DollarSign } from 'lucide-react'

import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics'
import { DashboardCharts } from '@/components/dashboard/dashboard-charts'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { DashboardSkeleton } from '@/components/dashboard/dashboard-skeleton'
import { fetchDashboardData } from '@/lib/api/dashboard'

export const metadata: Metadata = {
  title: 'Dashboard | Meridians',
  description: 'Real-time productivity metrics and analytics dashboard',
}

// Enable ISR with revalidation
export const revalidate = 30 // Revalidate every 30 seconds

/**
 * Main Dashboard Page - Server Component
 * 
 * This page implements SSR for initial fast paint with structural skeletons,
 * then hydrates with real-time data on the client via polling/WebSocket.
 * 
 * Architecture:
 * - Server: Fetch initial data, render structure
 * - Client: Hydrate with real-time updates via hooks
 * - Offline: Cache data in localStorage, display stale indicator
 */
export default async function DashboardPage() {
  // Fetch initial data on the server for fast first paint
  const initialData = await fetchDashboardData()

  return (
    <div className="container mx-auto py-6 space-y-8">
      {/* Dashboard Header */}
      <DashboardHeader />

      {/* Metrics Cards - Server-rendered structure with client hydration */}
      <Suspense fallback={<DashboardSkeleton variant="metrics" />}>
        <DashboardMetrics initialData={initialData} />
      </Suspense>

      {/* Charts Section - Server-rendered structure with client hydration */}
      <Suspense fallback={<DashboardSkeleton variant="charts" />}>
        <DashboardCharts initialData={initialData} />
      </Suspense>
    </div>
  )
}
