import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { NextRequest } from 'next/server'

import { resolveSessionPrincipal, signAccessToken, SessionConfigurationError } from './session'

const ACCESS_SECRET = 'test-access-secret'
const OTHER_SECRET = 'another-test-secret'
const NOW = 1_800_000_000_000

function signedToken(secret = ACCESS_SECRET, exp = Math.floor(NOW / 1000) + 60): string {
  return signAccessToken(
    { sub: 'alice@example.com', familyId: 'family-1', jti: 'jti-1', exp },
    secret,
  )
}

function requestWithCookie(token: string): NextRequest {
  return {
    cookies: { get: (name: string) => (name === 'auth_token' ? { value: token } : undefined) },
  } as unknown as NextRequest
}

beforeEach(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET
  delete process.env.JWT_REFRESH_SECRET
  delete process.env.AUTH_ALLOW_PLAINTEXT_PRINCIPAL
})

afterEach(() => {
  vi.unstubAllEnvs()
  delete process.env.JWT_ACCESS_SECRET
  delete process.env.JWT_REFRESH_SECRET
  delete process.env.AUTH_ALLOW_PLAINTEXT_PRINCIPAL
})

describe('resolveSessionPrincipal', () => {
  it('accepts a correctly signed access token and resolves sub', () => {
    expect(resolveSessionPrincipal(requestWithCookie(signedToken()), NOW)).toEqual({
      ok: true,
      principal: 'alice@example.com',
    })
  })

  it('rejects a token whose payload has been changed', () => {
    const token = signedToken()
    const [payload, signature] = token.split('.')
    const changedPayload = `${payload[0] === 'A' ? 'B' : 'A'}${payload.slice(1)}`
    expect(resolveSessionPrincipal(requestWithCookie(`${changedPayload}.${signature}`), NOW)).toEqual({
      ok: false,
      reason: 'bad_signature',
    })
  })

  it('rejects a token signed with a different secret', () => {
    expect(resolveSessionPrincipal(requestWithCookie(signedToken(OTHER_SECRET)), NOW)).toEqual({
      ok: false,
      reason: 'bad_signature',
    })
  })

  it('rejects a token expiring at the current time', () => {
    expect(
      resolveSessionPrincipal(
        requestWithCookie(signedToken(ACCESS_SECRET, Math.floor(NOW / 1000))),
        NOW,
      ),
    ).toEqual({ ok: false, reason: 'expired' })
  })

  it('rejects a plain principal in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(resolveSessionPrincipal(requestWithCookie('alice@example.com'), NOW)).toEqual({
      ok: false,
      reason: 'malformed',
    })
  })

  it('rejects unsigned three-segment tokens', () => {
    expect(resolveSessionPrincipal(requestWithCookie('x..y'), NOW)).toEqual({
      ok: false,
      reason: 'malformed',
    })
  })

  it('only permits the plaintext override outside production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    process.env.AUTH_ALLOW_PLAINTEXT_PRINCIPAL = 'true'
    expect(resolveSessionPrincipal(requestWithCookie('alice@example.com'), NOW)).toEqual({
      ok: true,
      principal: 'alice@example.com',
    })

    vi.stubEnv('NODE_ENV', 'production')
    expect(resolveSessionPrincipal(requestWithCookie('alice@example.com'), NOW)).toEqual({
      ok: false,
      reason: 'malformed',
    })
  })

  it('fails with configuration error when neither access nor refresh secret exists', () => {
    delete process.env.JWT_ACCESS_SECRET
    expect(() => resolveSessionPrincipal(requestWithCookie(signedToken()), NOW)).toThrow(
      SessionConfigurationError,
    )
  })
})
