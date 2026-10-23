import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { GET as getTotalUnpaid } from '@/app/api/bills/total-unpaid/route'
import { GET as getTransferCapability } from '@/app/api/transfer-capability/route'
import { POST as postRefresh, signRefreshToken, __resetRefreshStore } from '@/app/api/auth/refresh/route'
import { signAccessToken, type AccessClaims, type RefreshClaims } from '@/lib/auth/session'

const ACCESS_SECRET = 'test-access-secret'
const REFRESH_SECRET = 'test-refresh-secret'
const PRINCIPAL = 'ops@meridian.example'

function accessToken(principal = PRINCIPAL): string {
  const claims: AccessClaims = {
    sub: principal,
    familyId: 'family-1',
    jti: 'access-jti',
    exp: Math.floor(Date.now() / 1000) + 3600,
  }
  return signAccessToken(claims, ACCESS_SECRET)
}

function getRequest(path: string, token: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    headers: { cookie: `auth_token=${token}` },
  })
}

beforeEach(() => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET
  process.env.JWT_REFRESH_SECRET = REFRESH_SECRET
  process.env.CACHE_INVALIDATION_ALLOWED_PRINCIPALS = PRINCIPAL
  process.env.EMERGENCY_TRANSFER_ALLOWED_PRINCIPALS = PRINCIPAL
})

afterEach(() => {
  __resetRefreshStore()
  vi.unstubAllEnvs()
  delete process.env.JWT_ACCESS_SECRET
  delete process.env.JWT_REFRESH_SECRET
  delete process.env.CACHE_INVALIDATION_ALLOWED_PRINCIPALS
  delete process.env.EMERGENCY_TRANSFER_ALLOWED_PRINCIPALS
})

describe('GET /api/bills/total-unpaid session authentication', () => {
  it('rejects a forged plain cookie and accepts a signed allow-listed principal', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const forged = await getTotalUnpaid(getRequest('/api/bills/total-unpaid', PRINCIPAL))
    expect(forged.status).toBe(401)
    expect(await forged.json()).toEqual({ error: 'Unauthorized' })

    const signed = await getTotalUnpaid(getRequest('/api/bills/total-unpaid', accessToken()))
    expect(signed.status).toBe(200)
    expect(await signed.json()).toEqual({ total: 0 })
  })

  it('accepts the access token issued by POST /api/auth/refresh', async () => {
    const refreshClaims: RefreshClaims = {
      sub: PRINCIPAL,
      familyId: 'refresh-family',
      jti: 'refresh-jti',
      exp: Math.floor(Date.now() / 1000) + 3600,
    }
    const refreshToken = signRefreshToken(refreshClaims, REFRESH_SECRET)
    const refreshResponse = await postRefresh(
      new NextRequest('http://localhost/api/auth/refresh', {
        method: 'POST',
        headers: { cookie: `refresh_token=${refreshToken}` },
      }),
    )
    expect(refreshResponse.status).toBe(200)
    const payload = (await refreshResponse.json()) as { accessToken: string }
    expect(payload.accessToken.split('.')).toHaveLength(2)

    const result = await getTotalUnpaid(getRequest('/api/bills/total-unpaid', payload.accessToken))
    expect(result.status).toBe(200)
    expect(await result.json()).toEqual({ total: 0 })
  })
})

describe('GET /api/transfer-capability session authentication', () => {
  it('rejects a forged plain cookie and grants capability to a signed principal', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const forged = await getTransferCapability(
      getRequest('/api/transfer-capability', PRINCIPAL),
    )
    expect(forged.status).toBe(401)
    expect(await forged.json()).toEqual({ effect: 'denied', reason: 'NO_ACTIVE_SESSION' })

    const signed = await getTransferCapability(
      getRequest('/api/transfer-capability', accessToken()),
    )
    expect(signed.status).toBe(200)
    expect(await signed.json()).toMatchObject({ effect: 'granted', principal: PRINCIPAL })
  })
})
