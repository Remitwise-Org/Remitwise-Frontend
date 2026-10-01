import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

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

export interface ValidationIssue {
  field: string
  code: string
  message: string
}

export type AddressQueryResult =
  | { ok: true; address: string }
  | { ok: false; issues: ValidationIssue[] }

const ADDRESS_LENGTH = 56
const ADDRESS_PREFIX = 'G'
const BASE32_ALPHABET = /^[A-Z2-7]+$/
const NONCE_BYTES = 32
const DEFAULT_NONCE_TTL_MS = 300_000

const NO_STORE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, private',
  'X-Content-Type-Options': 'nosniff',
}

interface LiveNonce {
  nonce: string
  expiresAt: number
}

/** At most one live nonce per address; a new issuance replaces the old one. */
const nonceStore = new Map<string, LiveNonce>()

/** Test-only seam: clears the process-local nonce store. */
export function __resetNonceStore(): void {
  nonceStore.clear()
}

function issue(field: string, code: string, message: string): ValidationIssue {
  return { field, code, message }
}

/** Pure validator for the `address` query parameter.  Never throws, no I/O. */
export function validateAddressQuery(value: string | null): AddressQueryResult {
  if (value === null || value.length === 0) {
    return {
      ok: false,
      issues: [issue('address', 'MISSING_ADDRESS', 'Query parameter "address" is required')],
    }
  }

  if (value.length !== ADDRESS_LENGTH) {
    return {
      ok: false,
      issues: [
        issue(
          'address',
          'INVALID_ADDRESS_LENGTH',
          `Address must be exactly ${ADDRESS_LENGTH} characters`,
        ),
      ],
    }
  }

  if (!value.startsWith(ADDRESS_PREFIX)) {
    return {
      ok: false,
      issues: [issue('address', 'INVALID_ADDRESS_PREFIX', 'Address must start with "G"')],
    }
  }

  if (!BASE32_ALPHABET.test(value.slice(1))) {
    return {
      ok: false,
      issues: [
        issue(
          'address',
          'INVALID_ADDRESS_CHARSET',
          'Address must use the Stellar base32 alphabet (A-Z, 2-7)',
        ),
      ],
    }
  }

  return { ok: true, address: value }
}

/**
 * Test-only seam: returns the single live nonce for an address, or `null`.
 * Expired entries are purged as a side effect so the store cannot grow stale.
 */
export function peekLiveNonce(address: string): { nonce: string; expiresAt: number } | null {
  const entry = nonceStore.get(address)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    nonceStore.delete(address)
    return null
  }
  return { nonce: entry.nonce, expiresAt: entry.expiresAt }
}

/** Reads the TTL per call so tests can shrink it; invalid values use the default. */
function nonceTtlMs(): number {
  const raw = process.env.NONCE_TTL_MS
  if (raw === undefined || raw.trim() === '') return DEFAULT_NONCE_TTL_MS
  const parsed = Number(raw)
  if (!Number.isSafeInteger(parsed) || parsed < 0) return DEFAULT_NONCE_TTL_MS
  return parsed
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

  const issuedAt = Date.now()
  const expiresAt = issuedAt + nonceTtlMs()
  const nonce = randomBytes(NONCE_BYTES).toString('hex')

  // Supersede any outstanding nonce for this address.
  nonceStore.set(validated.address, { nonce, expiresAt })

  return NextResponse.json(
    { address: validated.address, nonce, expiresAt: new Date(expiresAt).toISOString() },
    { status: 200, headers: NO_STORE_HEADERS },
  )
}
