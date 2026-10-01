import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

export const runtime = 'nodejs'

/**
 * POST /api/auth/refresh
 *
 * Access-token rotation with refresh-token reuse detection.  This route is the
 * only place a session is extended, so every failure boundary is explicit and
 * fails closed:
 *
 *   1. The refresh token is read from the HttpOnly `refresh_token` cookie ONLY.
 *      A token supplied in the body, the query string or an `Authorization`
 *      header is ignored outright, so a caller can never downgrade to a token
 *      it is able to read from JavaScript.
 *   2. A refresh token is single-use.  Rotating it records its `jti` (keyed by
 *      `familyId`) and mints a successor in the same family plus a short-lived
 *      HMAC access token.
 *   3. Presenting an already-consumed `jti` revokes the WHOLE family — the
 *      successor dies with it — which is how a replayed stolen token is
 *      neutralised.
 *
 * The signing format is dependency-free: a compact
 * `<base64url(payload)>.<base64url(HMAC-SHA256(payload, secret))>` pair,
 * verified with `crypto.timingSafeEqual`.  No `jsonwebtoken`/`jose` is needed
 * (this app has no JWT dependency) and the whole boundary is unit-testable.
 */

const REFRESH_COOKIE = 'refresh_token'
const DEFAULT_REFRESH_TTL_SECONDS = 604800
const DEFAULT_ACCESS_TTL_SECONDS = 900

export interface RefreshClaims {
  sub: string
  familyId: string
  jti: string
  exp: number
}

export interface AccessClaims {
  sub: string
  familyId: string
  jti: string
  exp: number
}

export type RefreshVerification =
  | { ok: true; claims: RefreshClaims }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' }

