'use client';

import { motion } from 'framer-motion';
import { itemVariants } from '@/lib/animations/variants';
import { CardMetric, CardMetrics } from '@/components/ui/metric-card';
import { Skeleton } from '@/components/ui/skeleton';
import { DollarSign, Percent, RefreshCw, ShieldCheck } from 'lucide-react';
import { usePoolStats } from '@/hooks/usePoolStats';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatsSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      role="status"
      aria-label="Loading pool stats…"
    >
      {[0, 1].map((i) => (
        <div key={i} className="rounded-3xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-11 w-11 rounded-2xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-28 rounded" />
              <Skeleton className="h-8 w-20 rounded" />
            </div>
          </div>
          <Skeleton className="h-4 w-36 rounded" />
        </div>
      ))}
    </div>
  );
}

function StatsError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 space-y-3"
    >
      <p className="text-sm text-destructive font-medium">
        Unable to load pool stats
      </p>
      <p className="text-xs text-muted-foreground">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        <RefreshCw className="h-3 w-3" aria-hidden="true" />
        Retry
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * PoolStats — shows live total pool value and weekly APY fetched from
 * /api/pool/stats. Renders skeletons while loading and an error+retry UI on
 * failure. When the on-chain proof is present a small "verified on-chain"
 * badge is shown below the metrics.
 */
export function PoolStats() {
  const { data, isLoading, isError, error, refetch } = usePoolStats();

  if (isLoading) {
    return (
      <motion.div variants={itemVariants} className="pt-4">
        <StatsSkeleton />
      </motion.div>
    );
  }

  if (isError || !data) {
    return (
      <motion.div variants={itemVariants} className="pt-4">
        <StatsError
          message={error ?? 'An unexpected error occurred.'}
          onRetry={refetch}
        />
      </motion.div>
    );
  }

  const hasPoolValue = Boolean(data.totalPoolValue);
  const hasApy = Boolean(data.weeklyApy);

  return (
    <motion.div variants={itemVariants} className="pt-4 space-y-3">
      <CardMetrics>
        <CardMetric
          icon={<DollarSign className="h-5 w-5" />}
          label="Total Pool Value"
          value={hasPoolValue ? data.totalPoolValue! : '—'}
          delta={data.deltaLabel ?? undefined}
          deltaVariant={data.deltaVariant ?? 'neutral'}
          tooltip="The total value locked in MERIDIAN yield pools across all participants."
        />
        <CardMetric
          icon={<Percent className="h-5 w-5" />}
          label="Weekly APY"
          value={hasApy ? data.weeklyApy! : '—'}
          delta={
            data.totalParticipants != null
              ? `${data.totalParticipants.toLocaleString()} participants`
              : 'Stable payout rate'
          }
          tooltip="Average weekly yield earned by pool contributors, updated with new rewards."
        />
      </CardMetrics>

      {data.onChainProof && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 w-fit"
          title={`On-chain proof: ${data.onChainProof}`}
        >
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" aria-hidden="true" />
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Data verified on-chain
          </span>
          <span className="text-xs text-muted-foreground font-mono truncate max-w-[8rem]">
            {data.onChainProof.slice(0, 8)}…
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
