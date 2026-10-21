import { z } from 'zod'

/**
 * Auth nonce failure boundary (issue #1712).
 *
 * Deterministic, reviewable issuance + single-use consumption for
 * `GET /api/auth/nonce`. Pure core lives here so vitest (which only
 * includes `lib/**`) can cover it; the Next route in
 * `app/api/auth/nonce/route.ts` is a thin HTTP adapter that re-exports
 * `handleNonceRequest`.
 *
 * INVARIANTS (must hold under retries / partial failure / concurrency):
 *  1. Validation-first: malformed input never touches the store.
 *  2. Fail-closed auth: no resolvable principal => NO_ACTIVE_SESSION (401).
 *  3. Denied-by-default allow-list: when NONCE_ALLOWED_PRINCIPALS is set,
 *     unknown principals get PRINCIPAL_NOT_AUTHORIZED (403) with no
 *     enumeration of the list.
 *  4. Idempotent retry: same (principal, requestKey, version) replays the
 *     SAME nonce with `deduped: true` and no state mutation.
 *  5. Conflicting reuse: same requestKey with a DIFFERENT principal/version
 *     => DUPLICATE_REUSED (409), store untouched (no data loss).
 *  6. Single-use transition: pending -> consumed exactly once via
 *     `consumeNonce()`; double-consume => DUPLICATE_REUSED.
 *  7. Stale anchor: clientVersion !== serverVersion => STALE_VERSION (410),
 *     retryable — client must refetch (covers stale UI state).
 *  8. Store faults => STORE_UNAVAILABLE (503), retryable, no secret echo.
 *  9. Concurrency: Map get/set sequences are synchronous => atomic in
 *     single-process Node; no await between check and set.
 * 10. Observability without secrets: never log/return raw nonces, tokens,
 *     or allow-list contents; log truncated requestKey prefix only.
 */

export const NONCE_TTL_MS_DEFAULT = 5 * 60 * 1000
const NONCE_TTL_MIN_MS = 30_000
const NONCE_TTL_MAX_MS = 10 * 60 * 1000

/** Default max entries in the nonce store (configurable via NONCE_STORE_MAX). */
export const NONCE_STORE_MAX_DEFAULT = 50_000

export type NonceFailureCode =
  | 'INVALID_INPUT'
  | 'NO_ACTIVE_SESSION'
  | 'PRINCIPAL_NOT_AUTHORIZED'
  | 'DUPLICATE_REUSED'
  | 'STALE_VERSION'
  | 'RATE_LIMITED'
  | 'STORE_UNAVAILABLE'

/** UI state the client should render for a given failure (loading is driven by retryable). */
export type NonceUiState = 'error' | 'retry' | 'stale' | 'permission'

export function nonceFailureToUiState(code: NonceFailureCode): NonceUiState {
  switch (code) {
    case 'STALE_VERSION':
      return 'stale'
    case 'NO_ACTIVE_SESSION':
    case 'PRINCIPAL_NOT_AUTHORIZED':
      return 'permission'
    case 'STORE_UNAVAILABLE':
    case 'RATE_LIMITED':
      return 'retry'
    default:
      return 'error'
  }
}

const PrincipalSchema = z
  .string()
  .trim()
  .min(1, 'Principal is required')
  .max(320, 'Principal too long')
  .refine((s) => !/[\u0000-\u001f\u007f]/.test(s), 'Invalid principal characters')

const RequestKeySchema = z
  .string()
  .trim()
  .min(8, 'requestKey too short')
  .max(128, 'requestKey too long')
  .regex(/^[A-Za-z0-9:._-]+$/, 'Invalid requestKey characters')

/**
 * Schema for the GET /api/auth/nonce query parameters.
 * Uses `address` as the principal identifier for the sign-in bootstrap flow.
 * Also accepts `principal` for authenticated callers (merged from session).
 */
