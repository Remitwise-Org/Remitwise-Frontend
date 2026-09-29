/**
 * api/bills — failure-boundary coverage
 *
 * Calls `postHandler` directly with real `NextRequest` objects (no Next
 * mocking) and injects the persistence seam so the suite never touches the
 * network.  The validation boundaries use a fixed `now` so the due-date cases
 * are deterministic.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import {
  POST,
  persistBill,
  postHandler,
  validateBillRequest,
  __resetBillIdempotencyLedger,
  __setBillPersisterForTests,
  type BillRecord,
} from '@/app/api/bills/route'

const DAY_MS = 24 * 60 * 60 * 1000
const NOW = Date.UTC(2026, 0, 15, 12, 0, 0)
const AUTH_COOKIE = 'auth_token=user-1'

// 56-char base32 public key: 'G' + 55 base32 characters.
const STELLAR_KEY = `G${'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.repeat(2).slice(0, 55)}`

let persisted: unknown[] = []

function installPersister(impl?: (bill: BillRecord) => Promise<void>): void {
  persisted = []
  __setBillPersisterForTests(async (bill) => {
    persisted.push(bill)
    if (impl) await impl(bill)
  })
}

function baseInput(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    amount: 1500,
    currency: 'USDC',
    dueDate: new Date(NOW + DAY_MS).toISOString(),
    recipient: STELLAR_KEY,
    ...overrides,
  }
}

function validBodyText(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    amount: 2500,
    currency: 'XLM',
    dueDate: new Date(Date.now() + DAY_MS).toISOString(),
    recipient: STELLAR_KEY,
    ...overrides,
  })
}

function makeRequest(
  options: {
    cookie?: string | null
    body?: string
    idempotencyKey?: string
    headers?: Record<string, string>
  } = {},
): NextRequest {
  const headers: Record<string, string> = { ...(options.headers ?? {}) }
  if (options.cookie) headers.cookie = options.cookie
  if (options.body !== undefined) headers['content-type'] = 'application/json'
  if (options.idempotencyKey !== undefined) headers['idempotency-key'] = options.idempotencyKey
  return new NextRequest('http://localhost/api/bills', {
    method: 'POST',
    headers,
    ...(options.body !== undefined ? { body: options.body } : {}),
  })
}

function expectIssues(result: ReturnType<typeof validateBillRequest>, code: string): void {
  expect(result.ok).toBe(false)
  if (!result.ok) {
    expect(result.issues.some((issue) => issue.code === code)).toBe(true)
  }
}

function reasonOf(body: unknown): string {
  return (body as { reason?: string }).reason ?? ''
}

function sampleRecord(): BillRecord {
  return {
    amount: 100,
    currency: 'XLM',
    dueDate: new Date(NOW + DAY_MS).toISOString(),
    recipient: STELLAR_KEY,
    userId: 'user-1',
    id: 'bill-1',
    createdAt: new Date(NOW).toISOString(),
  }
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  __resetBillIdempotencyLedger()
  __setBillPersisterForTests(null)
  delete process.env.MERIDIAN_BILLS_ENDPOINT
  installPersister()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  __resetBillIdempotencyLedger()
  __setBillPersisterForTests(null)
})

describe('validateBillRequest', () => {
  it('accepts a valid bill request', () => {
    const result = validateBillRequest(baseInput(), NOW)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.amount).toBe(1500)
      expect(result.value.currency).toBe('USDC')
      expect(result.value.recipient).toBe(STELLAR_KEY)
      expect(result.value.description).toBeUndefined()
    }
  })

  it('accepts the amount cap exactly and rejects cap + 1', () => {
    expect(validateBillRequest(baseInput({ amount: 10_000_000_000 }), NOW).ok).toBe(true)
    expectIssues(
      validateBillRequest(baseInput({ amount: 10_000_000_001 }), NOW),
      'AMOUNT_OUT_OF_RANGE',
    )
  })

  it('rejects non-positive and non-integer amounts', () => {
    expectIssues(validateBillRequest(baseInput({ amount: 0 }), NOW), 'AMOUNT_OUT_OF_RANGE')
    expectIssues(validateBillRequest(baseInput({ amount: -1 }), NOW), 'AMOUNT_OUT_OF_RANGE')
    expectIssues(validateBillRequest(baseInput({ amount: 1.5 }), NOW), 'AMOUNT_INVALID')
    expectIssues(validateBillRequest(baseInput({ amount: '100' }), NOW), 'AMOUNT_INVALID')
    expectIssues(validateBillRequest(baseInput({ amount: Number.NaN }), NOW), 'AMOUNT_INVALID')
    expectIssues(
      validateBillRequest(baseInput({ amount: Number.POSITIVE_INFINITY }), NOW),
      'AMOUNT_INVALID',
    )
  })

  it('accepts only the exact supported currencies', () => {
    for (const currency of ['XLM', 'USDC', 'MXN']) {
      expect(validateBillRequest(baseInput({ currency }), NOW).ok).toBe(true)
    }
    expectIssues(validateBillRequest(baseInput({ currency: 'xlm' }), NOW), 'CURRENCY_INVALID')
    expectIssues(validateBillRequest(baseInput({ currency: 'EUR' }), NOW), 'CURRENCY_INVALID')
    expectIssues(validateBillRequest(baseInput({ currency: 42 }), NOW), 'CURRENCY_INVALID')
  })

  it('enforces the due-date window inclusively', () => {
    expect(
      validateBillRequest(baseInput({ dueDate: new Date(NOW).toISOString() }), NOW).ok,
    ).toBe(true)
    expectIssues(
      validateBillRequest(baseInput({ dueDate: new Date(NOW - 1).toISOString() }), NOW),
      'DUE_DATE_IN_PAST',
    )
    expect(
      validateBillRequest(
        baseInput({ dueDate: new Date(NOW + 365 * DAY_MS).toISOString() }),
        NOW,
      ).ok,
    ).toBe(true)
    expectIssues(
      validateBillRequest(
        baseInput({ dueDate: new Date(NOW + 365 * DAY_MS + 1).toISOString() }),
        NOW,
      ),
      'DUE_DATE_TOO_FAR',
    )
    expectIssues(validateBillRequest(baseInput({ dueDate: 'tomorrow' }), NOW), 'DUE_DATE_INVALID')
    expectIssues(validateBillRequest(baseInput({ dueDate: '2026-02-30' }), NOW), 'DUE_DATE_INVALID')
    expectIssues(validateBillRequest(baseInput({ dueDate: 123 }), NOW), 'DUE_DATE_INVALID')
  })

  it('enforces description boundaries and rejects control characters', () => {
    expect(validateBillRequest(baseInput({ description: 'a'.repeat(280) }), NOW).ok).toBe(true)
    expectIssues(
      validateBillRequest(baseInput({ description: 'a'.repeat(281) }), NOW),
      'DESCRIPTION_LENGTH',
    )
    expectIssues(validateBillRequest(baseInput({ description: '   ' }), NOW), 'DESCRIPTION_LENGTH')
    expectIssues(
      validateBillRequest(baseInput({ description: 'bad\u0007value' }), NOW),
      'DESCRIPTION_CONTROL_CHARS',
    )
    expectIssues(validateBillRequest(baseInput({ description: 7 }), NOW), 'DESCRIPTION_INVALID')

    const trimmed = validateBillRequest(baseInput({ description: '  January rent  ' }), NOW)
    expect(trimmed.ok).toBe(true)
    if (trimmed.ok) expect(trimmed.value.description).toBe('January rent')
  })

  it('accepts a Stellar key or an email recipient and rejects everything else', () => {
    expect(validateBillRequest(baseInput({ recipient: STELLAR_KEY }), NOW).ok).toBe(true)
    expect(validateBillRequest(baseInput({ recipient: 'bills@example.com' }), NOW).ok).toBe(true)
    expectIssues(validateBillRequest(baseInput({ recipient: '' }), NOW), 'RECIPIENT_REQUIRED')
    expectIssues(validateBillRequest(baseInput({ recipient: '   ' }), NOW), 'RECIPIENT_REQUIRED')
    expectIssues(validateBillRequest(baseInput({ recipient: 'not-a-key' }), NOW), 'RECIPIENT_INVALID')
    expectIssues(
      validateBillRequest(baseInput({ recipient: `g${STELLAR_KEY.slice(1)}` }), NOW),
      'RECIPIENT_INVALID',
    )
    expectIssues(
      validateBillRequest(baseInput({ recipient: `${'a'.repeat(320)}@example.com` }), NOW),
      'RECIPIENT_INVALID',
    )
  })

  it('rejects unknown top-level keys', () => {
    expectIssues(validateBillRequest(baseInput({ sneaky: true }), NOW), 'UNKNOWN_FIELD')
  })

  it('accepts but drops a client-supplied userId', () => {
    const result = validateBillRequest(baseInput({ userId: 'attacker' }), NOW)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).not.toHaveProperty('userId')
  })

  it('rejects non-object bodies', () => {
    expectIssues(validateBillRequest(null, NOW), 'INVALID_BODY')
    expectIssues(validateBillRequest([], NOW), 'INVALID_BODY')
    expectIssues(validateBillRequest('nope', NOW), 'INVALID_BODY')
  })
})

describe('persistBill', () => {
  it('is a no-op when MERIDIAN_BILLS_ENDPOINT is unset', async () => {
    delete process.env.MERIDIAN_BILLS_ENDPOINT
    await expect(persistBill(sampleRecord())).resolves.toBeUndefined()
  })

  it('throws when the endpoint returns a non-2xx response', async () => {
    process.env.MERIDIAN_BILLS_ENDPOINT = 'https://bills.example.test/write'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503 })),
    )
    await expect(persistBill(sampleRecord())).rejects.toThrow(/503/)
  })
})

describe('postHandler / POST', () => {
  it('exposes POST as the same handler', () => {
    expect(POST).toBe(postHandler)
  })

  it('rejects an unauthenticated request before validating the body', async () => {
    const res = await postHandler(makeRequest({ body: '{ not json' }))
    expect(res.status).toBe(401)
    expect(reasonOf(await res.json())).toBe('NO_ACTIVE_SESSION')
    expect(persisted).toHaveLength(0)
  })

  it('rejects a malformed auth_token', async () => {
    const res = await postHandler(
      makeRequest({ cookie: 'auth_token=a.b.c', body: validBodyText() }),
    )
    expect(res.status).toBe(401)
    expect(reasonOf(await res.json())).toBe('NO_ACTIVE_SESSION')
  })

  it('returns 400 INVALID_JSON for an unparsable body', async () => {
    const res = await postHandler(makeRequest({ cookie: AUTH_COOKIE, body: '{ not json' }))
    expect(res.status).toBe(400)
    expect(reasonOf(await res.json())).toBe('INVALID_JSON')
    expect(persisted).toHaveLength(0)
  })

  it('returns 400 INVALID_BODY for a non-object payload', async () => {
    const res = await postHandler(
      makeRequest({ cookie: AUTH_COOKIE, body: JSON.stringify(['nope']) }),
    )
    expect(res.status).toBe(400)
    expect(reasonOf(await res.json())).toBe('INVALID_BODY')
  })

  it('returns 400 with issues for a validation failure', async () => {
    const res = await postHandler(
      makeRequest({ cookie: AUTH_COOKIE, body: validBodyText({ amount: -1 }) }),
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { issues?: Array<{ code: string }> }
    expect(body.issues?.map((issue) => issue.code)).toContain('AMOUNT_OUT_OF_RANGE')
    expect(persisted).toHaveLength(0)
  })

  it('creates the bill for the session principal on the happy path', async () => {
    const res = await postHandler(makeRequest({ cookie: AUTH_COOKIE, body: validBodyText() }))
    expect(res.status).toBe(201)

    const body = (await res.json()) as { bill: Record<string, unknown>; replayed: boolean }
    expect(body.replayed).toBe(false)
    expect(body.bill.userId).toBe('user-1')
    expect(body.bill.amount).toBe(2500)
    expect(body.bill.currency).toBe('XLM')
    expect(String(body.bill.id)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    )
    expect(typeof body.bill.createdAt).toBe('string')
    expect(persisted).toHaveLength(1)

    expect(res.headers.get('cache-control')).toBe('no-store, private')
    expect(res.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('ignores a spoofed userId in the body', async () => {
    const res = await postHandler(
      makeRequest({ cookie: AUTH_COOKIE, body: validBodyText({ userId: 'attacker' }) }),
    )
    expect(res.status).toBe(201)
    const body = (await res.json()) as { bill: { userId: string } }
    expect(body.bill.userId).toBe('user-1')
  })

  it('rejects an Idempotency-Key outside 1..128 characters', async () => {
    const res = await postHandler(
      makeRequest({
        cookie: AUTH_COOKIE,
        body: validBodyText(),
        idempotencyKey: 'k'.repeat(129),
      }),
    )
    expect(res.status).toBe(400)
    expect(reasonOf(await res.json())).toBe('INVALID_IDEMPOTENCY_KEY')
    expect(persisted).toHaveLength(0)
  })

  it('replays a duplicate Idempotency-Key without a second write', async () => {
    const key = 'idem-1'
    const first = await postHandler(
      makeRequest({ cookie: AUTH_COOKIE, body: validBodyText(), idempotencyKey: key }),
    )
    const second = await postHandler(
      makeRequest({ cookie: AUTH_COOKIE, body: validBodyText(), idempotencyKey: key }),
    )

    expect(first.status).toBe(201)
    expect(second.status).toBe(200)

    const firstBody = (await first.json()) as { bill: { id: string }; replayed: boolean }
    const secondBody = (await second.json()) as { bill: { id: string }; replayed: boolean }
    expect(firstBody.replayed).toBe(false)
    expect(secondBody.replayed).toBe(true)
    expect(secondBody.bill.id).toBe(firstBody.bill.id)
    expect(persisted).toHaveLength(1)
  })

  it('deduplicates a key while the first request is still in flight', async () => {
    let releaseGate: () => void = () => {}
    let markStarted: () => void = () => {}
    const gate = new Promise<void>((resolve) => {
      releaseGate = resolve
    })
    const started = new Promise<void>((resolve) => {
      markStarted = resolve
    })
    installPersister(async () => {
      markStarted()
      await gate
    })

    const key = 'idem-inflight'
    const first = postHandler(
      makeRequest({ cookie: AUTH_COOKIE, body: validBodyText(), idempotencyKey: key }),
    )
    await started
    const second = postHandler(
      makeRequest({ cookie: AUTH_COOKIE, body: validBodyText(), idempotencyKey: key }),
    )
    releaseGate()

    const [firstRes, secondRes] = await Promise.all([first, second])
    expect(persisted).toHaveLength(1)
    expect(firstRes.status).toBe(201)
    expect(secondRes.status).toBe(200)
    expect(((await secondRes.json()) as { replayed: boolean }).replayed).toBe(true)
  })

  it('returns 502 and releases the key when persistence fails once', async () => {
    let attempts = 0
    installPersister(async () => {
      attempts += 1
      if (attempts === 1) throw new Error('db down')
    })

    const key = 'idem-retry'
    const failed = await postHandler(
      makeRequest({ cookie: AUTH_COOKIE, body: validBodyText(), idempotencyKey: key }),
    )
    expect(failed.status).toBe(502)
    expect(reasonOf(await failed.json())).toBe('PERSIST_FAILED')

    const retried = await postHandler(
      makeRequest({ cookie: AUTH_COOKIE, body: validBodyText(), idempotencyKey: key }),
    )
    expect(retried.status).toBe(201)
    expect(attempts).toBe(2)
  })

  it('never reports success when persistence keeps failing', async () => {
    installPersister(async () => {
      throw new Error('db down')
    })

    const key = 'idem-broken'
    const first = await postHandler(
      makeRequest({ cookie: AUTH_COOKIE, body: validBodyText(), idempotencyKey: key }),
    )
    const second = await postHandler(
      makeRequest({ cookie: AUTH_COOKIE, body: validBodyText(), idempotencyKey: key }),
    )
    expect(first.status).toBe(502)
    expect(second.status).toBe(502)
  })

  it('writes again when no Idempotency-Key is supplied', async () => {
    const first = await postHandler(makeRequest({ cookie: AUTH_COOKIE, body: validBodyText() }))
    const second = await postHandler(makeRequest({ cookie: AUTH_COOKIE, body: validBodyText() }))
    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(persisted).toHaveLength(2)
  })
})
