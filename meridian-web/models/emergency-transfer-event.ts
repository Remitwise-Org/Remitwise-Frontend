/**
 * EmergencyTransferEvent
 *
 * Typed event log that records every state transition in the emergency
 * transfer flow.  Events are append-only and carry a snapshot of the
 * config that was active when the event occurred so the audit trail is
 * self-contained.
 */

import type { EmergencyTransferConfig } from './emergency-transfer-config'

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export type EmergencyTransferEventType =
  | 'REVIEW_STARTED'       // User opened the review panel
  | 'RISK_ACKNOWLEDGED'    // User ticked the risk acknowledgement checkbox
  | 'RISK_UNACKNOWLEDGED'  // User unticked the risk acknowledgement checkbox
  | 'CONFIRMATION_BOUND'   // Payload was cryptographically bound (frozen copy)
  | 'SUBMIT_ATTEMPTED'     // User clicked "Confirm transfer"
  | 'SUBMIT_SUCCEEDED'     // Provider accepted the transaction
  | 'SUBMIT_FAILED'        // Provider rejected the transaction
  | 'DUPLICATE_BLOCKED'    // Duplicate submit attempt was blocked
  | 'EXPIRED'              // Config expired before confirmation
  | 'CONFIG_CHANGED'       // Underlying config changed, review invalidated
  | 'UNAUTHORIZED'         // Policy / auth check failed
  | 'DISMISSED'            // User cancelled / closed

// ---------------------------------------------------------------------------
// Event shapes
// ---------------------------------------------------------------------------

interface BaseEvent {
  readonly eventId: string
  readonly eventType: EmergencyTransferEventType
  readonly occurredAt: number
  /** Snapshot of the config at the time of the event. */
  readonly configSnapshot: EmergencyTransferConfig
}

export interface ReviewStartedEvent extends BaseEvent {
  readonly eventType: 'REVIEW_STARTED'
}

export interface RiskAcknowledgedEvent extends BaseEvent {
  readonly eventType: 'RISK_ACKNOWLEDGED'
  /** Exact text of the acknowledgement the user confirmed. */
  readonly acknowledgedText: string
}

export interface RiskUnacknowledgedEvent extends BaseEvent {
  readonly eventType: 'RISK_UNACKNOWLEDGED'
}

export interface ConfirmationBoundEvent extends BaseEvent {
  readonly eventType: 'CONFIRMATION_BOUND'
  /**
   * A stable binding key derived from the config identity fields.
   * Sign-step must verify this key matches the config being signed.
   */
  readonly bindingKey: string
}

export interface SubmitAttemptedEvent extends BaseEvent {
  readonly eventType: 'SUBMIT_ATTEMPTED'
  readonly bindingKey: string
}

export interface SubmitSucceededEvent extends BaseEvent {
  readonly eventType: 'SUBMIT_SUCCEEDED'
  readonly txHash: string
  readonly bindingKey: string
}

export interface SubmitFailedEvent extends BaseEvent {
  readonly eventType: 'SUBMIT_FAILED'
  readonly errorCode: string
  readonly errorMessage: string
  readonly bindingKey: string
}

export interface DuplicateBlockedEvent extends BaseEvent {
  readonly eventType: 'DUPLICATE_BLOCKED'
  readonly bindingKey: string
}

export interface ExpiredEvent extends BaseEvent {
  readonly eventType: 'EXPIRED'
}

export interface ConfigChangedEvent extends BaseEvent {
  readonly eventType: 'CONFIG_CHANGED'
  /** Config that replaced the reviewed one. */
  readonly newConfig: EmergencyTransferConfig
}

export interface UnauthorizedEvent extends BaseEvent {
  readonly eventType: 'UNAUTHORIZED'
  readonly reason: string
}

export interface DismissedEvent extends BaseEvent {
  readonly eventType: 'DISMISSED'
}

// ---------------------------------------------------------------------------
// Discriminated union
// ---------------------------------------------------------------------------

export type EmergencyTransferEvent =
  | ReviewStartedEvent
  | RiskAcknowledgedEvent
  | RiskUnacknowledgedEvent
  | ConfirmationBoundEvent
  | SubmitAttemptedEvent
  | SubmitSucceededEvent
  | SubmitFailedEvent
  | DuplicateBlockedEvent
  | ExpiredEvent
  | ConfigChangedEvent
  | UnauthorizedEvent
  | DismissedEvent

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

let _seq = 0

function makeEventId(): string {
  _seq += 1
  return `et_${Date.now()}_${_seq}`
}

export function createEvent<T extends EmergencyTransferEvent>(
  partial: Omit<T, 'eventId' | 'occurredAt'>,
): T {
  return Object.freeze({
    ...partial,
    eventId: makeEventId(),
    occurredAt: Date.now(),
  }) as T
}

/**
 * Derives a stable binding key from the config identity fields.
 * The same inputs always produce the same key so the sign step can
 * independently re-derive and compare without trusting client state.
 */
export function deriveBindingKey(config: EmergencyTransferConfig): string {
  const payload = [
    config.configId,
    config.recipient,
    config.amountRaw,
    config.asset.symbol,
    config.asset.contractAddress,
    config.networkId,
    String(config.expiresAt),
  ].join('|')
  // Simple deterministic hash suitable for frontend use.
  // In production this should be a HMAC keyed on the session secret.
  let h = 0
  for (let i = 0; i < payload.length; i++) {
    h = (Math.imul(31, h) + payload.charCodeAt(i)) | 0
  }
  return `bk_${(h >>> 0).toString(16).padStart(8, '0')}`
}
