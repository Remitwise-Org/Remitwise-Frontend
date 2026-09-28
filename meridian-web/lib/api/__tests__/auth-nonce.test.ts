import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

import {
  GET,
  __resetNonceStore,
  peekLiveNonce,
  validateAddressQuery,
} from '@/app/api/auth/nonce/route'

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const VALID_ADDRESS = `G${'A'.repeat(55)}`

/** Builds a 56-char key with the given final character, e.g. to pin the 56th char. */
function withLastChar(char: string): string {
  return `G${'A'.repeat(54)}${char}`
}

function nonceRequest(address: string | null): NextRequest {
  const url =
    address === null
      ? 'http://localhost/api/auth/nonce'
      : `http://localhost/api/auth/nonce?address=${encodeURIComponent(address)}`
  return new NextRequest(url, { method: 'GET' })
}

async function readJson(res: NextResponse): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>
}

function issuesOf(payload: Record<string, unknown>): Array<{ field: string; code: string }> {
  return payload.issues as Array<{ field: string; code: string }>
}

beforeEach(() => {
  delete process.env.NONCE_TTL_MS
  __resetNonceStore()
})

describe('validateAddressQuery', () => {
  it('rejects a missing address', () => {
    const result = validateAddressQuery(null)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues[0].code).toBe('MISSING_ADDRESS')
  })

  it('rejects an empty address', () => {
    expect(validateAddressQuery('').ok).toBe(false)
  })

  it('accepts a well-formed 56-character Stellar public key', () => {
    expect(VALID_ADDRESS).toHaveLength(56)
    const result = validateAddressQuery(VALID_ADDRESS)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.address).toBe(VALID_ADDRESS)
  })

  it('rejects 55- and 57-character values', () => {
    expect(validateAddressQuery(`G${'A'.repeat(54)}`).ok).toBe(false)
    expect(validateAddressQuery(`G${'A'.repeat(56)}`).ok).toBe(false)
  })

  it('rejects a non-G prefix', () => {
    expect(validateAddressQuery(`S${'A'.repeat(55)}`).ok).toBe(false)
    expect(validateAddressQuery(`T${'A'.repeat(55)}`).ok).toBe(false)
  })

  it('rejects lowercase addresses', () => {
    expect(validateAddressQuery(`g${'A'.repeat(55)}`).ok).toBe(false)
    expect(validateAddressQuery(`G${'a'.repeat(55)}`).ok).toBe(false)
  })

  it('rejects characters outside the base32 alphabet at the final character', () => {
    // `I`, `O`, `L` and `U` are part of the RFC 4648 alphabet Stellar strkeys use;
    // only the digits 0/1/8/9 and non-alphanumerics are outside it.
    for (const char of ['0', '1', '8', '9', '=', '@']) {
      expect(validateAddressQuery(withLastChar(char)).ok).toBe(false)
    }
  })

  it('accepts every boundary character of the base32 alphabet', () => {
    for (const char of [BASE32[0], BASE32[BASE32.length - 1], 'Z', '2', '7']) {
      expect(validateAddressQuery(withLastChar(char)).ok).toBe(true)
    }
  })
})

describe('GET /api/auth/nonce', () => {
  it('returns 400 with no-store when the address is missing', async () => {
    const res = await GET(nonceRequest(null))
    expect(res.status).toBe(400)
    const body = await readJson(res)
    expect(body.error).toBe('Invalid request')
    expect(issuesOf(body)[0].code).toBe('MISSING_ADDRESS')
    expect(res.headers.get('cache-control')).toContain('no-store')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('returns 400 for an invalid address', async () => {
    const res = await GET(nonceRequest(`S${'A'.repeat(55)}`))
    expect(res.status).toBe(400)
    const body = await readJson(res)
    expect(issuesOf(body)[0].code).toBe('INVALID_ADDRESS_PREFIX')
  })

  it('issues a 64-hex nonce with an ISO expiry and private no-store', async () => {
    process.env.NONCE_TTL_MS = '12345'
    const before = Date.now()
    const res = await GET(nonceRequest(VALID_ADDRESS))
    const after = Date.now()

    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body.address).toBe(VALID_ADDRESS)
    expect(typeof body.nonce).toBe('string')
    expect(body.nonce).toMatch(/^[0-9a-f]{64}$/)
    expect(typeof body.expiresAt).toBe('string')

    const expiresAt = new Date(body.expiresAt as string).getTime()
    expect(Number.isNaN(expiresAt)).toBe(false)
    expect(expiresAt).toBeGreaterThanOrEqual(before + 12_345 - 1_000)
    expect(expiresAt).toBeLessThanOrEqual(after + 12_345 + 1_000)

    expect(res.headers.get('cache-control')).toBe('no-store, private')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('supersedes the previous live nonce for the same address', async () => {
    const first = await readJson(await GET(nonceRequest(VALID_ADDRESS)))
    expect(peekLiveNonce(VALID_ADDRESS)?.nonce).toBe(first.nonce)

    const second = await readJson(await GET(nonceRequest(VALID_ADDRESS)))
    expect(second.nonce).not.toBe(first.nonce)
    expect(peekLiveNonce(VALID_ADDRESS)?.nonce).toBe(second.nonce)
  })

  it('never hands the same nonce to concurrent requests for one address', async () => {
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => GET(nonceRequest(VALID_ADDRESS))),
    )
    const bodies = await Promise.all(responses.map((response) => readJson(response)))
    const nonces = new Set(bodies.map((body) => body.nonce))

    expect(nonces.size).toBe(8)
    expect(peekLiveNonce(VALID_ADDRESS)).not.toBeNull()
  })

  it('keeps a live nonce while its TTL has not elapsed', async () => {
    process.env.NONCE_TTL_MS = '60000'
    const res = await GET(nonceRequest(VALID_ADDRESS))
    expect(res.status).toBe(200)
    expect(peekLiveNonce(VALID_ADDRESS)).not.toBeNull()
  })

  it('purges an expired nonce from the live store', async () => {
    process.env.NONCE_TTL_MS = '1'
    const res = await GET(nonceRequest(VALID_ADDRESS))
    expect(res.status).toBe(200)

    await new Promise((resolve) => setTimeout(resolve, 25))
    expect(peekLiveNonce(VALID_ADDRESS)).toBeNull()
  })
})
