import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

import {
  POST,
  __resetCacheInvalidationLedger,
  __setCachePurgeForTests,
  collectSelectors,
  runCachePurge,
  validateRequestBody,
  type CacheInvalidateRequest,
} from '@/app/api/cache/invalidate/route'

const ALLOWED_PRINCIPALS = 'alice@example.com,bob@example.com'

interface RequestOptions {
  token?: string | null
  idempotencyKey?: string
  extraHeaders?: Record<string, string>
}

function baseHeaders(options: RequestOptions): Record<string, string> {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (options.token !== null) {
    headers.cookie = `auth_token=${options.token ?? 'alice@example.com'}`
  }
  if (options.idempotencyKey !== undefined) {
    headers['idempotency-key'] = options.idempotencyKey
  }
  Object.assign(headers, options.extraHeaders ?? {})
  return headers
}

function makeRequest(body: unknown, options: RequestOptions = {}): NextRequest {
  return new NextRequest('http://localhost/api/cache/invalidate', {
    method: 'POST',
    headers: baseHeaders(options),
    body: JSON.stringify(body),
  })
}

function makeRawRequest(rawBody: string, options: RequestOptions = {}): NextRequest {
  return new NextRequest('http://localhost/api/cache/invalidate', {
    method: 'POST',
    headers: baseHeaders(options),
    body: rawBody,
  })
}

async function readJson(res: NextResponse): Promise<Record<string, unknown>> {
  return (await res.json()) as Record<string, unknown>
}

function issuesOf(payload: Record<string, unknown>): Array<{ field: string; code: string }> {
  return payload.issues as Array<{ field: string; code: string }>
}

/** Minimal stand-in for a fetch Response — only the fields the route reads. */
function fakeResponse(ok: boolean, status: number, payload: unknown): Response {
  return {
    ok,
    status,
    json: async () => payload,
  } as unknown as Response
}

const tags = (count: number): string[] => Array.from({ length: count }, (_, i) => `t${i}`)
const paths = (count: number): string[] => Array.from({ length: count }, (_, i) => `/p${i}`)
const keys = (count: number): string[] => Array.from({ length: count }, (_, i) => `k${i}`)

beforeEach(() => {
  process.env.CACHE_INVALIDATION_ALLOWED_PRINCIPALS = ALLOWED_PRINCIPALS
  delete process.env.MERIDIAN_CACHE_PURGE_URL
  __resetCacheInvalidationLedger()
})

