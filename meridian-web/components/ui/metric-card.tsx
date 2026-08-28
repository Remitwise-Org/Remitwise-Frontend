'use client'

import * as React from 'react'
import { Info } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface CardMetricProps extends React.ComponentProps<'article'> {
  icon?: React.ReactNode
  label: string
  value: string
  delta?: string
  deltaVariant?: 'positive' | 'negative' | 'neutral'
  tooltip?: string
}

/**
 * A reusable metric card for homepage stats and dashboards.
 *
 * Example:
 * <CardMetric
 *   icon={<Sparkles className="h-5 w-5" />}
 *   label="Yield Distributed"
 *   value="$500K"
 *   delta="+18% this week"
 *   tooltip="Yield generated from no-loss pools across the network."
 * />
 */
export function CardMetric({
  className,
  icon,
  label,
  value,
  delta,
  deltaVariant = 'neutral',
  tooltip,
  ...props
}: CardMetricProps) {
  const deltaStyles = {
    positive: 'text-emerald-500',
    negative: 'text-rose-500',
    neutral: 'text-muted-foreground',
  } as const

  return (
    <article
      data-slot="card-metric"
      className={cn(
        'group rounded-3xl border border-border bg-card p-6 shadow-sm transition hover:border-primary/50 focus-within:border-primary focus-within:ring-ring/50 focus-within:ring-2 outline-none',
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {icon ? (
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              {icon}
            </div>
          ) : null}

          <div className="space-y-1">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {label}
            </p>
            <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
          </div>
        </div>

        {tooltip ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`${label} details`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-ring/50 focus-visible:ring-2"
              >
                <Info className="h-4 w-4" aria-hidden="true" />
              </button>
            </TooltipTrigger>
            <TooltipContent sideOffset={4}>{tooltip}</TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      {delta ? (
        <p className={cn('mt-6 text-sm font-medium', deltaStyles[deltaVariant])}>{delta}</p>
      ) : null}
    </article>
  )
}

export function CardMetrics({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-metrics"
      className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}
      {...props}
    />
  )
}
