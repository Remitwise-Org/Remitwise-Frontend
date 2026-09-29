import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/cache/invalidate
 *
 * Fail-closed server boundary for targeted cache invalidation.
 *
 *   1. The caller is authenticated from the `auth_token` cookie (same contract
 *      as `app/api/transfer-capability/route.ts`) and must be present in the
 *      server-side `CACHE_INVALIDATION_ALLOWED_PRINCIPALS` allow-list.  An
 *      empty allow-list denies everyone.  The token is never echoed.
 *   2. The request body is validated by `validateRequestBody`, a pure function
 *      that never performs I/O and never throws.  Every rejection is reported
 *      as a machine-readable `{ field, code, message }` issue.
 *   3. The purge is executed through an injectable seam (`runCachePurge` by
 *      default) so the failure boundary can be exercised deterministically.
 *
 * Invariants:
 *   - A purge is only reported as successful when it reports zero failures; a
 *     throw or a partial failure is always a 502 and never a 200.
 *   - The idempotency ledger only records a key after a fully successful
 *     purge, so a client retry after a failure genuinely re-runs the purge.
 *
 * SECURITY: no request body, header or token value is reflected back to the
 * caller, and unknown body/header keys never reach the response.
 */

export const runtime = 'nodejs'

export interface ValidationIssue {
  field: string
  code: string
  message: string
}

/** Normalised, fully validated invalidation request. */
export interface CacheInvalidateRequest {
  tags: string[]
  paths: string[]
  keys: string[]
  reason?: string
}

export type ValidateRequestBodyResult =
  | { ok: true; value: CacheInvalidateRequest }
  | { ok: false; issues: ValidationIssue[] }

const MAX_ENTRIES_PER_ARRAY = 50
const MAX_TOTAL_SELECTORS = 100
const MAX_TAG_LENGTH = 64
const MAX_PATH_LENGTH = 256
const MAX_KEY_LENGTH = 128
const MAX_REASON_LENGTH = 200
const MAX_IDEMPOTENCY_KEY_LENGTH = 128
const PURGE_TIMEOUT_MS = 5_000

const TAG_PATTERN = /^[A-Za-z0-9:_-]+$/
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/
const SELECTOR_FIELDS = ['tags', 'paths', 'keys'] as const
type SelectorField = (typeof SELECTOR_FIELDS)[number]
const ALLOWED_BODY_KEYS: readonly string[] = ['tags', 'paths', 'keys', 'reason']

const NO_STORE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

