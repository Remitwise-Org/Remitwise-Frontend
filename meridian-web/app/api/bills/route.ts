import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'node:buffer'
import { createHash, randomUUID } from 'node:crypto'

export const runtime = 'nodejs'

/**
 * POST /api/bills
 *
 * Creates a bill for the authenticated session principal.  The route is a
 * fail-closed server boundary with three invariants:
 *
 *   1. Authorization runs before any body handling — an unauthenticated caller
 *      never learns whether its payload would have been accepted.
 *   2. The owning user is ALWAYS the session principal.  Any `userId` supplied
 *      in the body is accepted only so it can be discarded; it is never
 *      written to the bill.
 *   3. Persistence is idempotent per `Idempotency-Key`.  A retry that arrives
 *      while the first write is in flight, or after it finished, replays the
 *      stored outcome and performs no second write.  A failure releases the
 *      key so a genuine retry really retries and a partial write never looks
 *      like success.
 */

const MAX_AMOUNT_MINOR_UNITS = 10_000_000_000
const MAX_DUE_DATE_WINDOW_MS = 365 * 24 * 60 * 60 * 1000
const MAX_DESCRIPTION_LENGTH = 280
const MAX_EMAIL_LENGTH = 320
const MAX_IDEMPOTENCY_KEY_LENGTH = 128
const IDEMPOTENCY_KEY_REGEX = /^[A-Za-z0-9_:.-]{1,128}$/
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000
const MAX_LEDGER_ENTRIES = 10_000
const PERSIST_TIMEOUT_MS = 5_000

const SUPPORTED_CURRENCIES = ['XLM', 'USDC', 'MXN'] as const
export type BillCurrency = (typeof SUPPORTED_CURRENCIES)[number]

const STELLAR_PUBLIC_KEY = /^G[A-Z2-7]{55}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ISO_DATE_OR_DATETIME = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/

const ALLOWED_BILL_KEYS: ReadonlySet<string> = new Set([
  'amount',
  'currency',
  'dueDate',
  'description',
  'recipient',
  // Accepted only so it can be discarded: the owning user is always the
  // authenticated principal (see postHandler), never a client-supplied id.
  'userId',
])

export interface NewBillRequest {
  amount: number
  currency: BillCurrency
  dueDate: string
  description?: string
  recipient: string
}

export type BillRecord = NewBillRequest & {
  userId: string
  id: string
  createdAt: string
}

export interface ValidationIssue {
  field: string
  code: string
  message: string
}

export type ValidationResult =
  | { ok: true; value: NewBillRequest }
  | { ok: false; issues: ValidationIssue[] }

// ---------------------------------------------------------------------------
// Session principal (house style: `auth_token` cookie, fail closed)
// ---------------------------------------------------------------------------

interface PrincipalSession {
  principal: string | null
  isValid: boolean
}

/**
 * Parses the bearer token the client sends.  The token is either a plain
 * e-mail style principal (dev/test) or a JWT-style payload carrying a `sub`
 * claim.  Any failure is treated as "no session" — the route fails closed.
 * No token data is ever echoed back to the client.
 */
function resolvePrincipal(token: string): PrincipalSession {
  if (!token) return { principal: null, isValid: false }

  const segments = token.split('.')
  if (segments.length === 3) {
    try {
      const raw = Buffer.from(segments[1], 'base64url').toString('utf8')
      const payload = JSON.parse(raw) as { sub?: unknown }
      if (typeof payload.sub === 'string' && payload.sub.length > 0) {
        return { principal: payload.sub, isValid: true }
      }
    } catch {
      return { principal: null, isValid: false }
    }
    return { principal: null, isValid: false }
  }

  // Plain principal (dev/test sign-in).  Reject obvious garbage.
  if (typeof token === 'string' && token.length > 0 && token.length <= 320) {
    return { principal: token, isValid: true }
  }

  return { principal: null, isValid: false }
}

// ---------------------------------------------------------------------------
// Validation (pure, injectable clock)
// ---------------------------------------------------------------------------

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Rejects calendar rollovers that `Date.parse` silently normalises, e.g.
 * `2026-02-30` becomes 2026-03-02.  Only the day-in-month range needs this:
 * out-of-range months, times and offsets already parse to `NaN`.
 */
function hasValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12) return false
  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day >= 1 && day <= daysInMonth[month - 1]
}

/**
 * Validates the client payload.  `now` is an epoch-millisecond timestamp so
 * the due-date boundaries are deterministic and testable without fake timers.
 */
export function validateBillRequest(input: unknown, now: number): ValidationResult {
  if (!isPlainObject(input)) {
    return {
      ok: false,
      issues: [{ field: 'body', code: 'INVALID_BODY', message: 'Body must be a JSON object' }],
    }
  }

  const issues: ValidationIssue[] = []

  for (const key of Object.keys(input)) {
    if (!ALLOWED_BILL_KEYS.has(key)) {
      issues.push({ field: key, code: 'UNKNOWN_FIELD', message: `Unknown field "${key}"` })
    }
  }

  const amount = input.amount
  let normalizedAmount: number | null = null
  if (typeof amount !== 'number' || !Number.isInteger(amount)) {
    issues.push({
      field: 'amount',
      code: 'AMOUNT_INVALID',
      message: 'amount must be an integer number of minor units',
    })
  } else if (amount <= 0 || amount > MAX_AMOUNT_MINOR_UNITS) {
    issues.push({
      field: 'amount',
      code: 'AMOUNT_OUT_OF_RANGE',
      message: `amount must be greater than 0 and at most ${MAX_AMOUNT_MINOR_UNITS}`,
    })
  } else {
    normalizedAmount = amount
  }

  const currency = input.currency
  let normalizedCurrency: BillCurrency | null = null
  if (
    typeof currency !== 'string' ||
    !(SUPPORTED_CURRENCIES as readonly string[]).includes(currency)
  ) {
    issues.push({
      field: 'currency',
      code: 'CURRENCY_INVALID',
      message: 'currency must be one of XLM, USDC, MXN',
    })
  } else {
    normalizedCurrency = currency as BillCurrency
  }

  const dueDate = input.dueDate
  let normalizedDueDate: string | null = null
  if (
    typeof dueDate !== 'string' ||
    !ISO_DATE_OR_DATETIME.test(dueDate) ||
    !hasValidCalendarDate(dueDate)
  ) {
    issues.push({
      field: 'dueDate',
      code: 'DUE_DATE_INVALID',
      message: 'dueDate must be an ISO-8601 date or date-time string',
    })
  } else {
    const parsed = Date.parse(dueDate)
    if (Number.isNaN(parsed)) {
      issues.push({
        field: 'dueDate',
        code: 'DUE_DATE_INVALID',
        message: 'dueDate is not a valid calendar date',
      })
    } else if (parsed < now) {
      issues.push({
        field: 'dueDate',
        code: 'DUE_DATE_IN_PAST',
        message: 'dueDate must not be before now',
      })
    } else if (parsed > now + MAX_DUE_DATE_WINDOW_MS) {
      issues.push({
        field: 'dueDate',
        code: 'DUE_DATE_TOO_FAR',
        message: 'dueDate must be within 365 days of now',
      })
    } else {
      normalizedDueDate = dueDate
    }
  }

  const description = input.description
  let normalizedDescription: string | undefined
  if (description !== undefined) {
    if (typeof description !== 'string') {
      issues.push({
        field: 'description',
        code: 'DESCRIPTION_INVALID',
        message: 'description must be a string',
      })
    } else {
      const trimmed = description.trim()
      if (trimmed.length < 1 || trimmed.length > MAX_DESCRIPTION_LENGTH) {
        issues.push({
          field: 'description',
          code: 'DESCRIPTION_LENGTH',
          message: `description must be 1-${MAX_DESCRIPTION_LENGTH} characters after trimming`,
        })
      } else if (CONTROL_CHARACTER.test(trimmed)) {
        issues.push({
          field: 'description',
          code: 'DESCRIPTION_CONTROL_CHARS',
          message: 'description must not contain control characters',
        })
      } else {
        normalizedDescription = trimmed
      }
    }
  }

  const recipient = input.recipient
  let normalizedRecipient: string | null = null
  if (typeof recipient !== 'string' || recipient.trim().length === 0) {
    issues.push({
      field: 'recipient',
      code: 'RECIPIENT_REQUIRED',
      message: 'recipient is required',
    })
  } else {
    const candidate = recipient.trim()
    const isStellarKey = STELLAR_PUBLIC_KEY.test(candidate)
    const isEmail = candidate.length <= MAX_EMAIL_LENGTH && EMAIL.test(candidate)
    if (!isStellarKey && !isEmail) {
      issues.push({
        field: 'recipient',
        code: 'RECIPIENT_INVALID',
        message: 'recipient must be a Stellar public key or an email address',
      })
    } else {
      normalizedRecipient = candidate
    }
  }

  if (issues.length > 0) return { ok: false, issues }

  return {
    ok: true,
    value: {
      amount: normalizedAmount as number,
      currency: normalizedCurrency as BillCurrency,
      dueDate: normalizedDueDate as string,
      ...(normalizedDescription !== undefined ? { description: normalizedDescription } : {}),
      recipient: normalizedRecipient as string,
    },
  }
}