export const NonceRequestSchema = z
  .object({
    /** Resolved server-side principal (from auth_token) OR anonymous address for sign-in bootstrap. */
    principal: PrincipalSchema.optional(),
    /** Anonymous issuance path: wallet/email the nonce will be bound to. */
    address: PrincipalSchema.optional(),
    /** Optional client-provided request key for idempotent retry. */
    requestKey: RequestKeySchema.optional(),
    /** Optional client version for stale-version detection. */
    clientVersion: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (!v.principal && !v.address) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'principal or address is required', path: ['principal'] })
    }
  })

export type NonceRequestInput = z.infer<typeof NonceRequestSchema>

export interface NonceSuccess {
  ok: true
  nonce: string
  issuedAt: number
  expiresAt: number
  principal: string
  requestKey: string | null
  version: number
  /** True when this is an idempotent replay (safe retry), not a fresh issuance. */
  deduped: boolean
}

export interface NonceFailure {
  ok: false
  code: NonceFailureCode
  status: number
  message: string
  /** Client may retry (with backoff) without losing user data. */
  retryable: boolean
  uiState: NonceUiState
}

export type NonceResult = NonceSuccess | NonceFailure

export interface StoredNonce {
  nonce: string
  principal: string
  issuedAt: number
  expiresAt: number
  version: number
  consumed: boolean
}

export interface NonceStore {
  /** Get a stored nonce by principal. */
  get(principal: string): StoredNonce | undefined
  /** Put a stored nonce by principal. */
  put(principal: string, entry: StoredNonce): void
  /** Delete a stored nonce by principal. */
  delete(principal: string): void
  /** Get a stored nonce by requestKey (for idempotent replay). */
  getByRequestKey(requestKey: string): { principal: string; entry: StoredNonce } | undefined
  /** Put a requestKey mapping. */
  putRequestKey(requestKey: string, principal: string): void
  /** Delete a requestKey mapping. */
  deleteRequestKey(requestKey: string): void
  /** Lookup by nonce value for consume path. */
  findByNonce(nonce: string): { principal: string; entry: StoredNonce } | undefined
  /** Get current size of the store. */
  size(): number
  /** Clear all entries. */
  clear(): void
  /** Time function for lazy purge (defaults to Date.now). */
  now(): number
}

/** Truncate for logs: never emit full keys/nonces/principals. */
export function redactedKey(requestKey: string | null | undefined): string {
  if (!requestKey) return 'none'
  return `${requestKey.slice(0, 6)}…(${requestKey.length})`
}

function fail(code: NonceFailureCode, status: number, message: string, retryable: boolean): NonceFailure {
  return { ok: false, code, status, message, retryable, uiState: nonceFailureToUiState(code) }
}

export function serverNonceVersion(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.NONCE_POLICY_VERSION ?? env.EMERGENCY_TRANSFER_POLICY_VERSION
  const parsed = raw ? Number(raw) : 0
  if (!Number.isSafeInteger(parsed) || parsed < 0) return 0
  return parsed
}

export function serverNonceTtlMs(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.NONCE_TTL_MS
  const parsed = raw ? Number(raw) : NONCE_TTL_MS_DEFAULT
  if (!Number.isSafeInteger(parsed)) return NONCE_TTL_MS_DEFAULT
  return Math.min(NONCE_TTL_MAX_MS, Math.max(NONCE_TTL_MIN_MS, parsed))
}

export function serverNonceStoreMax(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.NONCE_STORE_MAX
  const parsed = raw ? Number(raw) : NONCE_STORE_MAX_DEFAULT
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return NONCE_STORE_MAX_DEFAULT
  return parsed
}

export function allowedNoncePrincipals(env: NodeJS.ProcessEnv = process.env): ReadonlySet<string> | null {
  const raw = env.NONCE_ALLOWED_PRINCIPALS ?? ''
  const list = raw
    .split(',')
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  if (list.length === 0) return null // allow-list not configured => any valid principal may request
  return new Set(list)
}

export interface NonceDeps {
  store?: NonceStore
  now?: () => number
  generateNonce?: () => string
  env?: NodeJS.ProcessEnv
  /** Optional rate-limit hook; return true to reject. Default: no throttling. */
  isRateLimited?: (principal: string) => boolean
}