afterEach(() => {
  delete process.env.CACHE_INVALIDATION_ALLOWED_PRINCIPALS
  delete process.env.MERIDIAN_CACHE_PURGE_URL
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('validateRequestBody', () => {
  it('accepts a tags-only request and normalises the absent arrays', () => {
    const result = validateRequestBody({ tags: ['pool:stats', 'pool:leaderboard'] })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual({
      tags: ['pool:stats', 'pool:leaderboard'],
      paths: [],
      keys: [],
    })
  })

  it('accepts exactly 50 entries in one array and rejects 51', () => {
    expect(validateRequestBody({ tags: tags(50) }).ok).toBe(true)
    const rejected = validateRequestBody({ tags: tags(51) })
    expect(rejected.ok).toBe(false)
    if (rejected.ok) return
    expect(rejected.issues.some((i) => i.code === 'TOO_MANY_SELECTORS')).toBe(true)
  })

  it('accepts 100 total selectors and rejects 101', () => {
    const hundred = { tags: tags(50), paths: paths(34), keys: keys(16) }
    expect(validateRequestBody(hundred).ok).toBe(true)

    const hundredAndOne = { tags: tags(50), paths: paths(34), keys: keys(17) }
    const rejected = validateRequestBody(hundredAndOne)
    expect(rejected.ok).toBe(false)
    if (rejected.ok) return
    expect(
      rejected.issues.some((i) => i.field === 'body' && i.code === 'TOO_MANY_SELECTORS'),
    ).toBe(true)
    // The per-array limit is not what rejected this request.
    expect(rejected.issues.some((i) => i.field !== 'body' && i.code === 'TOO_MANY_SELECTORS')).toBe(
      false,
    )
  })

  it('rejects a body with no non-empty selector array', () => {
    for (const body of [{}, { tags: [] }, { tags: [], paths: [], keys: [] }]) {
      const result = validateRequestBody(body)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.issues.some((i) => i.code === 'NO_SELECTORS')).toBe(true)
    }
  })

  it('rejects a non-string selector entry', () => {
    const result = validateRequestBody({ tags: ['ok', 7] })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((i) => i.code === 'INVALID_TYPE')).toBe(true)
  })

  it('rejects a non-array selector field', () => {
    expect(validateRequestBody({ tags: 'pool:stats' }).ok).toBe(false)
  })

  it('rejects duplicate entries within one array', () => {
    const result = validateRequestBody({ tags: ['pool:stats', 'pool:stats'] })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((i) => i.code === 'DUPLICATE_SELECTOR')).toBe(true)
  })

  it('enforces the 64-character tag boundary', () => {
    expect(validateRequestBody({ tags: ['a'.repeat(64)] }).ok).toBe(true)
    expect(validateRequestBody({ tags: ['a'.repeat(65)] }).ok).toBe(false)
  })

  it('rejects tag characters outside [A-Za-z0-9:_-]', () => {
    expect(validateRequestBody({ tags: ['has space'] }).ok).toBe(false)
    expect(validateRequestBody({ tags: ['emoji✨'] }).ok).toBe(false)
    expect(validateRequestBody({ tags: [''] }).ok).toBe(false)
  })

  it('rejects path traversal and disallowed separators', () => {
    for (const path of ['/../../etc/passwd', '/a//b', '/api?x=1', '/api#frag', '\\windows', 'relative/path', '/bad\npath']) {
      expect(validateRequestBody({ paths: [path] }).ok).toBe(false)
    }
  })

  it('enforces the 256-character path boundary and the leading slash', () => {
    const maxPath = `/${'a'.repeat(255)}`
    expect(maxPath).toHaveLength(256)
    expect(validateRequestBody({ paths: [maxPath] }).ok).toBe(true)
    expect(validateRequestBody({ paths: [`/${'a'.repeat(256)}`] }).ok).toBe(false)
    expect(validateRequestBody({ paths: ['no-leading-slash'] }).ok).toBe(false)
  })

  it('enforces the 128-character key boundary and rejects control characters', () => {
    expect(validateRequestBody({ keys: ['k'.repeat(128)] }).ok).toBe(true)
    expect(validateRequestBody({ keys: ['k'.repeat(129)] }).ok).toBe(false)
    expect(validateRequestBody({ keys: ['bad\tkey'] }).ok).toBe(false)
  })

  it('enforces the 200-character reason boundary', () => {
    expect(validateRequestBody({ tags: ['a'], reason: 'r'.repeat(200) }).ok).toBe(true)
    expect(validateRequestBody({ tags: ['a'], reason: 'r'.repeat(201) }).ok).toBe(false)
    expect(validateRequestBody({ tags: ['a'], reason: '' }).ok).toBe(false)
    expect(validateRequestBody({ tags: ['a'], reason: 3 }).ok).toBe(false)
  })

  it('rejects unknown top-level keys', () => {
    const result = validateRequestBody({ tags: ['a'], extra: true })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.some((i) => i.code === 'UNKNOWN_FIELD')).toBe(true)
  })

  it('rejects null, array and primitive bodies', () => {
    for (const body of [null, ['tags'], 'tags=a', 42, true]) {
      const result = validateRequestBody(body)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.issues[0].code).toBe('INVALID_BODY')
    }
  })
})

describe('collectSelectors', () => {
  it('flattens selectors in tags, paths, keys order', () => {
    expect(collectSelectors({ tags: ['t'], paths: ['/p'], keys: ['k'] })).toEqual(['t', '/p', 'k'])
  })
})

