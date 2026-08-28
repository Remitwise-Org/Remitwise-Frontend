'use client'

/**
 * EmergencyTransferReviewPanel
 *
 * Displays the canonical transfer details (recipient, amount, asset, network,
 * expiry) and requires explicit risk acknowledgement before the caller can
 * proceed to the sign step.
 *
 * Intentionally stateless: all state lives in `useEmergencyTransfer` and is
 * passed in as props so this component is easy to test in isolation.
 */

import * as React from 'react'
import {
  AlertTriangle,
  Clock,
  Network,
  User,
  Coins,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { RISK_ACKNOWLEDGEMENT_TEXT } from '@/lib/validations/emergency-transfer'
import type { EmergencyTransferConfig } from '@/models/emergency-transfer-config'

// ---------------------------------------------------------------------------
// Sub-component: detail row
// ---------------------------------------------------------------------------

interface DetailRowProps {
  icon: React.ReactNode
  label: string
  value: string
  mono?: boolean
  'data-testid'?: string
}

function DetailRow({ icon, label, value, mono, ...rest }: DetailRowProps) {
  return (
    <div
      className="flex items-start gap-3 py-2"
      data-testid={rest['data-testid']}
    >
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
          {label}
        </p>
        <p
          className={cn(
            'text-foreground break-all text-sm font-semibold',
            mono && 'font-mono',
          )}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-component: expiry countdown
// ---------------------------------------------------------------------------

interface ExpiryBadgeProps {
  msUntilExpiry: number
}

function ExpiryBadge({ msUntilExpiry }: ExpiryBadgeProps) {
  const seconds = Math.floor(msUntilExpiry / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSecs = seconds % 60

  const isUrgent = seconds < 60
  const display =
    seconds <= 0
      ? 'Expired'
      : minutes > 0
        ? `${minutes}m ${remainingSecs}s`
        : `${seconds}s`

  return (
    <Badge
      variant={isUrgent ? 'destructive' : 'secondary'}
      className="gap-1 tabular-nums"
      data-testid="et-expiry-badge"
    >
      <Clock className="size-3" aria-hidden />
      {display}
    </Badge>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface EmergencyTransferReviewPanelProps {
  config: EmergencyTransferConfig
  riskAcknowledged: boolean
  msUntilExpiry: number
  onAcknowledgeChange: (checked: boolean) => void
  onConfirm: () => void
  onDismiss: () => void
  /** Disable the confirm button externally (e.g. during parent async work). */
  confirmDisabled?: boolean
  className?: string
}

export function EmergencyTransferReviewPanel({
  config,
  riskAcknowledged,
  msUntilExpiry,
  onAcknowledgeChange,
  onConfirm,
  onDismiss,
  confirmDisabled = false,
  className,
}: EmergencyTransferReviewPanelProps) {
  const isExpired = msUntilExpiry <= 0

  const networkLabel: Record<string, string> = {
    ethereum: 'Ethereum Mainnet',
    polygon: 'Polygon',
    arbitrum: 'Arbitrum One',
    optimism: 'Optimism',
    base: 'Base',
    solana: 'Solana',
    stellar: 'Stellar',
  }

  const handleCheckboxChange = React.useCallback(
    (checked: boolean | 'indeterminate') => {
      onAcknowledgeChange(checked === true)
    },
    [onAcknowledgeChange],
  )

  return (
    <section
      className={cn('flex flex-col gap-4', className)}
      aria-label="Emergency transfer review"
      data-testid="et-review-panel"
    >
      {/* Header warning */}
      <Alert variant="destructive" data-testid="et-warning-alert">
        <ShieldAlert className="size-4" aria-hidden />
        <AlertTitle>Emergency Transfer — Review Carefully</AlertTitle>
        <AlertDescription>
          This action is irreversible. Verify every detail below before
          proceeding. The confirmation is bound to exactly these values.
        </AlertDescription>
      </Alert>

      {/* Expiry */}
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm font-medium">
          Review expires in
        </span>
        <ExpiryBadge msUntilExpiry={msUntilExpiry} />
      </div>

      <Separator />

      {/* Transfer details — canonical values */}
      <div
        role="list"
        aria-label="Transfer details"
        data-testid="et-details"
      >
        <DetailRow
          icon={<User className="size-4" aria-hidden />}
          label="Recipient"
          value={config.recipient}
          mono
          data-testid="et-detail-recipient"
        />
        <Separator className="my-1" />
        <DetailRow
          icon={<Coins className="size-4" aria-hidden />}
          label="Amount"
          value={`${config.amountDisplay} ${config.asset.symbol}`}
          data-testid="et-detail-amount"
        />
        <Separator className="my-1" />
        <DetailRow
          icon={<Network className="size-4" aria-hidden />}
          label="Network"
          value={networkLabel[config.networkId] ?? config.networkId}
          data-testid="et-detail-network"
        />
        <Separator className="my-1" />
        <DetailRow
          icon={<Coins className="size-4" aria-hidden />}
          label="Asset contract"
          value={
            config.asset.contractAddress
              ? config.asset.contractAddress
              : 'Native asset'
          }
          mono
          data-testid="et-detail-contract"
        />
        {config.memo && (
          <>
            <Separator className="my-1" />
            <DetailRow
              icon={<AlertTriangle className="size-4" aria-hidden />}
              label="Memo"
              value={config.memo}
              data-testid="et-detail-memo"
            />
          </>
        )}
      </div>

      <Separator />

      {/* Authorisation display */}
      {config.authorizedBy && (
        <div className="flex items-center gap-2 text-sm" data-testid="et-authorized-by">
          <CheckCircle2 className="text-green-500 size-4 shrink-0" aria-hidden />
          <span className="text-muted-foreground">
            Authorised by{' '}
            <span className="text-foreground font-semibold">
              {config.authorizedBy}
            </span>
          </span>
        </div>
      )}

      <Separator />

      {/* Risk acknowledgement checkbox */}
      <div
        className={cn(
          'rounded-md border p-4',
          riskAcknowledged
            ? 'border-green-500/40 bg-green-500/5'
            : 'border-destructive/40 bg-destructive/5',
        )}
        data-testid="et-acknowledge-container"
      >
        <label
          htmlFor="et-risk-acknowledge"
          className="flex cursor-pointer items-start gap-3"
        >
          <Checkbox
            id="et-risk-acknowledge"
            checked={riskAcknowledged}
            onCheckedChange={handleCheckboxChange}
            disabled={isExpired}
            aria-required
            aria-describedby="et-risk-text"
            data-testid="et-acknowledge-checkbox"
          />
          <span
            id="et-risk-text"
            className="text-sm leading-relaxed"
          >
            {RISK_ACKNOWLEDGEMENT_TEXT}
          </span>
        </label>
      </div>

      {/* Expired overlay message */}
      {isExpired && (
        <Alert variant="destructive" data-testid="et-expired-alert">
          <Clock className="size-4" aria-hidden />
          <AlertTitle>Session Expired</AlertTitle>
          <AlertDescription>
            The review window has closed. Close this panel and start a new
            review.
          </AlertDescription>
        </Alert>
      )}

      {/* Action buttons */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          onClick={onDismiss}
          data-testid="et-dismiss-btn"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={!riskAcknowledged || isExpired || confirmDisabled}
          aria-disabled={!riskAcknowledged || isExpired || confirmDisabled}
          data-testid="et-confirm-btn"
        >
          <ShieldAlert className="size-4" aria-hidden />
          Confirm &amp; Proceed to Sign
        </Button>
      </div>
    </section>
  )
}
