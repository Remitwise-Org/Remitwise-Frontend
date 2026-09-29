/**
 * api/auth/refresh — failure-boundary coverage
 *
 * Exercises the POST boundary directly with `NextRequest` objects (no Next
 * mocking) plus the exported codec helpers.  Every env knob is set in
 * `beforeEach` and the process-local ledger is reset so cases stay
 * deterministic.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { Buffer } from 'node:buffer'
import { createHmac } from 'node:crypto'

import {
  POST,
  isFamilyRevoked,
  signRefreshToken,
  verifyRefreshToken,
  __resetRefreshStore,
  __setRefreshStoreFaultForTests,
} from '@/app/api/auth/refresh/route'

const REFRESH_SECRET = 'test-refresh-secret'
const USER = 'user-1'
const FAMILY = 'fam-1'

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

function futureExp(): number {
  return nowSeconds() + 3600
}

function makeToken(
  overrides: Partial<{ sub: string; familyId: string; jti: string; exp: number }> = {},
): string {
  return signRefreshToken(
    { sub: USER, familyId: FAMILY, jti: 'jti-1', exp: futureExp(), ...overrides },
    REFRESH_SECRET,
  )
}

function makeRequest(
  options: {
    cookieToken?: string | null
    body?: string
    headers?: Record<string, string>
    url?: string
  } = {},
): NextRequest {
  const headers: Record<string, string> = { ...(options.headers ?? {}) }
  if (options.cookieToken) headers.cookie = `refresh_token=${options.cookieToken}`
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  return new NextRequest(options.url ?? 'http://localhost/api/auth/refresh', {
    method: 'POST',
    headers,
    ...(options.body !== undefined ? { body: options.body } : {}),
  })
}

function setCookieOf(res: Response): string {
  return res.headers.get('set-cookie') ?? ''
}

function rotatedToken(res: Response): string {
  const match = setCookieOf(res).match(/refresh_token=([^;]+)/)
  if (!match) throw new Error('rotated refresh cookie missing')
  return match[1]
}

function payloadOf(token: string): Record<string, unknown> {
  return JSON.parse(
    Buffer.from(token.split('.')[0], 'base64url').toString('utf8'),
  ) as Record<string, unknown>
}

function reasonOf(body: unknown): string {
  return (body as { reason?: string }).reason ?? ''
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  __resetRefreshStore()
  process.env.JWT_REFRESH_SECRET = REFRESH_SECRET
  delete process.env.JWT_ACCESS_SECRET
  delete process.env.JWT_REFRESH_EXPIRES_IN_SECONDS
  delete process.env.JWT_ACCESS_EXPIRES_IN_SECONDS
})

afterEach(() => {
  vi.restoreAllMocks()
  __resetRefreshStore()
  delete process.env.JWT_REFRESH_SECRET
})

describe('signRefreshToken / verifyRefreshToken', () => {
  it('round-trips a signed refresh token', () => {
    const token = makeToken()
    const result = verifyRefreshToken(token, REFRESH_SECRET, nowSeconds())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.claims).toEqual({
        sub: USER,
        familyId: FAMILY,
        jti: 'jti-1',
        exp: expect.any(Number),
      })
    }
  })

  it('rejects a token whose payload was tampered with (bad_signature)', () => {
    const token = makeToken()
    const signature = token.split('.')[1]
    const forgedPayload = Buffer.from(
      JSON.stringify({ sub: 'attacker', familyId: FAMILY, jti: 'jti-1', exp: futureExp() }),
      'utf8',
    ).toString('base64url')
    const result = verifyRefreshToken(`${forgedPayload}.${signature}`, REFRESH_SECRET, nowSeconds())
    expect(result).toEqual({ ok: false, reason: 'bad_signature' })
  })

  it('rejects a token whose signature was tampered with (bad_signature)', () => {
    const token = makeToken()
    const [encoded, signature] = token.split('.')
    const forged = signature.slice(0, -1) + (signature.endsWith('A') ? 'B' : 'A')
    expect(forged).not.toBe(signature)
    const result = verifyRefreshToken(`${encoded}.${forged}`, REFRESH_SECRET, nowSeconds())
    expect(result).toEqual({ ok: false, reason: 'bad_signature' })
  })

  it('rejects truncated and garbage tokens as malformed', () => {
    const token = makeToken()
    const [encoded, signature] = token.split('.')
    const now = nowSeconds()
    const candidates = ['', 'garbage', `${encoded}.`, `.${signature}`, 'a.b.c', `${encoded}.x.y`]
    for (const candidate of candidates) {
      expect(verifyRefreshToken(candidate, REFRESH_SECRET, now)).toEqual({
        ok: false,
        reason: 'malformed',
      })
    }
  })

  it('flags an expired token as expired', () => {
    const token = makeToken({ exp: 1_000_000_000 })
    expect(verifyRefreshToken(token, REFRESH_SECRET, 1_000_000_000)).toEqual({
      ok: false,
      reason: 'expired',
    })
    expect(verifyRefreshToken(token, REFRESH_SECRET, 1_000_000_001)).toEqual({
      ok: false,
      reason: 'expired',
    })
  })

  it('treats a correctly signed non-JSON payload as malformed', () => {
    const payload = Buffer.from('not json', 'utf8').toString('base64url')
    const signature = createHmac('sha256', REFRESH_SECRET).update(payload).digest('base64url')
    expect(verifyRefreshToken(`${payload}.${signature}`, REFRESH_SECRET, 0)).toEqual({
      ok: false,
      reason: 'malformed',
    })
  })
})

describe('POST /api/auth/refresh', () => {
  it('fails closed when JWT_REFRESH_SECRET is not configured', async () => {
    delete process.env.JWT_REFRESH_SECRET
    const res = await POST(makeRequest({ cookieToken: makeToken() }))
    expect(res.status).toBe(500)
    expect(await res.json()).toEqual({ error: 'Refresh is not configured' })
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('returns 401 NO_REFRESH_TOKEN when the cookie is absent', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
    expect(reasonOf(await res.json())).toBe('NO_REFRESH_TOKEN')
    expect(res.headers.get('cache-control')).toBe('no-store, private')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
    expect(res.headers.get('pragma')).toBe('no-cache')
  })

  it('ignores a refresh token supplied in the body', async () => {
    const res = await POST(makeRequest({ body: JSON.stringify({ refreshToken: makeToken() }) }))
    expect(res.status).toBe(401)
    expect(reasonOf(await res.json())).toBe('NO_REFRESH_TOKEN')
  })

  it('ignores a refresh token supplied in the query string', async () => {
    const url = `http://localhost/api/auth/refresh?refresh_token=${encodeURIComponent(makeToken())}`
    const res = await POST(makeRequest({ url }))
    expect(res.status).toBe(401)
    expect(reasonOf(await res.json())).toBe('NO_REFRESH_TOKEN')
  })

  it('ignores a refresh token supplied in the Authorization header', async () => {
    const res = await POST(makeRequest({ headers: { authorization: `Bearer ${makeToken()}` } }))
    expect(res.status).toBe(401)
    expect(reasonOf(await res.json())).toBe('NO_REFRESH_TOKEN')
  })

  it('rejects a malformed cookie token with INVALID_REFRESH_TOKEN', async () => {
    const res = await POST(makeRequest({ cookieToken: 'not-a-token' }))
    expect(res.status).toBe(401)
    expect(reasonOf(await res.json())).toBe('INVALID_REFRESH_TOKEN')
  })

  it('rejects an expired cookie token with EXPIRED_REFRESH_TOKEN', async () => {
    const res = await POST(makeRequest({ cookieToken: makeToken({ exp: 1_000_000_000 }) }))
    expect(res.status).toBe(401)
    expect(reasonOf(await res.json())).toBe('EXPIRED_REFRESH_TOKEN')
  })

  it('rotates the refresh token and issues a short-lived access token', async () => {
    const res = await POST(makeRequest({ cookieToken: makeToken() }))
    expect(res.status).toBe(200)

    const body = (await res.json()) as { accessToken: string; expiresIn: number }
    expect(body.expiresIn).toBe(900)
    expect(body.accessToken.split('.')).toHaveLength(2)
    expect(payloadOf(body.accessToken)).toMatchObject({ sub: USER, familyId: FAMILY })

    const [encoded, signature] = body.accessToken.split('.')
    expect(signature).toBe(
      createHmac('sha256', REFRESH_SECRET).update(encoded).digest('base64url'),
    )

    const cookie = setCookieOf(res)
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Strict')
    expect(cookie).toContain('Path=/api/auth')
    expect(cookie).toContain('Max-Age=604800')
    expect(res.headers.get('cache-control')).toBe('no-store, private')
  })

  it('honours the TTL environment variables on every call', async () => {
    process.env.JWT_ACCESS_EXPIRES_IN_SECONDS = '60'
    process.env.JWT_REFRESH_EXPIRES_IN_SECONDS = '120'
    const res = await POST(makeRequest({ cookieToken: makeToken() }))
    const body = (await res.json()) as { expiresIn: number }
    expect(body.expiresIn).toBe(60)
    expect(setCookieOf(res)).toContain('Max-Age=120')
  })

  it('lets the rotated refresh token be used exactly once', async () => {
    const first = await POST(makeRequest({ cookieToken: makeToken() }))
    const next = rotatedToken(first)

    const second = await POST(makeRequest({ cookieToken: next }))
    expect(second.status).toBe(200)

    const third = await POST(makeRequest({ cookieToken: next }))
    expect(third.status).toBe(401)
    expect(reasonOf(await third.json())).toBe('REFRESH_TOKEN_REUSED')
  })

  it('treats a replay of a consumed token as reuse and revokes the family', async () => {
    const original = makeToken()
    const first = await POST(makeRequest({ cookieToken: original }))
    const next = rotatedToken(first)

    const replay = await POST(makeRequest({ cookieToken: original }))
    expect(replay.status).toBe(401)
    expect(reasonOf(await replay.json())).toBe('REFRESH_TOKEN_REUSED')
    expect(isFamilyRevoked(FAMILY)).toBe(true)

    // Revocation invalidates the freshly rotated successor too.
    const afterRevocation = await POST(makeRequest({ cookieToken: next }))
    expect(afterRevocation.status).toBe(401)
    expect(reasonOf(await afterRevocation.json())).toBe('REFRESH_TOKEN_REVOKED')
  })

  it('does not treat the same jti in a different family as a replay', async () => {
    const first = await POST(
      makeRequest({ cookieToken: makeToken({ familyId: 'fam-1', jti: 'shared' }) }),
    )
    expect(first.status).toBe(200)

    const other = await POST(
      makeRequest({ cookieToken: makeToken({ familyId: 'fam-2', jti: 'shared' }) }),
    )
    expect(other.status).toBe(200)
    expect(isFamilyRevoked('fam-1')).toBe(false)
    expect(isFamilyRevoked('fam-2')).toBe(false)
  })

  it('returns 500 on a store failure without consuming the token', async () => {
    const token = makeToken()
    __setRefreshStoreFaultForTests(() => {
      throw new Error('ledger unavailable')
    })

    const failed = await POST(makeRequest({ cookieToken: token }))
    expect(failed.status).toBe(500)
    expect(await failed.json()).toEqual({ error: 'Failed to refresh session' })

    __setRefreshStoreFaultForTests(null)
    expect(isFamilyRevoked(FAMILY)).toBe(false)

    // Because the store failed before the `jti` was consumed, the same token
    // is still usable — a 500 must not burn a session.
    const retried = await POST(makeRequest({ cookieToken: token }))
    expect(retried.status).toBe(200)
  })
})
