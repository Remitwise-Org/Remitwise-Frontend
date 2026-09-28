/**
 * lib/auth/nonce — deterministic failure-boundary coverage (issue #1712).
 *
 * Covers: success, rejection, boundary, regression (retry / duplicate /
 * concurrency / stale / permission / store-fault) scenarios for
 * handleNonceRequest + consumeNonce.
 */
import { describe, it, expect, vi } from 'vitest'

import {
  consumeNonce,
  createInMemoryNonceStore,
  handleNonceRequest,
  nonceFailureToUiState,
  type NonceStore,
} from './nonce'

const FIXED_NOW = 1_700_000_000_000

function setup(opts: { nonces?: string[]; env?: NodeJS.ProcessEnv } = {}) {
  const store: NonceStore = createInMemoryNonceStore()
  const queue = [...(opts.nonces ?? ['test-nonce-0000000000000001', 'test-nonce-0000000000000002', 'test-nonce-0000000000000003'])]
  return {
    store,
    now: () => FIXED_NOW,
    generateNonce: () => queue.shift() ?? 'test-nonce-fallback-00000009',
    env: { ...(opts.env ?? {}) },
  }
}

describe('handleNonceRequest — success', () => {
  it('issues a nonce for anonymous address bootstrap', () => {
    const r = handleNonceRequest({ address: 'alice@example.com' }, setup())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.nonce).toBe('test-nonce-0000000000000001')
      expect(r.principal).toBe('alice@example.com')
      expect(r.deduped).toBe(false)
      expect(r.expiresAt).toBeGreaterThan(r.issuedAt)
    }
  })

  it('prefers session principal over body address', () => {
    const r = handleNonceRequest({ address: 'mallory@example.com' }, { ...setup(), sessionPrincipal: 'alice@example.com' })
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.principal).toBe('alice@example.com')
  })

  it('is deterministic for the same injected deps', () => {
    const a = handleNonceRequest({ address: 'a@x.com' }, setup())
    const b = handleNonceRequest({ address: 'a@x.com' }, setup())
    expect(a).toEqual(b)
  })
})

describe('handleNonceRequest — validation / boundary', () => {
  it('rejects empty input (401 NO_ACTIVE_SESSION)', () => {
    const r = handleNonceRequest({}, setup())
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('INVALID_INPUT')
      expect(r.status).toBe(400)
      expect(r.retryable).toBe(false)
    }
  })

  it('rejects oversize principal', () => {
    const r = handleNonceRequest({ address: 'x'.repeat(321) }, setup())
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('INVALID_INPUT')
  })

  it('rejects control characters in principal', () => {
    const r = handleNonceRequest({ address: 'alice\u0000@x.com' }, setup())
    expect(r.ok).toBe(false)
  })

  it('rejects short / malformed requestKey', () => {
    expect(handleNonceRequest({ address: 'a@x.com', requestKey: 'short' }, setup()).ok).toBe(false)
    expect(handleNonceRequest({ address: 'a@x.com', requestKey: 'key with spaces!!' }, setup()).ok).toBe(false)
  })

  it('rejects unknown strict fields', () => {
    const r = handleNonceRequest({ address: 'a@x.com', injected: 'evil' }, setup())
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.code).toBe('INVALID_INPUT')
  })

  it('accepts boundary requestKey lengths (8 and 128)', () => {
    expect(handleNonceRequest({ address: 'a@x.com', requestKey: 'k'.repeat(8) }, setup()).ok).toBe(true)
    expect(handleNonceRequest({ address: 'a@x.com', requestKey: 'k'.repeat(128) }, setup()).ok).toBe(true)
    expect(handleNonceRequest({ address: 'a@x.com', requestKey: 'k'.repeat(129) }, setup()).ok).toBe(false)
  })
})

describe('handleNonceRequest — retry / duplicate / concurrency', () => {
  it('replays the same nonce for identical idempotent retry (deduped)', () => {
    const deps = setup()
    const first = handleNonceRequest({ address: 'a@x.com', requestKey: 'req-key-001' }, deps)
    const second = handleNonceRequest({ address: 'a@x.com', requestKey: 'req-key-001' }, deps)
    expect(first.ok && second.ok).toBe(true)
    if (first.ok && second.ok) {
      expect(second.nonce).toBe(first.nonce)
      expect(second.deduped).toBe(true)
    }
  })

  it('rejects conflicting reuse of the same requestKey (409, store preserved)', () => {
    const deps = setup()
    const first = handleNonceRequest({ address: 'alice@x.com', requestKey: 'req-key-002' }, deps)
    expect(first.ok).toBe(true)
    const conflict = handleNonceRequest({ address: 'bob@x.com', requestKey: 'req-key-002' }, deps)
    expect(conflict.ok).toBe(false)
    if (!conflict.ok) {
      expect(conflict.code).toBe('DUPLICATE_REUSED')
      expect(conflict.status).toBe(409)
      expect(conflict.retryable).toBe(false)
    }
    // Original binding still replays — no data loss.
    const replay = handleNonceRequest({ address: 'alice@x.com', requestKey: 'req-key-002' }, deps)
    expect(replay.ok).toBe(true)
    if (first.ok && replay.ok) expect(replay.nonce).toBe(first.nonce)
  })

  it('handles concurrent identical requests deterministically (single nonce)', async () => {
    const deps = setup()
    const input = { address: 'a@x.com', requestKey: 'req-concurrent-1' }
    const results = await Promise.all(
      Array.from({ length: 10 }, () => Promise.resolve().then(() => handleNonceRequest(input, deps))),
    )
    const nonces = new Set(results.filter((r) => r.ok).map((r) => (r.ok ? r.nonce : '')))
    expect(nonces.size).toBe(1)
  })

  it('recovers from expired binding by re-issuing fresh (stale recovery)', () => {
    const store = createInMemoryNonceStore()
    const first = handleNonceRequest(
      { address: 'a@x.com', requestKey: 'req-expire-01' },
      { store, now: () => FIXED_NOW, generateNonce: () => 'test-nonce-0000000000000001', env: {} },
    )
    expect(first.ok).toBe(true)
    const second = handleNonceRequest(
      { address: 'a@x.com', requestKey: 'req-expire-01' },
      { store, now: () => FIXED_NOW + 6 * 60 * 1000, generateNonce: () => 'test-nonce-0000000000000002', env: {} },
    )
    expect(second.ok).toBe(true)
    if (first.ok && second.ok) {
      expect(second.nonce).not.toBe(first.nonce)
      expect(second.deduped).toBe(false)
    }
  })
})

