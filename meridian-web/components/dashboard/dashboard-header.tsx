'use client'

import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

/**
 * Dashboard Header Component
 * 
 * Displays the dashboard title and action buttons
 */
export function DashboardHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Real-time metrics and productivity insights
        </p>
      </div>
    </div>
  )
}