// ---------------------------------------------------------------------------
// Token codec (dependency-free HMAC-SHA256)
// ---------------------------------------------------------------------------

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function signHmacBase64Url(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

/**
 * Constant-time string comparison.  `timingSafeEqual` throws on length
 * mismatch, so a mismatched length is folded into a same-length self-compare
 * before returning false — the comparison cost does not reveal where the two
 * values first differ.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  if (left.length !== right.length) {
    timingSafeEqual(left, left)
    return false
  }
  return timingSafeEqual(left, right)
}

function signToken(claims: object, secret: string): string {
  const payload = encodeBase64Url(JSON.stringify(claims))
  return `${payload}.${signHmacBase64Url(payload, secret)}`
}

export function signRefreshToken(claims: RefreshClaims, secret: string): string {
  return signToken(claims, secret)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

export function verifyRefreshToken(
  token: string,
  secret: string,
  now: number,
): RefreshVerification {
  if (typeof token !== 'string' || token.length === 0) {
    return { ok: false, reason: 'malformed' }
  }

  const parts = token.split('.')
  if (parts.length !== 2) return { ok: false, reason: 'malformed' }

  const payload = parts[0]
  const signature = parts[1]
  if (!payload || !signature) return { ok: false, reason: 'malformed' }

  const expected = signHmacBase64Url(payload, secret)
  if (!constantTimeEqual(signature, expected)) {
    // The reason is deliberately coarse: it never echoes the expected
    // signature or any part of the secret.
    return { ok: false, reason: 'bad_signature' }
  }

  let decoded: unknown
  try {
    decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return { ok: false, reason: 'malformed' }
  }

  if (typeof decoded !== 'object' || decoded === null) {
    return { ok: false, reason: 'malformed' }
  }

  const claims = decoded as Partial<RefreshClaims>
  if (
    !isNonEmptyString(claims.sub) ||
    !isNonEmptyString(claims.familyId) ||
    !isNonEmptyString(claims.jti) ||
    typeof claims.exp !== 'number' ||
    !Number.isFinite(claims.exp)
  ) {
    return { ok: false, reason: 'malformed' }
  }

  if (claims.exp <= now) return { ok: false, reason: 'expired' }

  return {
    ok: true,
    claims: {
      sub: claims.sub,
      familyId: claims.familyId,
      jti: claims.jti,
      exp: claims.exp,
    },
  }
}

// ---------------------------------------------------------------------------
// Rotation / revocation ledger (process-local)
// ---------------------------------------------------------------------------

/**
 * Process-local rotation ledger.
 *
 * Two invariants:
 *   - a refresh token is single-use: its `jti` is recorded on first rotation,
 *     keyed by `familyId`, so the same `jti` presented in another family is
 *     NOT treated as a replay;
 *   - reuse revokes the whole family, invalidating every token descended from
 *     the replayed one.
 *
 * Only a SHA-256 digest of the token is stored, never the token itself: if the
 * ledger is dumped or leaked it cannot be replayed to mint a session.  The
 * ledger is process-local, so a multi-instance deployment needs a shared store
 * (Redis/Postgres) for reuse detection to survive a restart and cross
 * instances.
 */
const consumedTokens = new Map<string, string>()
const revokedFamilies = new Set<string>()
let storeFault: (() => void) | null = null

function consumptionKey(familyId: string, jti: string): string {
  return `${familyId}:${jti}`
}

function assertStoreHealthy(): void {
  if (storeFault) storeFault()
}

function isConsumed(familyId: string, jti: string): boolean {
  assertStoreHealthy()
  return consumedTokens.has(consumptionKey(familyId, jti))
}

function markConsumed(familyId: string, jti: string, token: string): void {
  assertStoreHealthy()
  consumedTokens.set(consumptionKey(familyId, jti), createHash('sha256').update(token).digest('hex'))
}

function revokeFamily(familyId: string): void {
  assertStoreHealthy()
  revokedFamilies.add(familyId)
}

export function isFamilyRevoked(familyId: string): boolean {
  assertStoreHealthy()
  return revokedFamilies.has(familyId)
}

export function __resetRefreshStore(): void {
  consumedTokens.clear()
  revokedFamilies.clear()
  storeFault = null
}

/**
 * Test-only seam: force the ledger to throw so the 500 boundary and the
 * "a failed refresh never consumes the token" invariant can be exercised.
 */
export function __setRefreshStoreFaultForTests(fault: (() => void) | null): void {
  storeFault = fault
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

const BASE_HEADERS = {
  'Cache-Control': 'no-store, private',
  'X-Content-Type-Options': 'nosniff',
  Pragma: 'no-cache',
} as const

function jsonResponse(payload: unknown, status: number, setCookie?: string): NextResponse {
  const headers: Record<string, string> = { ...BASE_HEADERS }
  if (setCookie) headers['Set-Cookie'] = setCookie
  return NextResponse.json(payload, { status, headers })
}

function deny(status: number, error: string, reason: string): NextResponse {
  return jsonResponse({ error, reason }, status)
}

function positiveIntFromEnv(name: string, fallback: number): number {
  const raw = process.env[name]
  const parsed = raw === undefined ? Number.NaN : Number(raw)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const refreshSecret = process.env.JWT_REFRESH_SECRET
    if (!refreshSecret) {
      // Fail closed before signing anything: never emit a partially-issued
      // token pair when the deployment is misconfigured.
      return jsonResponse({ error: 'Refresh is not configured' }, 500)
    }
    const accessSecret = process.env.JWT_ACCESS_SECRET || refreshSecret

    // The refresh token is only ever read from the HttpOnly cookie.
    const token = req.cookies.get(REFRESH_COOKIE)?.value ?? ''
    if (!token) {
      return deny(401, 'Missing refresh token', 'NO_REFRESH_TOKEN')
    }

    const now = Math.floor(Date.now() / 1000)
    const verification = verifyRefreshToken(token, refreshSecret, now)
    if (!verification.ok) {
      if (verification.reason === 'expired') {
        return deny(401, 'Refresh token expired', 'EXPIRED_REFRESH_TOKEN')
      }
      return deny(401, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN')
    }
    const claims = verification.claims

    // Reuse is checked before revocation so a replayed single-use token is
    // reported as REUSED (and re-revokes the family) rather than REVOKED.
    if (isConsumed(claims.familyId, claims.jti)) {
      revokeFamily(claims.familyId)
      return deny(401, 'Refresh token reuse detected', 'REFRESH_TOKEN_REUSED')
    }

    if (isFamilyRevoked(claims.familyId)) {
      return deny(401, 'Refresh token revoked', 'REFRESH_TOKEN_REVOKED')
    }

    // Env is read per call (not at module load) so TTL changes take effect
    // without a restart and tests can shrink them.
    const refreshTtl = positiveIntFromEnv(
      'JWT_REFRESH_EXPIRES_IN_SECONDS',
      DEFAULT_REFRESH_TTL_SECONDS,
    )
    const accessTtl = positiveIntFromEnv('JWT_ACCESS_EXPIRES_IN_SECONDS', DEFAULT_ACCESS_TTL_SECONDS)

    // Build the successor pair first; the single ledger mutation happens only
    // once both tokens exist, so a store failure can never burn the `jti`.
    const rotatedClaims: RefreshClaims = {
      sub: claims.sub,
      familyId: claims.familyId,
      jti: randomUUID(),
      exp: now + refreshTtl,
    }
    const rotatedRefreshToken = signRefreshToken(rotatedClaims, refreshSecret)

    const accessClaims: AccessClaims = {
      sub: claims.sub,
      familyId: claims.familyId,
      jti: randomUUID(),
      exp: now + accessTtl,
    }
    const accessToken = signToken(accessClaims, accessSecret)

    markConsumed(claims.familyId, claims.jti, token)

    const setCookie = [
      `${REFRESH_COOKIE}=${rotatedRefreshToken}`,
      'HttpOnly',
      'Secure',
      'SameSite=Strict',
      'Path=/api/auth',
      `Max-Age=${refreshTtl}`,
    ].join('; ')

    return jsonResponse({ accessToken, expiresIn: accessTtl }, 200, setCookie)
  } catch (err) {
    console.error('[auth/refresh]', err)
    // Generic body: no secret, token fragment or internal state is exposed.
    return jsonResponse({ error: 'Failed to refresh session' }, 500)
  }
}