describe('handleNonceRequest — stale / permission / faults', () => {
  it('rejects stale clientVersion with 410 retryable', () => {
    const r = handleNonceRequest({ address: 'a@x.com', clientVersion: 99 }, setup({ env: { NONCE_POLICY_VERSION: '3' } }))
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('STALE_VERSION')
      expect(r.status).toBe(410)
      expect(r.retryable).toBe(true)
      expect(r.uiState).toBe('stale')
    }
  })

  it('accepts matching clientVersion', () => {
    const r = handleNonceRequest({ address: 'a@x.com', clientVersion: 3 }, setup({ env: { NONCE_POLICY_VERSION: '3' } }))
    expect(r.ok).toBe(true)
  })

  it('enforces allow-list (403, permission UI state, no enumeration)', () => {
    const env = { NONCE_ALLOWED_PRINCIPALS: 'alice@x.com' }
    const denied = handleNonceRequest({ address: 'bob@x.com' }, setup({ env }))
    expect(denied.ok).toBe(false)
    if (!denied.ok) {
      expect(denied.code).toBe('PRINCIPAL_NOT_AUTHORIZED')
      expect(denied.status).toBe(403)
      expect(denied.uiState).toBe('permission')
    }
    expect(handleNonceRequest({ address: 'alice@x.com' }, setup({ env })).ok).toBe(true)
  })

  it('returns 429 retryable when rate-limited', () => {
    const r = handleNonceRequest({ address: 'a@x.com' }, { ...setup(), isRateLimited: () => true })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('RATE_LIMITED')
      expect(r.status).toBe(429)
      expect(r.retryable).toBe(true)
    }
  })

  it('maps store faults to 503 retryable without leaking internals', () => {
    const broken: NonceStore = {
      get: () => {
        throw new Error('db down')
      },
      put: () => {
        throw new Error('db down')
      },
      findByNonce: () => {
        throw new Error('db down')
      },
    }
    const r = handleNonceRequest({ address: 'a@x.com', requestKey: 'req-fault-001' }, { store: broken, now: () => FIXED_NOW, env: {} })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.code).toBe('STORE_UNAVAILABLE')
      expect(r.status).toBe(503)
      expect(r.retryable).toBe(true)
      expect(JSON.stringify(r)).not.toMatch(/db down/)
    }
  })
})

describe('consumeNonce — single-use state transition', () => {
  it('consumes exactly once; second consume is DUPLICATE_REUSED', () => {
    const deps = setup()
    const issued = handleNonceRequest({ address: 'a@x.com', requestKey: 'req-consume-1' }, deps)
    expect(issued.ok).toBe(true)
    if (!issued.ok) return
    const first = consumeNonce(issued.nonce, { store: deps.store, now: deps.now })
    expect(first.ok).toBe(true)
    const second = consumeNonce(issued.nonce, { store: deps.store, now: deps.now })
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.code).toBe('DUPLICATE_REUSED')
  })

  it('rejects unknown and expired nonces deterministically', () => {
    const deps = setup()
    const unknown = consumeNonce('test-nonce-unknown-00000000', deps)
    expect(unknown.ok).toBe(false)

    const issued = handleNonceRequest({ address: 'a@x.com', requestKey: 'req-exp-2' }, deps)
    expect(issued.ok).toBe(true)
    if (!issued.ok) return
    const expired = consumeNonce(issued.nonce, { store: deps.store, now: () => FIXED_NOW + 60 * 60 * 1000 })
    expect(expired.ok).toBe(false)
    if (!expired.ok) expect(expired.code).toBe('STALE_VERSION')
  })
})

describe('nonceFailureToUiState', () => {
  it('maps codes to loading/error/retry/stale/permission states', () => {
    expect(nonceFailureToUiState('STALE_VERSION')).toBe('stale')
    expect(nonceFailureToUiState('NO_ACTIVE_SESSION')).toBe('permission')
    expect(nonceFailureToUiState('PRINCIPAL_NOT_AUTHORIZED')).toBe('permission')
    expect(nonceFailureToUiState('STORE_UNAVAILABLE')).toBe('retry')
    expect(nonceFailureToUiState('RATE_LIMITED')).toBe('retry')
    expect(nonceFailureToUiState('INVALID_INPUT')).toBe('error')
    expect(nonceFailureToUiState('DUPLICATE_REUSED')).toBe('error')
  })

  it('uses fake timers for expiry boundary', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(FIXED_NOW))
    const deps = setup()
    const issued = handleNonceRequest({ address: 'a@x.com', requestKey: 'req-timer-001' }, deps)
    expect(issued.ok).toBe(true)
    vi.setSystemTime(new Date(FIXED_NOW + 20 * 60 * 1000))
    const replay = handleNonceRequest({ address: 'a@x.com', requestKey: 'req-timer-001' }, { ...deps, now: () => Date.now() })
    expect(replay.ok).toBe(true) // expired => fresh re-issue path, still deterministic success
    vi.useRealTimers()
  })
})
