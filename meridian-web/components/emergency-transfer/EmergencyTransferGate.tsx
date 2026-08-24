'use client'

/**
 * EmergencyTransferGate
 *
 * Wraps any trigger element and renders a contextual unavailability notice
 * when the emergency-transfer action cannot be taken.  When the action IS
 * available it simply renders `children` unchanged.
 *
 * The three blocking conditions are:
 *  1. No config supplied (`config === null`)
 *  2. Policy / authorisation not satisfied (`config.authorizedBy === null`)
 *  3. Config is expired
 *
 * The gate renders a visually distinct, accessible notice for each case so
 * operators understand exactly why the button is disabled — without exposing
 * sensitive authorisation detail to end-users (the messages are intentionally
 * generic).
 */

import * as React from 'react'
import { Ban, Clock, ShieldOff } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { isConfigExpired } from '@/models/emergency-transfer-config'
import type { EmergencyTransferConfig } from '@/models/emergency-transfer-config'

// ---------------------------------------------------------------------------
// Gate reason type
// ---------------------------------------------------------------------------

export type GateBlockReason =
  | 'no_config'
  | 'unauthorized'
  | 'expired'
  | null // null = available

function computeBlockReason(
  config: EmergencyTransferConfig | null,
  getNow: () => number,
): GateBlockReason {
  if (!config) return 'no_config'
  if (!config.authorizedBy) return 'unauthorized'
  if (isConfigExpired(config, getNow())) return 'expired'
  return null
}

// ---------------------------------------------------------------------------
// Unavailable notice sub-component
// ---------------------------------------------------------------------------

interface UnavailableNoticeProps {
  reason: Exclude<GateBlockReason, null>
  className?: string
}

const NOTICE_CONTENT: Record<
  Exclude<GateBlockReason, null>,
  { icon: React.ReactNode; title: string; description: string }
> = {
  no_config: {
    icon: <Ban className="size-4" aria-hidden />,
    title: 'Emergency transfer unavailable',
    description:
      'No transfer configuration is present. Contact your administrator.',
  },
  unauthorized: {
    icon: <ShieldOff className="size-4" aria-hidden />,
    title: 'Not authorised',
    description:
      'Emergency transfer policy is not satisfied. Ensure the required approval has been granted before proceeding.',
  },
  expired: {
    icon: <Clock className="size-4" aria-hidden />,
    title: 'Configuration expired',
    description:
      'The transfer configuration has passed its expiry time. A new authorisation is required.',
  },
}

function UnavailableNotice({ reason, className }: UnavailableNoticeProps) {
  const content = NOTICE_CONTENT[reason]
  return (
    <Alert
      variant="destructive"
      className={cn('max-w-lg', className)}
      role="status"
      aria-live="polite"
      data-testid={`et-gate-notice-${reason}`}
    >
      {content.icon}
      <AlertTitle>{content.title}</AlertTitle>
      <AlertDescription>{content.description}</AlertDescription>
    </Alert>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface EmergencyTransferGateProps {
  /** Current transfer config. Pass `null` when none is loaded. */
  config: EmergencyTransferConfig | null
  /** Override for "now" — useful in tests. */
  getNow?: () => number
  /**
   * Content to render when the action IS available.
   * Typically a trigger `<Button>` that opens the dialog.
   */
  children: React.ReactNode
  /**
   * Optional slot rendered when the gate is BLOCKED, in addition to the
   * built-in notice.  Use this to render a disabled version of the trigger
   * so the layout does not shift.
   */
  blockedSlot?: React.ReactNode
  className?: string
}

export function EmergencyTransferGate({
  config,
  getNow = Date.now,
  children,
  blockedSlot,
  className,
}: EmergencyTransferGateProps) {
  const blockReason = computeBlockReason(config, getNow)
  const isBlocked = blockReason !== null

  return (
    <div
      className={cn('flex flex-col gap-3', className)}
      data-testid="et-gate"
      data-available={String(!isBlocked)}
    >
      {isBlocked ? (
        <>
          <UnavailableNotice reason={blockReason} />
          {blockedSlot}
        </>
      ) : (
        children
      )}
    </div>
  )
}

// Re-export for consumers that want to compute the reason independently.
export { computeBlockReason }
export type { GateBlockReason }
