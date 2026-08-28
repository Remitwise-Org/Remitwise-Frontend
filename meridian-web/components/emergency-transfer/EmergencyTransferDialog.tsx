'use client'

/**
 * EmergencyTransferDialog
 *
 * Full two-step dialog that orchestrates the emergency-transfer flow:
 *
 *   Step 1 — Review   : EmergencyTransferReviewPanel (risk acknowledgement)
 *   Step 2 — Sign     : Bound confirmation display + submit button
 *
 * The dialog is the sole consumer of `useEmergencyTransfer`.  It passes only
 * the necessary callbacks down to child components — no raw state escapes
 * this boundary.
 *
 * Closing the dialog in any non-terminal phase calls `dismiss()` so the hook
 * resets and the audit log records a DISMISSED event.
 */

import * as React from 'react'
import {
  CheckCircle2,
  Loader2,
  ShieldAlert,
  TriangleAlert,
  XCircle,
} from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { EmergencyTransferGate } from './EmergencyTransferGate'
import { EmergencyTransferReviewPanel } from './EmergencyTransferReviewPanel'
import {
  useEmergencyTransfer,
  type TransferProvider,
} from '@/hooks/useEmergencyTransfer'
import type { EmergencyTransferConfig } from '@/models/emergency-transfer-config'
import type { ConfirmationPayload } from '@/lib/validations/emergency-transfer'

// ---------------------------------------------------------------------------
// Step 2: Bound confirmation panel
// ---------------------------------------------------------------------------

interface BoundConfirmationPanelProps {
  payload: ConfirmationPayload
  onSubmit: () => void
  onDismiss: () => void
  isSubmitting: boolean
  errorMessage: string | null
}

const NETWORK_LABELS: Record<string, string> = {
  ethereum: 'Ethereum Mainnet',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum One',
  optimism: 'Optimism',
  base: 'Base',
  solana: 'Solana',
  stellar: 'Stellar',
}

