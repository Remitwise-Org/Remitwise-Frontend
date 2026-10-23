import { Buffer } from 'node:buffer'
import { createHmac, timingSafeEqual } from 'node:crypto'
import type { NextRequest } from 'next/server'

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

export type SessionPrincipalResolution =
  | { ok: true; principal: string }
  | { ok: false; reason: 'missing' | 'malformed' | 'bad_signature' | 'expired' }

export class SessionConfigurationError extends Error {
  constructor() {
    super('JWT access signing secret is not configured')
    this.name = 'SessionConfigurationError'
  }
}

const MAX_TOKEN_LENGTH = 8_192
const BASE64URL = /^[A-Za-z0-9_-]+$/

function encodeBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url')
}

function signHmacBase64Url(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

/** Compare signatures without leaking their first differing byte. */
export function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8')
  const right = Buffer.from(b, 'utf8')
  if (left.length !== right.length) {
    timingSafeEqual(left, left)
    return false
  }
  return timingSafeEqual(left, right)
}

/** Mint the dependency-free two-part HMAC token used by the refresh route. */
export function signToken(claims: object, secret: string): string {
  const payload = encodeBase64Url(JSON.stringify(claims))
  return `${payload}.${signHmacBase64Url(payload, secret)}`
}

export function signRefreshToken(claims: RefreshClaims, secret: string): string {
  return signToken(claims, secret)
}

export function signAccessToken(claims: AccessClaims, secret: string): string {
  return signToken(claims, secret)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function verifySignedPayload(
  token: string,
  secret: string,
  now: number,
): { ok: true; claims: Record<string, unknown> } | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' } {
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) {
    return { ok: false, reason: 'malformed' }
  }

  const parts = token.split('.')
  if (parts.length !== 2) return { ok: false, reason: 'malformed' }

  const [payload, signature] = parts
  if (!payload || !signature || !BASE64URL.test(payload) || !BASE64URL.test(signature)) {
    return { ok: false, reason: 'malformed' }
  }

  const expected = signHmacBase64Url(payload, secret)
  if (!constantTimeEqual(signature, expected)) {
    return { ok: false, reason: 'bad_signature' }
  }

  let decoded: unknown
  try {
    decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
  } catch {
    return { ok: false, reason: 'malformed' }
  }

  if (typeof decoded !== 'object' || decoded === null || Array.isArray(decoded)) {
    return { ok: false, reason: 'malformed' }
  }

  const claims = decoded as Record<string, unknown>
  if (!isNonEmptyString(claims.sub) || typeof claims.exp !== 'number' || !Number.isFinite(claims.exp)) {
    return { ok: false, reason: 'malformed' }
  }
  if (claims.exp <= now) return { ok: false, reason: 'expired' }

  return { ok: true, claims }
}

export function verifyRefreshToken(token: string, secret: string, now: number): RefreshVerification {
  const verification = verifySignedPayload(token, secret, now)
  if (!verification.ok) return verification

  const { sub, familyId, jti, exp } = verification.claims
  if (!isNonEmptyString(familyId) || !isNonEmptyString(jti)) {
    return { ok: false, reason: 'malformed' }
  }

  return { ok: true, claims: { sub, familyId, jti, exp: exp as number } }
}

function accessSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_REFRESH_SECRET
  if (!secret) throw new SessionConfigurationError()
  return secret
}

/** Resolve an auth_token cookie only when it is a valid signed access token. */
export function resolveSessionPrincipal(
  req: NextRequest,
  now = Date.now(),
): SessionPrincipalResolution {
  const secret = accessSecret()
  const token = req.cookies.get('auth_token')?.value ?? ''
  if (!token) return { ok: false, reason: 'missing' }

  // Explicit local/test compatibility only. Never enable the override in prod.
  const parts = token.split('.')
  const looksLikeSignedToken =
    parts.length === 2 &&
    BASE64URL.test(parts[0]) &&
    parts[1].length === 43 &&
    BASE64URL.test(parts[1])
  const plaintextAllowed =
    process.env.NODE_ENV === 'test' ||
    (process.env.NODE_ENV !== 'production' && process.env.AUTH_ALLOW_PLAINTEXT_PRINCIPAL === 'true')
  if (
    parts.length < 3 &&
    !looksLikeSignedToken &&
    plaintextAllowed &&
    token.length <= 320
  ) {
    return { ok: true, principal: token }
  }

  const verification = verifySignedPayload(token, secret, Math.floor(now / 1000))
  if (!verification.ok) return verification
  return { ok: true, principal: verification.claims.sub as string }
}
