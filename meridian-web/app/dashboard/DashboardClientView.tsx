'use client';

import React from 'react';
import { DashboardData } from '@/lib/api/dashboard';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { DashboardMetrics } from '@/components/dashboard/dashboard-metrics';
import { LeaderboardCard } from '@/components/sections/pool/LeaderboardCard';
import { PoolStats } from '@/components/sections/pool/PoolStats';

export interface DashboardClientViewProps {
  initialData: DashboardData | null;
}

export function DashboardClientView({ initialData }: DashboardClientViewProps) {
  const { data, isLoading, error, refetch } = useDashboardData({
    initialData,
    autoFetch: !initialData,
  });

  return (
    <div className="space-y-8">
      {/* Metric Cards Section */}
      <DashboardMetrics
        metrics={data?.metrics}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <LeaderboardCard />
        </div>
        <div className="space-y-6">
          <PoolStats />
        </div>
      </div>
    </div>
  );
}
