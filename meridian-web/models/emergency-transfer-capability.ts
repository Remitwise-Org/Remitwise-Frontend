/**
 * EmergencyTransferCapability
 *
 * A capability is the ONLY authority that permits an emergency transfer to
 * proceed.  It is derived by the server from verified session state plus the
 * server-side transfer policy — never from the client-supplied config.
 *
 * The client config's `authorizedBy` field is treated purely as a *claim*:
 * it tells the UI who is supposed to have approved the transfer, but it is
 * not proof.  Proof comes from resolving a capability against the server at
 * every mutation boundary (dialog open → review → confirm → submit) and
 * rejecting when the capability is missing, expired, or stale relative to
 * the revision that was in effect when the review started.
 *
 * Security invariant: a crafted config with a forged `authorizedBy` value
 * cannot reach the provider, because the client never re-derives authority
 * from the config — it re-derives it from the server-derived capability.
 */

// ---------------------------------------------------------------------------
// Capability revision (staleness / revocation)
// ---------------------------------------------------------------------------

/** Human-readable explanation an operator can log. Never rendered verbatim. */
export type CapabilityDenyReason =
  | 'NO_ACTIVE_SESSION'
  | 'PRINCIPAL_NOT_AUTHORIZED'
  | 'POLICY_NOT_ENABLED'
  | 'CAPABILITY_EXPIRED'

export type CapabilityEffect = 'granted' | 'denied' | 'expired'

// ---------------------------------------------------------------------------
// Capability shape
// ---------------------------------------------------------------------------

export interface GrantedTransferCapability {
  readonly effect: 'granted'
  /** Server-side identity that performed the authorization. */
  readonly principal: string
  /**
   * Monotonic version of the transfer policy at issue time.  Any version
   * change (role removal, policy tightening, revocation roll) invalidates
   * previously-granted capabilities — and therefore any pending
   * confirmations bound under the older version.
   */
  readonly version: number
  /** UTC epoch ms when the capability was issued server-side. */
  readonly issuedAt: number
  /** UTC epoch ms after which the capability must be re-resolved. */
  readonly expiresAt: number
}

export interface DeniedTransferCapability {
  readonly effect: 'denied'
  readonly reason: CapabilityDenyReason
}

export interface ExpiredTransferCapability {
  readonly effect: 'expired'
  readonly reason: 'CAPABILITY_EXPIRED'
}

/** Discriminated union returned by the capability server route. */
export type TransferCapability =
  | GrantedTransferCapability
  | DeniedTransferCapability
  | ExpiredTransferCapability

/** Minimum time (ms) a capability must remain valid to be trusted. */
export const MIN_CAPABILITY_TTL_MS = 5_000

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function isCapabilityGranted(c: TransferCapability): c is GrantedTransferCapability {
  return c.effect === 'granted'
}

export function isCapabilityDenied(c: TransferCapability): c is DeniedTransferCapability {
  return c.effect === 'denied'
}

export function isCapabilityExpired(c: TransferCapability): c is ExpiredTransferCapability {
  return c.effect === 'expired'
}

/**
 * Contractual validation of a raw server capability response.  Rejects:
 *  - malformed shapes (adversarial or misconfigured servers)
 *  - granted capabilities whose TTL is too short to be meaningfully checked
 *  - granted capabilities that are already past expiry
 *
 * Throws on invalid input so callers can hard-fail closed.
 */
export function assertValidCapability(raw: unknown): TransferCapability {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Invalid capability response: not an object')
  }
  const rec = raw as Record<string, unknown>

  if (rec.effect === 'denied') {
    const reason = rec.reason
    if (reason !== 'NO_ACTIVE_SESSION' &&
        reason !== 'PRINCIPAL_NOT_AUTHORIZED' &&
        reason !== 'POLICY_NOT_ENABLED' &&
        reason !== 'CAPABILITY_EXPIRED') {
      throw new Error('Invalid capability response: unknown deny reason')
    }
    return Object.freeze({ effect: 'denied', reason }) as DeniedTransferCapability
  }

  if (rec.effect === 'expired') {
    return Object.freeze({ effect: 'expired', reason: 'CAPABILITY_EXPIRED' }) as ExpiredTransferCapability
  }

  if (rec.effect === 'granted') {
    const principal = rec.principal
    const version = rec.version
    const issuedAt = rec.issuedAt
    const expiresAt = rec.expiresAt
    if (typeof principal !== 'string' || principal.length === 0) {
      throw new Error('Invalid capability response: missing principal')
    }
    if (typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0) {
      throw new Error('Invalid capability response: bad version')
    }
    if (typeof issuedAt !== 'number' || typeof expiresAt !== 'number') {
      throw new Error('Invalid capability response: bad timestamps')
    }
    if (expiresAt - issuedAt < MIN_CAPABILITY_TTL_MS) {
      throw new Error(
        `Invalid capability response: TTL below ${MIN_CAPABILITY_TTL_MS}ms`,
      )
    }
    return Object.freeze({
      effect: 'granted',
      principal,
      version,
      issuedAt,
      expiresAt,
    }) as GrantedTransferCapability
  }

  throw new Error('Invalid capability response: unknown effect')
}

/**
 * True when the capability is granted and still fresh at `now`.
 * Used by the mutation gates before dispatch.
 */
export function isCapabilityUsable(
  capability: TransferCapability,
  now: number,
): capability is GrantedTransferCapability {
  return (
    isCapabilityGranted(capability) &&
    capability.issuedAt <= now &&
    now < capability.expiresAt
  )
}