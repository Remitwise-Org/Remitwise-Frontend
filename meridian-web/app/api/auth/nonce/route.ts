import { NextRequest, NextResponse } from 'next/server'

import {
  handleNonceRequest,
  validateAddressQuery,
  __resetNonceStore,
  peekLiveNonce,
  type AddressQueryResult,
  type ValidationIssue,
} from '@/lib/auth/nonce'

/**
 * GET /api/auth/nonce?address=<stellar-public-key>
 *
 * Issues a single-use authentication nonce for a Stellar public key.
 *
 * Invariants:
 *   - The address must be a well-formed Stellar public key: exactly 56
 *     characters, a leading `G`, and 55 characters from the base32 alphabet
 *     `A-Z2-7`.  Anything else is a 400.
 *   - The response always carries `Cache-Control: no-store, private` and
 *     `X-Content-Type-Options: nosniff`: a nonce must never be cached or
 *     reused.
 *   - At most one nonce is live per address.  Issuing a new nonce supersedes
 *     the previous one, so a replayed request cannot keep an old nonce alive.
 *   - Concurrency: every request generates its own 32 random bytes, so N
 *     concurrent requests for the same address yield N distinct nonces.
 *   - Nothing about the request (query string, headers, secrets) is echoed
 *     back, and the nonce is never logged.
 *
 * NOTE: the live-nonce map is process-local.  A multi-instance deployment
 * needs a shared store (e.g. Redis) so that supersede/expiry hold globally;
 * this route is intentionally dependency-free.
 */

export const runtime = 'nodejs'

export { validateAddressQuery, __resetNonceStore, peekLiveNonce }
export type { AddressQueryResult, ValidationIssue }

const NO_STORE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, private',
  'X-Content-Type-Options': 'nosniff',
}

// Generate 32 random bytes as hex (64 chars) to match the original route contract
function generateHexNonce(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const address = req.nextUrl.searchParams.get('address')
  const validated = validateAddressQuery(address)

  if (!validated.ok) {
    return NextResponse.json(
      { error: 'Invalid request', issues: validated.issues },
      { status: 400, headers: NO_STORE_HEADERS },
    )
  }

  const result = handleNonceRequest({ address: validated.address }, { generateNonce: generateHexNonce })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.message },
      { status: result.status, headers: NO_STORE_HEADERS },
    )
  }

  return NextResponse.json(
    {
      address: result.principal,
      nonce: result.nonce,
      expiresAt: new Date(result.expiresAt).toISOString(),
    },
    { status: 200, headers: NO_STORE_HEADERS },
  )
}