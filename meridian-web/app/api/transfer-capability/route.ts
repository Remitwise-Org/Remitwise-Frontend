import { NextRequest, NextResponse } from 'next/server'
import { resolveSessionPrincipal } from '@/lib/auth/session'

import type {
  TransferCapability,
  CapabilityDenyReason,
} from '@/models/emergency-transfer-capability'

/**
 * GET /api/transfer-capability
 *
 * Server boundary for emergency-transfer authorization.  Derives the caller's
 * transfer capability EXCLUSIVELY from verified server state:
 *
 *   1. The session principal (bearer token in the `auth_token` cookie).
 *   2. The server-side transfer policy (vault issuance + principal allow-list
 *      sourced from the deployment environment / policy vault).
 *
 * The client can never influence the outcome — it cannot pass a principal,
 * a version, or an `authorizedBy` claim.  A denied capability is returned
 * with HTTP 403 so callers (and logs) can distinguish it from a transport
 * failure, but the body reveals no policy internals (which principals are on
 * the allow-list, how the policy is stored, etc.).
 *
 * The `version` field is the revocation / staleness anchor: when a role is
 * removed or the policy is tightened, operators bump
 * `EMERGENCY_TRANSFER_POLICY_VERSION` and every previously-issued capability
 * becomes stale.  The client must therefore reject any capability whose
 * version differs from the one captured at review time — invalidating
 * pending confirmations without shipping any server state to the client.
 *
 * This route is deliberately cheap and stateless so it can be called at every
 * mutation boundary with no caching: `Cache-Control: no-store`.
 */

/** Reads the server-side policy revision (revocation anchor). */
function policyVersion(): number {
  const raw = process.env.EMERGENCY_TRANSFER_POLICY_VERSION
  const parsed = raw ? Number(raw) : Number.NaN
  if (!Number.isSafeInteger(parsed) || parsed < 0) return 0
  return parsed
}

/** Principal allow-list from the server-side policy. Empty ⇒ denied-by-default. */
function allowedPrincipals(): ReadonlySet<string> {
  const raw = process.env.EMERGENCY_TRANSFER_ALLOWED_PRINCIPALS ?? ''
  return new Set(
    raw
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0),
  )
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const session = resolveSessionPrincipal(req)

    if (!session.ok) {
      return deny('NO_ACTIVE_SESSION', 401)
    }

    const principal = session.principal
    if (!allowedPrincipals().has(principal)) {
      return deny('PRINCIPAL_NOT_AUTHORIZED', 403)
    }

    // Issued fresh from server state on every boundary call.
    const issuedAt = Date.now()
    const ttlMs = Number(process.env.EMERGENCY_TRANSFER_CAPABILITY_TTL_MS ?? '60000')
    const safeTtl = Number.isSafeInteger(ttlMs) && ttlMs >= 5_000 ? ttlMs : 60_000

    const capability: TransferCapability = Object.freeze({
      effect: 'granted',
      principal,
      version: policyVersion(),
      issuedAt,
      expiresAt: issuedAt + safeTtl,
    })

    return NextResponse.json(capability, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, private',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    console.error('[/api/transfer-capability]', err)
    return deny('POLICY_NOT_ENABLED', 500)
  }
}

function deny(reason: CapabilityDenyReason, status: number): NextResponse {
  const capability: TransferCapability = Object.freeze({ effect: 'denied', reason })
  return NextResponse.json(capability, {
    status,
    headers: {
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}