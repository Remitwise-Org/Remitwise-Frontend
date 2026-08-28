'use client'

import { useMemo } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { useDashboardData } from '@/hooks/use-dashboard-data'
import { DashboardData } from '@/lib/api/dashboard'

interface DashboardChartsProps {
  initialData: DashboardData
}

/**
 * Dashboard Charts Component
 * 
 * Renders interactive, accessible charts with real-time data.
 * 
 * Features:
 * - Responsive chart layouts
 * - Theme-aware colors
 * - Accessible chart tooltips
 * - Real-time data updates
 * - Zero layout shift (explicit aspect ratios)
 */
export function DashboardCharts({ initialData }: DashboardChartsProps) {
  const { data } = useDashboardData({
    initialData,
    pollingInterval: 10000,
  })

  const charts = data?.charts || initialData.charts

  // Transform data for charts
  const userActivityData = useMemo(
    () =>
      charts.userActivity.map((point) => ({
        time: new Date(point.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }),
        users: point.value,
      })),
    [charts.userActivity]
  )

  const conversionFunnelData = useMemo(
    () =>
      charts.conversionFunnel.map((point) => ({
        stage: point.label || point.timestamp,
        count: point.value,
      })),
    [charts.conversionFunnel]
  )

  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-7"
      role="region"
      aria-label="Dashboard charts"
    >
      {/* User Activity Chart */}
      <Card className="col-span-full lg:col-span-4">
        <CardHeader>
          <CardTitle>User Activity</CardTitle>
          <CardDescription>
            Active users over the last 24 hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              users: {
                label: 'Active Users',
                color: 'hsl(var(--chart-1))',
              },
            }}
            className="h-[350px]"
          >
            <AreaChart
              data={userActivityData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                className="text-xs"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value}`}
                className="text-xs"
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[150px]"
                    nameKey="users"
                    labelFormatter={(value) => `Time: ${value}`}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="hsl(var(--chart-1))"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Conversion Funnel Chart */}
      <Card className="col-span-full lg:col-span-3">
        <CardHeader>
          <CardTitle>Conversion Funnel</CardTitle>
          <CardDescription>
            User journey from visitor to conversion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              count: {
                label: 'Users',
                color: 'hsl(var(--chart-2))',
              },
            }}
            className="h-[350px]"
          >
            <BarChart
              data={conversionFunnelData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="stage"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                className="text-xs"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `${value}`}
                className="text-xs"
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    className="w-[150px]"
                    nameKey="count"
                  />
                }
              />
              <Bar
                dataKey="count"
                fill="hsl(var(--chart-2))"
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