function issue(field: string, code: string, message: string): ValidationIssue {
  return { field, code, message }
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function validateTag(entry: string): ValidationIssue | null {
  if (entry.length < 1 || entry.length > MAX_TAG_LENGTH) {
    return issue('tags', 'INVALID_TAG', `Tag must be 1..${MAX_TAG_LENGTH} characters`)
  }
  if (!TAG_PATTERN.test(entry)) {
    return issue('tags', 'INVALID_TAG', 'Tag contains characters outside [A-Za-z0-9:_-]')
  }
  return null
}

function validatePath(entry: string): ValidationIssue | null {
  if (entry.length < 1 || entry.length > MAX_PATH_LENGTH) {
    return issue('paths', 'INVALID_PATH', `Path must be 1..${MAX_PATH_LENGTH} characters`)
  }
  if (!entry.startsWith('/')) {
    return issue('paths', 'INVALID_PATH', 'Path must start with "/"')
  }
  if (
    entry.includes('..') ||
    entry.includes('//') ||
    entry.includes('\\') ||
    entry.includes('?') ||
    entry.includes('#')
  ) {
    return issue('paths', 'INVALID_PATH', 'Path contains a disallowed sequence')
  }
  if (CONTROL_CHARS.test(entry)) {
    return issue('paths', 'INVALID_PATH', 'Path must not contain control characters')
  }
  return null
}

function validateKey(entry: string): ValidationIssue | null {
  if (entry.length < 1 || entry.length > MAX_KEY_LENGTH) {
    return issue('keys', 'INVALID_KEY', `Key must be 1..${MAX_KEY_LENGTH} characters`)
  }
  if (CONTROL_CHARS.test(entry)) {
    return issue('keys', 'INVALID_KEY', 'Key must not contain control characters')
  }
  return null
}

/**
 * Pure validator for the invalidation body.  Never throws, never performs I/O.
 *
 * Shape: `{ tags?, paths?, keys?, reason? }` where each selector field, when
 * present, is an array of strings.  At least one array must be non-empty.  Any
 * unknown top-level key, non-array selector, non-string entry or duplicate
 * entry inside a single array is a rejection.
 */
export function validateRequestBody(input: unknown): ValidateRequestBodyResult {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return {
      ok: false,
      issues: [issue('body', 'INVALID_BODY', 'Request body must be a JSON object')],
    }
  }

  const body = input as Record<string, unknown>
  const issues: ValidationIssue[] = []

  for (const key of Object.keys(body)) {
    if (!ALLOWED_BODY_KEYS.includes(key)) {
      issues.push(issue('body', 'UNKNOWN_FIELD', 'Request body contains an unknown field'))
    }
  }

  const collected: Record<SelectorField, string[]> = { tags: [], paths: [], keys: [] }
  let total = 0
  let nonEmptyArrays = 0

  for (const field of SELECTOR_FIELDS) {
    const raw = body[field]
    if (raw === undefined) continue

    if (!Array.isArray(raw)) {
      issues.push(issue(field, 'INVALID_TYPE', `"${field}" must be an array of strings`))
      continue
    }

    if (raw.length > MAX_ENTRIES_PER_ARRAY) {
      issues.push(
        issue(
          field,
          'TOO_MANY_SELECTORS',
          `"${field}" must contain at most ${MAX_ENTRIES_PER_ARRAY} entries`,
        ),
      )
    }
    if (raw.length > 0) nonEmptyArrays += 1
    total += raw.length

    const seen = new Set<string>()
    for (const entry of raw) {
      if (!isString(entry)) {
        issues.push(issue(field, 'INVALID_TYPE', `Every "${field}" entry must be a string`))
        continue
      }
      if (seen.has(entry)) {
        issues.push(
          issue(field, 'DUPLICATE_SELECTOR', `"${field}" must not contain duplicate entries`),
        )
        continue
      }
      seen.add(entry)

      const problem =
        field === 'tags'
          ? validateTag(entry)
          : field === 'paths'
            ? validatePath(entry)
            : validateKey(entry)
      if (problem) {
        issues.push(problem)
      } else {
        collected[field].push(entry)
      }
    }
  }

  if (total > MAX_TOTAL_SELECTORS) {
    issues.push(
      issue(
        'body',
        'TOO_MANY_SELECTORS',
        `At most ${MAX_TOTAL_SELECTORS} selectors are allowed across tags, paths and keys`,
      ),
    )
  }

  if (nonEmptyArrays === 0) {
    issues.push(
      issue(
        'body',
        'NO_SELECTORS',
        'At least one of "tags", "paths" or "keys" must contain at least one entry',
      ),
    )
  }

  if (body.reason !== undefined) {
    if (!isString(body.reason)) {
      issues.push(issue('reason', 'INVALID_REASON', '"reason" must be a string'))
    } else if (body.reason.length < 1 || body.reason.length > MAX_REASON_LENGTH) {
      issues.push(
        issue('reason', 'INVALID_REASON', `"reason" must be 1..${MAX_REASON_LENGTH} characters`),
      )
    }
  }

  if (issues.length > 0) return { ok: false, issues }

  const value: CacheInvalidateRequest = {
    tags: collected.tags,
    paths: collected.paths,
    keys: collected.keys,
  }
  if (isString(body.reason)) value.reason = body.reason

  return { ok: true, value }
}

/** Flattens the validated request into the ordered list of selectors to purge. */
export function collectSelectors(selectors: CacheInvalidateRequest): string[] {
  return [...selectors.tags, ...selectors.paths, ...selectors.keys]
}

export interface CachePurgeOutcome {
  purged: string[]
  failed: string[]
}

export type CachePurger = (selectors: CacheInvalidateRequest) => Promise<CachePurgeOutcome>

/**
 * Default purge implementation.
 *
 * With `MERIDIAN_CACHE_PURGE_URL` unset this is an in-process passthrough that
 * reports every selector as purged (useful for local/dev and tests).  When the
 * variable is set it POSTs the selectors to that endpoint and throws on a
 * non-2xx response, so a transport failure can never be mistaken for success.
 */
