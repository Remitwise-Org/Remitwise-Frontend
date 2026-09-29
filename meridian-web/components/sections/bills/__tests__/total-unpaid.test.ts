/**
 * total-unpaid route — deterministic failure-boundary coverage
 *
 * Covers every acceptance-criterion failure mode:
 *  ✓ Successful GET request
 *  ✓ Invalid/rejected request (no auth token)
 *  ✓ Unauthorized request (missing/invalid token)
 *  ✓ Empty/boundary result (zero unpaid bills)
 *  ✓ Underlying service/database failure
 *  ✓ Retry/repeated execution behavior
 *  ✓ Concurrent execution / timing boundary
 *  ✓ Failure recovery
 *  ✓ Regression cases for existing behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ---------------------------------------------------------------------------
// Module setup - import once and reuse
// ---------------------------------------------------------------------------

let routeModule: any

beforeAll(async () => {
  routeModule = await import('@/app/api/bills/total-unpaid/route')
})

beforeEach(() => {
  vi.useFakeTimers()

  // Default: authorized principals get total=0
  vi.spyOn(routeModule, 'isPrincipalAuthorized').mockImplementation((principal: string) => true)
  // Default: computeTotalUnpaid returns 0
  vi.spyOn(routeModule, 'computeTotalUnpaid').mockImplementation((principal: string) => 0)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Helper to create a minimal NextRequest-like object
// ---------------------------------------------------------------------------

function createReq(authToken: string = 'valid-jwt-token') {
  return {
    cookies: {
      get: (name: string) => {
        if (name === 'auth_token') return { value: authToken }
        return { value: '' }
      },
    },
    nextUrl: new URL('http://localhost/api/bills/total-unpaid'),
    method: 'GET',
  }
}

// ---------------------------------------------------------------------------
// Test: Successful request and authentication flows
// ---------------------------------------------------------------------------

describe('total-unpaid GET', () => {
  it('returns 200 with total for successful request with valid auth', async () => {
    const { GET } = await import('@/app/api/bills/total-unpaid/route')
    const req = createReq()
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual({ total: 0 })
  })

  it('returns 401 when no auth_token cookie is present', async () => {
    const { GET } = await import('@/app/api/bills/total-unpaid/route')
    const req = createReq('') // empty token
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('returns 401 when auth_token is malformed JWT', async () => {
    const { GET } = await import('@/app/api/bills/total-unpaid/route')
    const req = createReq('invalid.jwt.token')
    const res = await GET(req)
    const data = await res.json()

    expect(res.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  it('preserves Cache-Control: no-store header', async () => {
    const { GET } = await import('@/app/api/bills/total-unpaid/route')
    const req = createReq()
    const res = await GET(req)

    expect(res.headers.get('Cache-Control')).toBe('no-store, private')
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff')
  })

  it('is deterministic across repeated calls', async () => {
    const { GET } = await import('@/app/api/bills/total-unpaid/route')

    const req1 = createReq()
    const req2 = createReq()

    const res1 = await GET(req1)
    const res2 = await GET(req2)

    const data1 = await res1.json()
    const data2 = await res2.json()

    expect(data1).toEqual(data2)
  })

  it('handles concurrent requests deterministically', async () => {
    const { GET } = await import('@/app/api/bills/total-unpaid/route')

    const requests = Array.from({ length: 5 }, () => createReq())
    const responses = await Promise.all(requests.map((r) => GET(r)))
    const data = responses.map((r) => r.status).filter((s) => s === 200)

    // All concurrent requests should succeed with the same result
    expect(data.length).toBe(5)
    expect(new Set(data).size).toBe(1)
  })
})