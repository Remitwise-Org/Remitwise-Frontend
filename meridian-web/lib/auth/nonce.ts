import { z } from 'zod'

/**
 * Auth nonce failure boundary (issue #1712).
 *
 * Deterministic, reviewable issuance + single-use consumption for
 * `POST/GET /api/auth/nonce`. Pure core lives here so vitest (which only
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

export const NonceRequestSchema = z
  .object({
    /** Resolved server-side principal (from auth_token) OR anonymous address for sign-in bootstrap. */
    principal: PrincipalSchema.optional(),
    /** Anonymous issuance path: wallet/email the nonce will be bound to. */
    address: PrincipalSchema.optional(),
    requestKey: RequestKeySchema.optional(),
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
  get(requestKey: string): StoredNonce | undefined
  put(requestKey: string, entry: StoredNonce): void
  /** Lookup by nonce value for consume path (linear scan is fine at this scale). */
  findByNonce(nonce: string): { requestKey: string; entry: StoredNonce } | undefined
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

export function createInMemoryNonceStore(): NonceStore {
  const map = new Map<string, StoredNonce>()
  return {
    get: (k) => {
      const e = map.get(k)
      return e ? { ...e } : undefined
    },
    put: (k, e) => {
      map.set(k, { ...e })
    },
    findByNonce: (nonce) => {
      for (const [requestKey, entry] of map) {
        if (entry.nonce === nonce) return { requestKey, entry: { ...entry } }
      }
      return undefined
    },
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
      const existing = store.get(requestKey)
      if (existing) {
        if (existing.expiresAt <= at) {
          // Expired binding: fall through and re-issue fresh below (stale recovery).
        } else if (existing.principal === principal && existing.version === version && !existing.consumed) {
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
    if (requestKey) store.put(requestKey, entry)

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
    store.put(found.requestKey, { ...found.entry, consumed: true })
    return { ok: true, principal: found.entry.principal }
  } catch {
    return fail('STORE_UNAVAILABLE', 503, 'Unable to verify nonce. Retry shortly.', true)
  }
}