function BoundConfirmationPanel({
  payload,
  onSubmit,
  onDismiss,
  isSubmitting,
  errorMessage,
}: BoundConfirmationPanelProps) {
  return (
    <section
      className="flex flex-col gap-4"
      aria-label="Bound confirmation details"
      data-testid="et-bound-panel"
    >
      <Alert variant="destructive" data-testid="et-sign-warning">
        <ShieldAlert className="size-4" aria-hidden />
        <AlertTitle>Final confirmation — this action cannot be undone</AlertTitle>
        <AlertDescription>
          The details below are cryptographically bound to this operation. Any
          change will invalidate this confirmation.
        </AlertDescription>
      </Alert>

      {/* Binding key — visible for audit/debugging */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Binding key</span>
        <code
          className="bg-muted rounded px-2 py-0.5 font-mono text-xs"
          data-testid="et-binding-key"
        >
          {payload.bindingKey}
        </code>
      </div>

      <Separator />

      {/* Bound fields — read-only, cannot be edited at this step */}
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground font-medium">Recipient</dt>
        <dd
          className="break-all font-mono font-semibold"
          data-testid="et-bound-recipient"
        >
          {payload.recipient}
        </dd>

        <dt className="text-muted-foreground font-medium">Amount</dt>
        <dd className="font-semibold" data-testid="et-bound-amount">
          {payload.amountDisplay} {payload.asset.symbol}
        </dd>

        <dt className="text-muted-foreground font-medium">Network</dt>
        <dd className="font-semibold" data-testid="et-bound-network">
          {NETWORK_LABELS[payload.networkId] ?? payload.networkId}
        </dd>

        <dt className="text-muted-foreground font-medium">Asset</dt>
        <dd
          className="break-all font-mono text-xs font-semibold"
          data-testid="et-bound-asset"
        >
          {payload.asset.contractAddress || 'Native'}
        </dd>

        {payload.memo && (
          <>
            <dt className="text-muted-foreground font-medium">Memo</dt>
            <dd className="font-semibold" data-testid="et-bound-memo">
              {payload.memo}
            </dd>
          </>
        )}

        <dt className="text-muted-foreground font-medium">Authorised by</dt>
        <dd className="font-semibold" data-testid="et-bound-auth">
          {payload.authorizedBy ?? '—'}
        </dd>
      </dl>

      <Separator />

      <Badge
        variant="outline"
        className="w-fit gap-1 text-xs"
        data-testid="et-risk-confirmed-badge"
      >
        <CheckCircle2 className="size-3 text-green-500" aria-hidden />
        Risk acknowledged
      </Badge>

      {/* Provider error */}
      {errorMessage && (
        <Alert variant="destructive" data-testid="et-submit-error">
          <XCircle className="size-4" aria-hidden />
          <AlertTitle>Transfer failed</AlertTitle>
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <DialogFooter>
        <Button
          variant="outline"
          onClick={onDismiss}
          disabled={isSubmitting}
          data-testid="et-sign-dismiss-btn"
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onSubmit}
          disabled={isSubmitting}
          aria-busy={isSubmitting}
          data-testid="et-submit-btn"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Submitting…
            </>
          ) : (
            <>
              <ShieldAlert className="size-4" aria-hidden />
              Execute Emergency Transfer
            </>
          )}
        </Button>
      </DialogFooter>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Terminal state panels
// ---------------------------------------------------------------------------

function SuccessPanel({
  txHash,
  onClose,
}: {
  txHash: string
  onClose: () => void
}) {
  return (
    <section
      className="flex flex-col items-center gap-4 py-4 text-center"
      data-testid="et-success-panel"
    >
      <CheckCircle2 className="size-12 text-green-500" aria-hidden />
      <div>
        <p className="text-lg font-semibold">Transfer submitted</p>
        <p className="text-muted-foreground mt-1 text-sm">
          The emergency transfer has been accepted by the provider.
        </p>
      </div>
      <code
        className="bg-muted rounded px-3 py-1 font-mono text-xs break-all"
        data-testid="et-tx-hash"
      >
        {txHash}
      </code>
      <Button onClick={onClose} data-testid="et-success-close-btn">
        Close
      </Button>
    </section>
  )
}

function BlockedPanel({
  reason,
  onClose,
}: {
  reason: string
  onClose: () => void
}) {
  return (
    <section
      className="flex flex-col gap-4"
      data-testid="et-blocked-panel"
    >
      <Alert variant="destructive">
        <TriangleAlert className="size-4" aria-hidden />
        <AlertTitle>Transfer unavailable</AlertTitle>
        <AlertDescription>{reason}</AlertDescription>
      </Alert>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} data-testid="et-blocked-close-btn">
          Close
        </Button>
      </DialogFooter>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

export interface EmergencyTransferDialogProps {
  /** Controls dialog open state from the parent. */
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Current transfer config. */
  config: EmergencyTransferConfig | null
  /** Async provider that executes the transfer. */
  provider: TransferProvider
  /** Optional override for "now" — useful in tests. */
  getNow?: () => number
}

export function EmergencyTransferDialog({
  open,
  onOpenChange,
  config,
  provider,
  getNow,
}: EmergencyTransferDialogProps) {
  const {
    state,
    isAvailable,
    canConfirm,
    canSubmit,
    startReview,
    setRiskAcknowledged,
    bindConfirmation,
    submit,
    dismiss,
    msUntilExpiry,
  } = useEmergencyTransfer({ config, provider, getNow })

  // Payload reference for step 2 — only valid after `bindConfirmation` is called.
  const [boundPayload, setBoundPayload] =
    React.useState<ConfirmationPayload | null>(null)

  // Start review automatically when dialog opens and action is available.
  React.useEffect(() => {
    if (open && isAvailable && state.phase === 'idle') {
      startReview()
    }
    if (!open) {
      setBoundPayload(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isAvailable])

  // Handle dialog close via overlay click / Escape key.
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      if (!next) {
        if (
          state.phase !== 'succeeded' &&
          state.phase !== 'idle'
        ) {
          dismiss()
        }
        setBoundPayload(null)
      }
      onOpenChange(next)
    },
    [state.phase, dismiss, onOpenChange],
  )

  // Step 1 → Step 2 transition.
  const handleConfirm = React.useCallback(() => {
    const payload = bindConfirmation()
    if (payload) {
      setBoundPayload(payload)
    }
  }, [bindConfirmation])

  const handleSubmit = React.useCallback(async () => {
    await submit()
  }, [submit])

  const handleDismiss = React.useCallback(() => {
    dismiss()
    setBoundPayload(null)
    onOpenChange(false)
  }, [dismiss, onOpenChange])

  // Determine dialog title based on phase.
  const dialogTitle = (() => {
    switch (state.phase) {
      case 'reviewing':
        return 'Emergency Transfer — Review'
      case 'confirmed':
        return 'Emergency Transfer — Sign'
      case 'submitting':
        return 'Emergency Transfer — Submitting…'
      case 'succeeded':
        return 'Emergency Transfer — Complete'
      default:
        return 'Emergency Transfer'
    }
  })()

  const isTerminal =
    state.phase === 'expired' ||
    state.phase === 'config_changed' ||
    state.phase === 'unauthorized' ||
    state.phase === 'dismissed'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={state.phase !== 'submitting'}
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        data-testid="et-dialog"
      >
        <DialogHeader>
          <DialogTitle data-testid="et-dialog-title">{dialogTitle}</DialogTitle>
          <DialogDescription className="sr-only">
            Emergency transfer flow. Review all details carefully before
            confirming.
          </DialogDescription>
        </DialogHeader>

        {/* ---- Gate: show unavailable notice when policy not met ---- */}
        {!isAvailable && state.phase === 'idle' && (
          <EmergencyTransferGate config={config} getNow={getNow}>
            {/* children never rendered because gate is blocked */}
            <></>
          </EmergencyTransferGate>
        )}

        {/* ---- Step 1: Review ---- */}
        {state.phase === 'reviewing' && config && (
          <EmergencyTransferReviewPanel
            config={config}
            riskAcknowledged={state.riskAcknowledged}
            msUntilExpiry={msUntilExpiry}
            onAcknowledgeChange={setRiskAcknowledged}
            onConfirm={handleConfirm}
            onDismiss={handleDismiss}
            confirmDisabled={!canConfirm}
          />
        )}

        {/* ---- Step 2: Bound confirmation ---- */}
        {(state.phase === 'confirmed' || state.phase === 'submitting') &&
          boundPayload && (
            <BoundConfirmationPanel
              payload={boundPayload}
              onSubmit={handleSubmit}
              onDismiss={handleDismiss}
              isSubmitting={state.phase === 'submitting'}
              errorMessage={null}
            />
          )}

        {/* ---- Failed state (reshow sign panel with error) ---- */}
        {state.phase === 'failed' && boundPayload && (
          <BoundConfirmationPanel
            payload={boundPayload}
            onSubmit={handleSubmit}
            onDismiss={handleDismiss}
            isSubmitting={false}
            errorMessage={state.errorMessage}
          />
        )}

        {/* ---- Success ---- */}
        {state.phase === 'succeeded' && state.txHash && (
          <SuccessPanel
            txHash={state.txHash}
            onClose={() => onOpenChange(false)}
          />
        )}

        {/* ---- Terminal blocking states ---- */}
        {isTerminal && state.unavailableReason && (
          <BlockedPanel
            reason={state.unavailableReason}
            onClose={handleDismiss}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