// ---------------------------------------------------------------------------
// Persistence seam + idempotency ledger
// ---------------------------------------------------------------------------

type BillPersister = (bill: BillRecord) => Promise<void>

/**
 * Service boundary.  The production default POSTs the bill to
 * `MERIDIAN_BILLS_ENDPOINT` and throws on a non-2xx response; when the env var
 * is unset it is a no-op so preview/test deployments work without a database.
 * A real deployment wires the endpoint; tests swap the implementation with
 * `__setBillPersisterForTests`.
 */
export async function persistBill(bill: BillRecord): Promise<void> {
  const endpoint = process.env.MERIDIAN_BILLS_ENDPOINT
  if (!endpoint) return

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PERSIST_TIMEOUT_MS)
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(bill),
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`Bills endpoint responded with status ${response.status}`)
    }
  } finally {
    clearTimeout(timer)
  }
}

let persister: BillPersister = persistBill

/** Test-only seam for the persistence boundary. */
export function __setBillPersisterForTests(next: BillPersister | null): void {
  persister = next ?? persistBill
}

/**
 * Canonical JSON serialization: sorts object keys deterministically.
 */
export function canonicalJSON(val: unknown): string {
  if (val === null || typeof val !== 'object') {
    return JSON.stringify(val)
  }
  if (Array.isArray(val)) {
    return '[' + val.map(canonicalJSON).join(',') + ']'
  }
  const keys = Object.keys(val as Record<string, unknown>).sort()
  const entries = keys.map(
    (k) => JSON.stringify(k) + ':' + canonicalJSON((val as Record<string, unknown>)[k]),
  )
  return '{' + entries.join(',') + '}'
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

export interface IdempotencyEntry {
  fingerprint: string
  task: Promise<Record<string, unknown>>
  settledAt?: number
}

/**
 * Process-local idempotency ledger.
 *
 * Scoped per-principal via sha256(principal + '\n' + key) and fingerprinted
 * against canonicalJSON(validatedBody) to eliminate cross-tenant data leaks
 * and reject mismatched body replays with 409.
 */
const idempotencyLedger = new Map<string, IdempotencyEntry>()

export function __resetBillIdempotencyLedger(): void {
  idempotencyLedger.clear()
}

export function __getBillIdempotencyLedgerSize(): number {
  return idempotencyLedger.size
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

const BASE_HEADERS = {
  'Cache-Control': 'no-store, private',
  'X-Content-Type-Options': 'nosniff',
} as const

function jsonResponse(payload: unknown, status: number): NextResponse {
  return NextResponse.json(payload, { status, headers: { ...BASE_HEADERS } })
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function postHandler(req: NextRequest): Promise<NextResponse> {
  try {
    // Authorization is evaluated before any body handling: an unauthenticated
    // caller must never learn whether its payload would have been accepted.
    const token = req.cookies.get('auth_token')?.value ?? ''
    const session = resolvePrincipal(token)
    if (!session.isValid || !session.principal) {
      return jsonResponse({ error: 'No active session', reason: 'NO_ACTIVE_SESSION' }, 401)
    }
    const principal = session.principal

    const rawKey = req.headers.get('idempotency-key')
    let idempotencyKey: string | null = null
    if (rawKey !== null) {
      if (!IDEMPOTENCY_KEY_REGEX.test(rawKey)) {
        return jsonResponse(
          { error: 'Invalid Idempotency-Key header', reason: 'INVALID_IDEMPOTENCY_KEY' },
          400,
        )
      }
      idempotencyKey = rawKey
    }

    let rawBody: unknown
    try {
      rawBody = await req.json()
    } catch {
      return jsonResponse({ error: 'Request body must be valid JSON', reason: 'INVALID_JSON' }, 400)
    }

    if (!isPlainObject(rawBody)) {
      return jsonResponse(
        { error: 'Request body must be a JSON object', reason: 'INVALID_BODY' },
        400,
      )
    }

    const validation = validateBillRequest(rawBody, Date.now())
    if (!validation.ok) {
      return jsonResponse({ error: 'Invalid bill request', issues: validation.issues }, 400)
    }

    let ledgerKey: string | null = null
    let bodyFingerprint: string | null = null

    if (idempotencyKey) {
      ledgerKey = sha256(`${principal}\n${idempotencyKey}`)
      bodyFingerprint = sha256(canonicalJSON(validation.value))

      const existing = idempotencyLedger.get(ledgerKey)
      if (existing) {
        if (
          existing.settledAt !== undefined &&
          Date.now() - existing.settledAt > IDEMPOTENCY_TTL_MS
        ) {
          idempotencyLedger.delete(ledgerKey)
        } else if (existing.fingerprint !== bodyFingerprint) {
          return jsonResponse(
            {
              error: 'Idempotency key reused with different request payload',
              reason: 'IDEMPOTENCY_KEY_REUSED',
            },
            409,
          )
        } else {
          try {
            const stored = await existing.task
            return jsonResponse({ ...stored, replayed: true }, 200)
          } catch {
            return jsonResponse(
              { error: 'Failed to persist bill', reason: 'PERSIST_FAILED' },
              502,
            )
          }
        }
      }
    }

    // SECURITY INVARIANT: the bill always belongs to the authenticated
    // principal.  Any `userId` supplied in the body was dropped by
    // validateBillRequest and never reaches this record.
    const record: BillRecord = {
      ...validation.value,
      userId: principal,
      id: randomUUID(),
      createdAt: new Date().toISOString(),
    }

    if (!idempotencyKey || !ledgerKey || !bodyFingerprint) {
      try {
        await persister(record)
        return jsonResponse({ bill: record, replayed: false }, 201)
      } catch (err) {
        console.error('[api/bills]', err)
        return jsonResponse({ error: 'Failed to persist bill', reason: 'PERSIST_FAILED' }, 502)
      }
    }

    // Capacity bound: evict oldest entry if limit reached
    if (idempotencyLedger.size >= MAX_LEDGER_ENTRIES) {
      const oldestKey = idempotencyLedger.keys().next().value
      if (oldestKey !== undefined) {
        idempotencyLedger.delete(oldestKey)
      }
    }

    const task = (async (): Promise<Record<string, unknown>> => {
      await persister(record)
      return { bill: record }
    })()

    const entry: IdempotencyEntry = {
      fingerprint: bodyFingerprint,
      task,
    }
    idempotencyLedger.set(ledgerKey, entry)

    try {
      const stored = await task
      entry.settledAt = Date.now()
      return jsonResponse({ ...stored, replayed: false }, 201)
    } catch (err) {
      // Release the key so a genuine retry runs the write again rather than
      // replaying a failure; a failed write must never look like success.
      idempotencyLedger.delete(ledgerKey)
      console.error('[api/bills]', err)
      return jsonResponse({ error: 'Failed to persist bill', reason: 'PERSIST_FAILED' }, 502)
    }
  } catch (err) {
    console.error('[api/bills]', err)
    return jsonResponse({ error: 'Failed to persist bill', reason: 'PERSIST_FAILED' }, 502)
  }
}

export const POST = postHandler