export async function runCachePurge(selectors: CacheInvalidateRequest): Promise<CachePurgeOutcome> {
  const url = process.env.MERIDIAN_CACHE_PURGE_URL
  const all = collectSelectors(selectors)
  if (!url) return { purged: all, failed: [] }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), PURGE_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ tags: selectors.tags, paths: selectors.paths, keys: selectors.keys }),
      cache: 'no-store',
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Cache purge upstream responded with status ${response.status}`)
    }

    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }
    const record =
      payload !== null && typeof payload === 'object' && !Array.isArray(payload)
        ? (payload as Record<string, unknown>)
        : {}

    return {
      purged: Array.isArray(record.purged) ? record.purged.filter(isString) : all,
      failed: Array.isArray(record.failed) ? record.failed.filter(isString) : [],
    }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Process-local idempotency ledger.
 *
 * This only deduplicates retries that land on the SAME process instance.  A
 * multi-instance deployment (or a serverless/edge runtime with more than one
 * worker) needs a shared store; this ledger deliberately stays small and
 * dependency-free for the single-instance case.
 */
interface LedgerEntry {
  purged: string[]
}

const ledger = new Map<string, LedgerEntry>()

let activePurger: CachePurger = runCachePurge

/**
 * Test-only seam: inject a deterministic purge implementation, or pass `null`
 * to restore the default `runCachePurge`.
 */
export function __setCachePurgeForTests(purger: CachePurger | null): void {
  activePurger = purger ?? runCachePurge
}

/** Test-only seam: clears the idempotency ledger and any injected purger. */
export function __resetCacheInvalidationLedger(): void {
  ledger.clear()
  activePurger = runCachePurge
}

interface PrincipalSession {
  principal: string | null
  isValid: boolean
}

/**
 * Resolves the session principal from the `auth_token` cookie.  Mirrors the
 * contract of `app/api/transfer-capability/route.ts`: a JWT-style token is
 * decoded only for its `sub` claim, a plain principal is accepted as-is, and
 * anything else fails closed.  No token data is ever returned to the caller.
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

  if (token.length > 0 && token.length <= 320) {
    return { principal: token, isValid: true }
  }

  return { principal: null, isValid: false }
}

/** Principal allow-list from server-side policy.  Empty means deny-all. */
function allowedPrincipals(): ReadonlySet<string> {
  const raw = process.env.CACHE_INVALIDATION_ALLOWED_PRINCIPALS ?? ''
  return new Set(
    raw
      .split(',')
      .map((principal) => principal.trim())
      .filter((principal) => principal.length > 0),
  )
}

function respond(status: number, payload: unknown): NextResponse {
  return NextResponse.json(payload, { status, headers: NO_STORE_HEADERS })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.cookies.get('auth_token')?.value ?? ''
  const session = resolvePrincipal(token)

  if (!session.isValid || !session.principal) {
    return respond(401, { error: 'Unauthorized', reason: 'NO_ACTIVE_SESSION' })
  }

  if (!allowedPrincipals().has(session.principal)) {
    return respond(403, { error: 'Forbidden', reason: 'PRINCIPAL_NOT_AUTHORIZED' })
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return respond(400, {
      error: 'Invalid JSON body',
      issues: [issue('body', 'INVALID_JSON', 'Request body must be valid JSON')],
    })
  }

  const parsed = validateRequestBody(raw)
  if (!parsed.ok) {
    return respond(400, { error: 'Invalid request body', issues: parsed.issues })
  }

  const rawKey = req.headers.get('idempotency-key')
  const idempotencyKey = rawKey && rawKey.length > 0 ? rawKey : null
  if (idempotencyKey && idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    return respond(400, {
      error: 'Invalid request body',
      issues: [
        issue(
          'Idempotency-Key',
          'INVALID_IDEMPOTENCY_KEY',
          `Idempotency-Key must be 1..${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
        ),
      ],
    })
  }

  if (idempotencyKey) {
    const previous = ledger.get(idempotencyKey)
    if (previous) {
      return respond(200, { invalidated: previous.purged, failed: [], replayed: true })
    }
  }

  const selectors = collectSelectors(parsed.value)

  let outcome: CachePurgeOutcome
  try {
    outcome = await activePurger(parsed.value)
  } catch (err) {
    // Unexpected transport/implementation failure — logged once, never echoed.
    console.error('[cache/invalidate]', err)
    return respond(502, {
      error: 'Cache invalidation failed',
      reason: 'PURGE_FAILED',
      failed: selectors,
    })
  }

  // A partial failure is never reported as success, and the key is NOT recorded
  // so that a retry with the same key genuinely re-executes the purge.
  if (outcome.failed.length > 0) {
    return respond(502, {
      error: 'Cache invalidation failed',
      reason: 'PURGE_FAILED',
      failed: outcome.failed,
    })
  }

  if (idempotencyKey) ledger.set(idempotencyKey, { purged: outcome.purged })

  return respond(200, { invalidated: outcome.purged, failed: [], replayed: false })
}
