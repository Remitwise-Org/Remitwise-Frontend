'use client'

/**
 * Test harness page for the EmergencyTransferDialog.
 *
 * ONLY rendered in non-production environments (enforced by the 404 guard
 * below).  This page lets Playwright drive the full dialog flow without
 * needing a real backend.  The provider outcome is controlled via a query
 * parameter so the E2E test can trigger both success and failure paths
 * without mocking at the network layer.
 *
 * URL: /test-harness/emergency-transfer
 *
 * Query params:
 *   scenario=success|failure|unauthorized|expired|no_config
 *             |no_capability|capability_revoked|capability_expired
 *   Default: success
 *
 * Capability scenarios simulate the server boundary in-memory so the E2E
 * suite can prove the mutation gates close without a live backend:
 *   - no_capability        → capability resolved as DENIED at open
 *   - capability_revoked   → granted at review/bind, DENIED at submit
 *   - capability_expired   → granted but already past its expiresAt
 */

import * as React from 'react'
import { notFound } from 'next/navigation'
import { EmergencyTransferDialog } from '@/components/emergency-transfer'
import { createEmergencyTransferConfig } from '@/models/emergency-transfer-config'
import type { ConfirmationPayload } from '@/lib/validations/emergency-transfer'
import type { TransferProvider } from '@/hooks/useEmergencyTransfer'
import type { TransferCapabilityResolver } from '@/lib/api/transfer-capability'
import type { TransferCapability } from '@/models/emergency-transfer-capability'

// Guard: this route must never be accessible in production.
if (process.env.NODE_ENV === 'production') {
  notFound()
}

const RECIPIENT = '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF'
const AMOUNT_RAW = '1000000000000000000'
const AMOUNT_DISPLAY = '1.0'
const MOCK_TX_HASH = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890'

const POLICY_VERSION = 3

/**
 * Simulated server boundary.  Mirrors the contract of
 * `/api/transfer-capability`: the outcome is derived purely from "server"
 * state (the scenario) and never from the client's config claim.
 *
 * Defined at module scope so the "server" call counter survives React
 * re-renders — just like a real backend.
 */
function buildCapabilityResolver(scenario: string): TransferCapabilityResolver {
  // Counts how many times the "server" has been consulted.
  let calls = 0
  const now = Date.now()

  return async (): Promise<TransferCapability> => {
    calls += 1

    switch (scenario) {
      case 'no_capability':
        return { effect: 'denied', reason: 'PRINCIPAL_NOT_AUTHORIZED' }

      case 'capability_expired':
        return {
          effect: 'granted',
          principal: 'admin@example.com',
          version: POLICY_VERSION,
          issuedAt: now - 60_000,
          expiresAt: now - 1_000,
        }

      case 'capability_revoked':
        // Granted while the user reviews / binds…
        if (calls <= 2) {
          return {
            effect: 'granted',
            principal: 'admin@example.com',
            version: POLICY_VERSION,
            issuedAt: now,
            expiresAt: now + 60_000,
          }
        }
        // …then the role is removed server-side before submit.
        return { effect: 'denied', reason: 'PRINCIPAL_NOT_AUTHORIZED' }

      default:
        // success / failure / expired / unauthorized / no_config
        return {
          effect: 'granted',
          principal: 'admin@example.com',
          version: POLICY_VERSION,
          issuedAt: now,
          expiresAt: now + 60_000,
        }
    }
  }
}

function buildConfig(scenario: string) {
  if (scenario === 'no_config') return null

  const expiresAt =
    scenario === 'expired'
      ? Date.now() - 1000 // already expired
      : Date.now() + 10 * 60 * 1000 // 10 min from now

  return createEmergencyTransferConfig({
    expiresAt,
    recipient: RECIPIENT,
    amountRaw: AMOUNT_RAW,
    amountDisplay: AMOUNT_DISPLAY,
    asset: { symbol: 'ETH', contractAddress: '', decimals: 18 },
    networkId: 'ethereum',
    authorizedBy: scenario === 'unauthorized' ? null : 'admin@example.com',
  })
}

function buildProvider(scenario: string): TransferProvider {
  return async (_payload: ConfirmationPayload) => {
    // Simulate network latency.
    await new Promise((r) => setTimeout(r, 300))

    if (scenario === 'failure') {
      throw Object.assign(new Error('Provider rejected: insufficient funds'), {
        code: 'INSUFFICIENT_FUNDS',
      })
    }

    return { txHash: MOCK_TX_HASH }
  }
}

export default function EmergencyTransferTestHarness({
  searchParams,
}: {
  searchParams: { scenario?: string }
}) {
  const scenario = searchParams?.scenario ?? 'success'
  const config = buildConfig(scenario)
  const provider = buildProvider(scenario)
  // Stable across re-renders (the "server" call counter must not reset).
  const capabilityResolver = React.useMemo(
    () => buildCapabilityResolver(scenario),
    [scenario],
  )
  const [open, setOpen] = React.useState(false)

  return (
    <div className="min-h-screen p-8">
      <h1 className="mb-4 text-xl font-semibold">
        Emergency Transfer — Test Harness
      </h1>
      <p className="text-muted-foreground mb-6 text-sm">
        Scenario: <code className="font-mono">{scenario}</code>
      </p>

      {/* Trigger button — matches what the real UI would render inside EmergencyTransferGate */}
      <button
        data-testid="et-open-trigger"
        onClick={() => setOpen(true)}
        className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        Open Emergency Transfer
      </button>

      <EmergencyTransferDialog
        open={open}
        onOpenChange={setOpen}
        config={config}
        provider={provider}
        capabilityResolver={capabilityResolver}
      />

      {/* State dump for assertions */}
      <pre
        id="test-scenario"
        data-testid="test-scenario"
        className="mt-8 rounded bg-gray-100 p-4 text-xs"
      >
        {JSON.stringify({ scenario, hasConfig: config !== null }, null, 2)}
      </pre>
    </div>
  )
}