function defaultGenerateNonce(): string {
  // Node 18+: crypto.getRandomValues available; avoid node:crypto import for edge compat.
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  const b64 = btoa(bin)
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function createInMemoryNonceStore(
  maxSize = NONCE_STORE_MAX_DEFAULT,
  now: () => number = Date.now,
): NonceStore {
  const byPrincipal = new Map<string, StoredNonce>()
  const byRequestKey = new Map<string, string>() // requestKey -> principal
  const byNonce = new Map<string, string>() // nonce -> principal

  // Sweep expired entries periodically
  const sweepIntervalMs = 60_000
  const sweepTimer = setInterval(() => {
    const n = now()
    for (const [principal, entry] of byPrincipal.entries()) {
      if (entry.expiresAt <= n || entry.consumed) {
        byPrincipal.delete(principal)
        byNonce.delete(entry.nonce)
        // Clean up any requestKey pointing to this principal
        for (const [rk, p] of byRequestKey.entries()) {
          if (p === principal) byRequestKey.delete(rk)
        }
      }
    }
  }, sweepIntervalMs)

  if (typeof sweepTimer.unref === 'function') {
    sweepTimer.unref()
  }

  return {
    get: (principal) => {
      const e = byPrincipal.get(principal)
      if (!e) return undefined
      // Lazy purge: remove expired or consumed entries on access
      const n = now()
      if (e.expiresAt <= n || e.consumed) {
        byPrincipal.delete(principal)
        byNonce.delete(e.nonce)
        for (const [rk, p] of byRequestKey.entries()) {
          if (p === principal) byRequestKey.delete(rk)
        }
        return undefined
      }
      return { ...e }
    },
    put: (principal, entry) => {
      // If at capacity, evict oldest entry (Map iteration order is insertion order)
      if (byPrincipal.size >= maxSize && !byPrincipal.has(principal)) {
        const oldestKey = byPrincipal.keys().next().value
        if (oldestKey !== undefined) {
          const oldEntry = byPrincipal.get(oldestKey)
          if (oldEntry) {
            byNonce.delete(oldEntry.nonce)
          }
          // Clean up requestKey mappings for the evicted principal
          for (const [rk, p] of byRequestKey.entries()) {
            if (p === oldestKey) byRequestKey.delete(rk)
          }
          byPrincipal.delete(oldestKey)
        }
      }
      byPrincipal.set(principal, { ...entry })
      byNonce.set(entry.nonce, principal)
    },
    delete: (principal) => {
      const entry = byPrincipal.get(principal)
      if (entry) {
        byNonce.delete(entry.nonce)
      }
      byPrincipal.delete(principal)
      // Clean up requestKey mappings for this principal
      for (const [rk, p] of byRequestKey.entries()) {
        if (p === principal) byRequestKey.delete(rk)
      }
    },
    getByRequestKey: (requestKey) => {
      const principal = byRequestKey.get(requestKey)
      if (!principal) return undefined
      const entry = byPrincipal.get(principal)
      if (!entry) return undefined
      return { principal, entry: { ...entry } }
    },
    putRequestKey: (requestKey, principal) => {
      byRequestKey.set(requestKey, principal)
    },
    deleteRequestKey: (requestKey) => {
      byRequestKey.delete(requestKey)
    },
    findByNonce: (nonce) => {
      const principal = byNonce.get(nonce)
      if (!principal) return undefined
      const entry = byPrincipal.get(principal)
      if (!entry) return undefined
      return { principal, entry: { ...entry } }
    },
    size: () => byPrincipal.size,
    clear: () => {
      byPrincipal.clear()
      byRequestKey.clear()
      byNonce.clear()
    },
    now,
  }
}

const __globalStores = new Map<string, NonceStore>()

/** Process-wide default store (Next dev/prod single process). Test code should inject its own store. */
export function defaultNonceStore(scope = 'default'): NonceStore {
  let s = __globalStores.get(scope)
  if (!s) {
    s = createInMemoryNonceStore()
    __globalStores.set(scope, s)
  }
  return s
}

export interface HandleNonceOptions extends NonceDeps {
  /** Session principal resolved from auth_token cookie (preferred). */
  sessionPrincipal?: string | null
}

/**
 * Deterministic entry point (also re-exported from the route module).
 *
 * Resolution order: sessionPrincipal ?? body.principal ?? body.address.
 */
export function handleNonceRequest(rawInput: unknown, opts: HandleNonceOptions = {}): NonceResult {
  const store = opts.store ?? defaultNonceStore()
  const now = opts.now ?? Date.now
  const generateNonce = opts.generateNonce ?? defaultGenerateNonce
  const env = opts.env ?? process.env

  const sessionPrincipal =
    typeof opts.sessionPrincipal === 'string' && opts.sessionPrincipal.trim().length > 0
      ? opts.sessionPrincipal.trim()
      : null

  // Merge session principal so anonymous sign-in bootstrap (address-only)
  // keeps working while authenticated calls stay bound to the session.
  const merged =
    rawInput != null && typeof rawInput === 'object' && !Array.isArray(rawInput)
      ? { ...(rawInput as Record<string, unknown>), ...(sessionPrincipal ? { principal: sessionPrincipal } : {}) }
      : (rawInput ?? {})

  const parsed = NonceRequestSchema.safeParse(merged)
  if (!parsed.success) {
    return fail('INVALID_INPUT', 400, 'Invalid nonce request.', false)
  }

  // Resolution order: sessionPrincipal (merged as principal) ?? body.principal ?? body.address
  const principal = (parsed.data.principal ?? parsed.data.address ?? '').trim()
  if (!principal) {
    return fail('NO_ACTIVE_SESSION', 401, 'No active session.', false)
  }

  const allowList = allowedNoncePrincipals(env)
  if (allowList && !allowList.has(principal)) {
    return fail('PRINCIPAL_NOT_AUTHORIZED', 403, 'Not authorized to request a nonce.', false)
  }

  if (opts.isRateLimited?.(principal)) {
    return fail('RATE_LIMITED', 429, 'Too many requests. Retry shortly.', true)
  }

  const version = serverNonceVersion(env)
  if (parsed.data.clientVersion !== undefined && parsed.data.clientVersion !== version) {
    return fail('STALE_VERSION', 410, 'Stale request version. Refresh and retry.', true)
  }

  const requestKey = parsed.data.requestKey ?? null
  const at = now()
  const ttl = serverNonceTtlMs(env)

  try {
    // Idempotent replay path — synchronous check-then-return (no await => atomic).
    if (requestKey) {
      const existingByRequestKey = store.getByRequestKey(requestKey)
      if (existingByRequestKey) {
        const { principal: existingPrincipal, entry: existing } = existingByRequestKey
        if (existing.expiresAt <= at) {
          // Expired binding: fall through and re-issue fresh below (stale recovery).
          store.deleteRequestKey(requestKey)
        } else if (existingPrincipal === principal && existing.version === version && !existing.consumed) {
          return {
            ok: true,
            nonce: existing.nonce,
            issuedAt: existing.issuedAt,
            expiresAt: existing.expiresAt,
            principal,
            requestKey,
            version,
            deduped: true,
          }
        } else if (existing.consumed) {
          return fail('DUPLICATE_REUSED', 409, 'Nonce already used.', false)
        } else {
          // Same key, different identity/version => conflicting reuse; preserve stored entry.
          return fail('DUPLICATE_REUSED', 409, 'Conflicting requestKey reuse.', false)
        }
      }
    }

    // Per-principal supersede: check if there's an existing nonce for this principal
    const existingByPrincipal = store.get(principal)
    if (existingByPrincipal && existingByPrincipal.expiresAt > at && !existingByPrincipal.consumed) {
      // Supersede the existing nonce for this principal
      // Note: we don't return the existing nonce, we issue a fresh one (per the route contract)
      // But we clean up the old entry
      store.delete(principal)
    }

    const nonce = generateNonce()
    if (typeof nonce !== 'string' || nonce.length < 16 || nonce.length > 256) {
      return fail('STORE_UNAVAILABLE', 503, 'Unable to issue nonce. Retry shortly.', true)
    }
    const entry: StoredNonce = {
      nonce,
      principal,
      issuedAt: at,
      expiresAt: at + ttl,
      version,
      consumed: false,
    }
    store.put(principal, entry)
    if (requestKey) store.putRequestKey(requestKey, principal)

    return {
      ok: true,
      nonce,
      issuedAt: entry.issuedAt,
      expiresAt: entry.expiresAt,
      principal,
      requestKey,
      version,
      deduped: false,
    }
  } catch {
    return fail('STORE_UNAVAILABLE', 503, 'Unable to issue nonce. Retry shortly.', true)
  }
}

/** Single-use transition: pending -> consumed. Deterministic for valid/duplicate/unknown/expired. */
export function consumeNonce(
  nonce: unknown,
  opts: NonceDeps = {},
): { ok: true; principal: string } | NonceFailure {
  const store = opts.store ?? defaultNonceStore()
  const now = opts.now ?? Date.now
  if (typeof nonce !== 'string' || nonce.length < 16 || nonce.length > 256) {
    return fail('INVALID_INPUT', 400, 'Invalid nonce.', false)
  }
  try {
    const found = store.findByNonce(nonce)
    if (!found) return fail('INVALID_INPUT', 400, 'Unknown nonce.', false)
    if (found.entry.consumed) return fail('DUPLICATE_REUSED', 409, 'Nonce already used.', false)
    if (found.entry.expiresAt <= now()) return fail('STALE_VERSION', 410, 'Nonce expired. Request a new one.', true)
    store.put(found.principal, { ...found.entry, consumed: true })
    return { ok: true, principal: found.entry.principal }
  } catch {
    return fail('STORE_UNAVAILABLE', 503, 'Unable to verify nonce. Retry shortly.', true)
  }
}

// Test-only seams for the route tests
export function __resetNonceStore(): void {
  defaultNonceStore().clear()
}

export function peekLiveNonce(address: string): { nonce: string; expiresAt: number } | null {
  const entry = defaultNonceStore().get(address)
  if (!entry) return null
  if (entry.expiresAt <= Date.now() || entry.consumed) {
    defaultNonceStore().delete(address)
    return null
  }
  return { nonce: entry.nonce, expiresAt: entry.expiresAt }
}

// Re-export validateAddressQuery for route tests
export function validateAddressQuery(value: string | null): { ok: true; address: string } | { ok: false; issues: Array<{ field: string; code: string; message: string }> } {
  const ADDRESS_LENGTH = 56
  const ADDRESS_PREFIX = 'G'
  const BASE32_ALPHABET = /^[A-Z2-7]+$/

  function issue(field: string, code: string, message: string) {
    return { field, code, message }
  }

  if (value === null || value.length === 0) {
    return {
      ok: false,
      issues: [issue('address', 'MISSING_ADDRESS', 'Query parameter "address" is required')],
    }
  }

  if (value.length !== ADDRESS_LENGTH) {
    return {
      ok: false,
      issues: [
        issue(
          'address',
          'INVALID_ADDRESS_LENGTH',
          `Address must be exactly ${ADDRESS_LENGTH} characters`,
        ),
      ],
    }
  }

  if (!value.startsWith(ADDRESS_PREFIX)) {
    return {
      ok: false,
      issues: [issue('address', 'INVALID_ADDRESS_PREFIX', 'Address must start with "G"')],
    }
  }

  if (!BASE32_ALPHABET.test(value.slice(1))) {
    return {
      ok: false,
      issues: [
        issue(
          'address',
          'INVALID_ADDRESS_CHARSET',
          'Address must use the Stellar base32 alphabet (A-Z, 2-7)',
        ),
      ],
    }
  }

  return { ok: true, address: value }
}

export type AddressQueryResult =
  | { ok: true; address: string }
  | { ok: false; issues: Array<{ field: string; code: string; message: string }> }

export type ValidationIssue = { field: string; code: string; message: string }