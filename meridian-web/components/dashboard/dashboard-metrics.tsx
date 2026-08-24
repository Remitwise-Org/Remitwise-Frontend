'use client'

import { useEffect, useState } from 'react'
import { Activity, TrendingUp, Users, DollarSign, Wifi, WifiOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDashboardData } from '@/hooks/use-dashboard-data'
import { DashboardData } from '@/lib/api/dashboard'
import { AnimatedCounter } from './animated-counter'
import { cn } from '@/lib/utils'

interface DashboardMetricsProps {
  initialData: DashboardData
}

const iconMap = {
  users: Users,
  'dollar-sign': DollarSign,
  'trending-up': TrendingUp,
  activity: Activity,
}

/**
 * Dashboard Metrics Component
 * 
 * Displays animated metric cards with real-time updates.
 * 
 * Features:
 * - Smooth number interpolation on mount and updates
 * - Real-time polling with offline fallback
 * - Visual indicator for offline/cached state
 * - Zero layout shift (uses server data initially)
 * - Accessible ARIA live regions for updates
 */
export function DashboardMetrics({ initialData }: DashboardMetricsProps) {
  const { data, isOffline, lastUpdated } = useDashboardData({
    initialData,
    pollingInterval: 10000, // 10 seconds
  })

  const metrics = data?.metrics || initialData.metrics

  return (
    <div className="space-y-4">
      {/* Offline Indicator */}
      {isOffline && (
        <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950">
          <div className="flex items-center gap-2">
            <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <p className="text-sm text-amber-800 dark:text-amber-300">
              You're offline. Displaying cached data.
            </p>
          </div>
          {lastUpdated && (
            <Badge variant="outline" className="text-xs">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </Badge>
          )}
        </div>
      )}

      {/* Metrics Grid */}
      <div 
        className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
        role="region"
        aria-label="Dashboard metrics"
        aria-live="polite"
        aria-atomic="false"
      >
        <MetricCard
          label={metrics.activeUsers.label}
          value={metrics.activeUsers.value}
          delta={metrics.activeUsers.delta}
          deltaType={metrics.activeUsers.deltaType}
          icon={iconMap[metrics.activeUsers.icon as keyof typeof iconMap]}
          unit={metrics.activeUsers.unit}
        />
        <MetricCard
          label={metrics.totalRevenue.label}
          value={metrics.totalRevenue.value}
          delta={metrics.totalRevenue.delta}
          deltaType={metrics.totalRevenue.deltaType}
          icon={iconMap[metrics.totalRevenue.icon as keyof typeof iconMap]}
          unit={metrics.totalRevenue.unit}
          prefix={metrics.totalRevenue.unit === '$' ? '$' : undefined}
        />
        <MetricCard
          label={metrics.conversionRate.label}
          value={metrics.conversionRate.value}
          delta={metrics.conversionRate.delta}
          deltaType={metrics.conversionRate.deltaType}
          icon={iconMap[metrics.conversionRate.icon as keyof typeof iconMap]}
          unit={metrics.conversionRate.unit}
          suffix={metrics.conversionRate.unit === '%' ? '%' : undefined}
          decimals={2}
        />
        <MetricCard
          label={metrics.avgSessionDuration.label}
          value={metrics.avgSessionDuration.value}
          delta={metrics.avgSessionDuration.delta}
          deltaType={metrics.avgSessionDuration.deltaType}
          icon={iconMap[metrics.avgSessionDuration.icon as keyof typeof iconMap]}
          unit={metrics.avgSessionDuration.unit}
          suffix="s"
        />
      </div>
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: number
  delta: number
  deltaType: 'positive' | 'negative' | 'neutral'
  icon: React.ComponentType<{ className?: string }>
  unit?: string
  prefix?: string
  suffix?: string
  decimals?: number
}

function MetricCard({
  label,
  value,
  delta,
  deltaType,
  icon: Icon,
  prefix,
  suffix,
  decimals = 0,
}: MetricCardProps) {
  const deltaColor = {
    positive: 'text-emerald-600 dark:text-emerald-400',
    negative: 'text-rose-600 dark:text-rose-400',
    neutral: 'text-muted-foreground',
  }

  const deltaIcon = delta >= 0 ? '↑' : '↓'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          {prefix}
          <AnimatedCounter value={value} decimals={decimals} />
          {suffix}
        </div>
        <p className={cn('text-xs mt-1 flex items-center gap-1', deltaColor[deltaType])}>
          <span aria-hidden="true">{deltaIcon}</span>
          <span>
            {Math.abs(delta).toFixed(1)}% from last period
          </span>
        </p>
      </CardContent>
    </Card>
  )
}