describe('runCachePurge', () => {
  it('is a passthrough when MERIDIAN_CACHE_PURGE_URL is unset', async () => {
    const result = await runCachePurge({ tags: ['t'], paths: ['/p'], keys: ['k'] })
    expect(result).toEqual({ purged: ['t', '/p', 'k'], failed: [] })
  })

  it('posts to the configured endpoint and returns its outcome', async () => {
    process.env.MERIDIAN_CACHE_PURGE_URL = 'http://purge.test/invalidate'
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      fakeResponse(true, 200, { purged: ['t'], failed: [] }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await runCachePurge({ tags: ['t'], paths: [], keys: [] })

    expect(result).toEqual({ purged: ['t'], failed: [] })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const call = fetchMock.mock.calls[0]
    expect(call[0]).toBe('http://purge.test/invalidate')
    expect(call[1]?.method).toBe('POST')
  })

  it('throws when the purge endpoint responds non-2xx', async () => {
    process.env.MERIDIAN_CACHE_PURGE_URL = 'http://purge.test/invalidate'
    vi.stubGlobal('fetch', vi.fn(async (_url: string, _init?: RequestInit) => fakeResponse(false, 503, null)))

    await expect(runCachePurge({ tags: ['t'], paths: [], keys: [] })).rejects.toThrow()
  })
})

describe('POST /api/cache/invalidate', () => {
  it('returns 401 without an auth_token cookie', async () => {
    const res = await POST(makeRequest({ tags: ['pool:stats'] }, { token: null }))
    expect(res.status).toBe(401)
    const body = await readJson(res)
    expect(body.reason).toBe('NO_ACTIVE_SESSION')
    expect(body).not.toHaveProperty('invalidated')
    expect(res.headers.get('cache-control')).toContain('no-store')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('returns 403 for a principal outside the allow-list', async () => {
    const res = await POST(makeRequest({ tags: ['pool:stats'] }, { token: 'mallory@example.com' }))
    expect(res.status).toBe(403)
    const body = await readJson(res)
    expect(body.reason).toBe('PRINCIPAL_NOT_AUTHORIZED')
    expect(res.headers.get('cache-control')).toContain('no-store')
  })

  it('returns 400 for an unparsable JSON body', async () => {
    const res = await POST(makeRawRequest('{not json'))
    expect(res.status).toBe(400)
    const body = await readJson(res)
    expect(body.error).toBe('Invalid JSON body')
    expect(issuesOf(body)[0].code).toBe('INVALID_JSON')
  })

  it('returns 400 for a structurally invalid body', async () => {
    const res = await POST(makeRequest({ tags: [] }))
    expect(res.status).toBe(400)
    const body = await readJson(res)
    expect(body.error).toBe('Invalid request body')
    expect(issuesOf(body).some((i) => i.code === 'NO_SELECTORS')).toBe(true)
  })

  it('returns 400 for a non-object JSON body', async () => {
    const res = await POST(makeRequest(null))
    expect(res.status).toBe(400)
    const body = await readJson(res)
    expect(issuesOf(body)[0].code).toBe('INVALID_BODY')
  })

  it('invalidates valid selectors and leaks nothing extra', async () => {
    const res = await POST(
      makeRequest(
        { tags: ['pool:stats', 'pool:leaderboard'] },
        { extraHeaders: { 'x-debug-secret': 'do-not-leak' } },
      ),
    )
    expect(res.status).toBe(200)
    const body = await readJson(res)
    expect(body.invalidated).toEqual(['pool:stats', 'pool:leaderboard'])
    expect(body.failed).toEqual([])
    expect(body.replayed).toBe(false)
    expect(Object.keys(body).sort()).toEqual(['failed', 'invalidated', 'replayed'])
    expect(JSON.stringify(body)).not.toContain('do-not-leak')
    expect(res.headers.get('cache-control')).toContain('no-store')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('replays the first outcome for a repeated Idempotency-Key without purging again', async () => {
    const purgedWith: CacheInvalidateRequest[] = []
    __setCachePurgeForTests(async (request) => {
      purgedWith.push(request)
      return { purged: collectSelectors(request), failed: [] }
    })

    const first = await POST(makeRequest({ tags: ['pool:stats'] }, { idempotencyKey: 'idem-1' }))
    const firstBody = await readJson(first)
    expect(first.status).toBe(200)
    expect(firstBody.replayed).toBe(false)

    const second = await POST(makeRequest({ tags: ['pool:stats'] }, { idempotencyKey: 'idem-1' }))
    const secondBody = await readJson(second)
    expect(second.status).toBe(200)
    expect(secondBody.replayed).toBe(true)
    expect(secondBody.invalidated).toEqual(firstBody.invalidated)
    expect(purgedWith).toHaveLength(1)
  })

  it('returns 502 when the purge throws, then lets the same key retry successfully', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let attempts = 0
    __setCachePurgeForTests(async (request) => {
      attempts += 1
      if (attempts === 1) throw new Error('purge backend unavailable')
      return { purged: collectSelectors(request), failed: [] }
    })

    const failed = await POST(makeRequest({ tags: ['pool:stats'] }, { idempotencyKey: 'idem-2' }))
    expect(failed.status).toBe(502)
    const failedBody = await readJson(failed)
    expect(failedBody.reason).toBe('PURGE_FAILED')
    expect(failedBody.failed).toEqual(['pool:stats'])
    expect(errorSpy).toHaveBeenCalled()

    const retried = await POST(makeRequest({ tags: ['pool:stats'] }, { idempotencyKey: 'idem-2' }))
    expect(retried.status).toBe(200)
    expect(attempts).toBe(2)

    errorSpy.mockRestore()
  })

  it('returns 502 on a partial failure and does not record the key', async () => {
    let calls = 0
    __setCachePurgeForTests(async (request) => {
      calls += 1
      if (calls === 1) return { purged: ['pool:stats'], failed: ['pool:leaderboard'] }
      return { purged: collectSelectors(request), failed: [] }
    })

    const partial = await POST(
      makeRequest({ tags: ['pool:stats', 'pool:leaderboard'] }, { idempotencyKey: 'idem-3' }),
    )
    expect(partial.status).toBe(502)
    const body = await readJson(partial)
    expect(body.reason).toBe('PURGE_FAILED')
    expect(body.failed).toEqual(['pool:leaderboard'])

    const retried = await POST(
      makeRequest({ tags: ['pool:stats', 'pool:leaderboard'] }, { idempotencyKey: 'idem-3' }),
    )
    expect(retried.status).toBe(200)
    expect(calls).toBe(2)
  })

  it('rejects an over-long Idempotency-Key header', async () => {
    const res = await POST(
      makeRequest({ tags: ['pool:stats'] }, { idempotencyKey: 'k'.repeat(129) }),
    )
    expect(res.status).toBe(400)
    const body = await readJson(res)
    expect(issuesOf(body)[0].code).toBe('INVALID_IDEMPOTENCY_KEY')
  })
})
