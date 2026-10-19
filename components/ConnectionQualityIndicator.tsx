'use client';

import React from 'react';
import { useSwrQuery } from '@/lib/hooks/useSwrQuery';
import { HEALTH_PING_INTERVAL_MS } from '@/lib/config/swr';
import Tooltip from '@/components/Tooltip';

export default function ConnectionQualityIndicator() {
  const { data, error, isLoading } = useSwrQuery(
    ['health'],
    async () => {
      const res = await fetch('/api/health');
      if (!res.ok) {
        throw new Error('Network response was not ok');
      }
      return res.json();
    },
    {
      refetchInterval: HEALTH_PING_INTERVAL_MS,
    }
  );

  let statusColor = 'bg-white/20';
  let tooltipText = 'Checking connection...';

  if (isLoading) {
    statusColor = 'bg-yellow-400 animate-pulse';
    tooltipText = 'Checking connection...';
  } else if (error || data?.status === 'unhealthy') {
    statusColor = 'bg-red-500';
    tooltipText = 'Connection error';
  } else if (data?.status === 'ok') {
    statusColor = 'bg-green-500';
    tooltipText = 'Connection stable';
  }

  return (
    <Tooltip content={tooltipText} side="top">
      <div 
        className={`w-2.5 h-2.5 rounded-full ${statusColor} transition-colors duration-300`}
        aria-label={tooltipText}
        role="status"
      />
    </Tooltip>
  );
}
